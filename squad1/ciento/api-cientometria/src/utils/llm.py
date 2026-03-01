import os
import json
import base64
import io
import logging
import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pypdf import PdfReader
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# --- CONFIGURAÇÃO ---
LOG_FILE = "llm.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

# ========== CONFIGURAÇÃO DE CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sb100cientometria.optin.com.br",  # Domínio de produção
        "http://localhost:5173",                 # Vite dev server local
        "http://127.0.0.1:5173",                 # Alternativa local
        "http://localhost:8000",                 # Para testes diretos no backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ===========================================

# Variáveis de Ambiente
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "BaseCurador"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
# Alterado para Gemma 3 1B para o teste local
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3:1b")

# Cliente local (Ollama)
client_llm = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
    timeout=300.0, # Aumentado timeout para CPU
)

client_qdrant = None
encoder = None

if QDRANT_URL and QDRANT_API_KEY:
    try:
        client_qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        encoder = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        logger.error(f"Erro ao iniciar Qdrant/Encoder: {e}")

class PDFPayload(BaseModel):
    encoded_content: str
    content_type: str # 'pdf' or 'text'
    headers: List[str]
    category: Optional[str] = None

# --- FUNÇÕES AUXILIARES ---

def clean_text_for_llm(text: str) -> str:
    """Limpa ruídos de PDF e normaliza o texto para o LLM."""
    if not text:
        return ""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'(Page \d+ of \d+|Página \d+ de \d+)', '', text, flags=re.IGNORECASE)
    return text.strip()

def get_document_text(encoded_content: str, content_type: str) -> str:
    """Extrai texto de conteúdo base64, seja PDF ou texto puro."""
    try:
        if content_type == 'text':
            decoded_text = base64.b64decode(encoded_content).decode('utf-8')
            return clean_text_for_llm(decoded_text)
        elif content_type == 'pdf':
            if "," in encoded_content:
                encoded_content = encoded_content.split(",")[1]

            pdf_data = base64.b64decode(encoded_content)
            pdf_file = io.BytesIO(pdf_data)
            reader = PdfReader(pdf_file)

            raw_text = ""
            # Reduzido para 5 páginas para não sobrecarregar a CPU
            max_pages = min(len(reader.pages), 5)

            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    raw_text += page_text + "\n"

            return clean_text_for_llm(raw_text)
        else:
            raise ValueError(f"Tipo de conteúdo desconhecido: {content_type}")
    except Exception as e:
        logger.error(f"Erro na extração de texto: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler conteúdo: {str(e)}")

def search_similar_docs(text_query: str, limit: int = 3) -> str:
    """Busca fatos científicos existentes para verificar contradições."""
    if not client_qdrant or not encoder:
        return "Nenhum contexto prévio disponível."
    
    try:
        query_vector = encoder.encode(text_query[:1000]).tolist()
        
        # Tentativa de usar a API mais nova query_points, com fallback para search
        try:
            hits = client_qdrant.query_points(
                collection_name=QDRANT_COLLECTION,
                query=query_vector,
                limit=limit
            ).points
        except AttributeError:
            hits = client_qdrant.search(
                collection_name=QDRANT_COLLECTION,
                query_vector=query_vector,
                limit=limit
            )
        
        context = ""
        for hit in hits:
            snippet = hit.payload.get("text", "")[:500]
            context += f"- {snippet}\n"
        return context if context else "Nenhum contexto prévio relevante encontrado."
    except Exception as e:
        logger.error(f"Erro na busca Qdrant: {e}")
        return "Erro ao acessar o banco de conhecimento."

def clean_json_string(json_str: str) -> str:
    """Remove blocos de markdown ```json ... ```."""
    json_str = json_str.strip()
    if json_str.startswith("```"):
        lines = json_str.split('\n')
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        json_str = "\n".join(lines)
    return json_str.strip()

# --- ENDPOINT PRINCIPAL ---

@app.post("/curadoria")
async def curar_documento(payload: PDFPayload):
    # 1. Extração de Texto
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    # 2. Guardrail: Texto Vazio ou Insuficiente
    if len(document_text) < 150:
        if not ("APROVAÇÃO CURADOR (marcar)" in payload.headers or "FEEDBACK DO CURADOR (escrever)" in payload.headers):
            raise HTTPException(status_code=400, detail="Texto insuficiente para análise.")
        else:
             return {"APROVAÇÃO CURADOR (marcar)": False, "FEEDBACK DO CURADOR (escrever)": "Rejeitado: Texto insuficiente para análise científica."}

    # 3. RAG: Busca de Contexto
    referencia_rag = search_similar_docs(document_text[:1000])
    contexto_ref = f"### EXISTING DATABASE KNOWLEDGE (For Contradiction Check):\n{referencia_rag}\n"

    # 4. Gerenciamento de Colunas e Schema
    current_headers = list(payload.headers)
    if "CATEGORIA" in current_headers:
        current_headers.remove("CATEGORIA")

    if "APROVAÇÃO CURADOR (marcar)" not in current_headers:
        current_headers.append("APROVAÇÃO CURADOR (marcar)")
    if "FEEDBACK DO CURADOR (escrever)" not in current_headers:
        current_headers.append("FEEDBACK DO CURADOR (escrever)")

    json_skeleton = {header: "" for header in current_headers}
    schema_str = json.dumps(json_skeleton, indent=2)

    # 5. Prompt Engineering (Idêntico ao anterior)
    if payload.category == "solos":
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de SOLOS.
Sua tarefa é retornar APENAS um JSON seguindo o esquema abaixo preenchido em PORTUGUÊS.

ESQUEMA:
{schema_str}
"""
    else:
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de CITROS E CANA.
Sua tarefa é retornar APENAS um JSON seguindo o esquema abaixo preenchido em PORTUGUÊS.

ESQUEMA:
{schema_str}
"""

    user_prompt = f"""
{contexto_ref if referencia_rag != "Nenhum contexto prévio disponível." else ""}

### TEXTO DO ARTIGO
'''
{document_text[:4000]}
'''

Retorne o JSON preenchido."""

    logger.info(f"--- INICIANDO CURADORIA LOCAL (Modelo: {LLM_MODEL}) ---")

    try:
        # Usa Ollama (Local)
        target_client = client_llm
        target_model = LLM_MODEL
        
        completion = target_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=target_model,
            temperature=0.1,
        )

        raw_response = completion.choices[0].message.content
        logger.info(f"Resposta Bruta Local: {raw_response}")
        
        clean_response = clean_json_string(raw_response)
        
        # Tentativa de extrair JSON se o modelo falhar em mandar puro
        if "{" not in clean_response:
             raise ValueError("LLM não retornou um JSON válido.")
        
        start_idx = clean_response.find("{")
        end_idx = clean_response.rfind("}") + 1
        json_final = clean_response[start_idx:end_idx]

        return json.loads(json_final)

    except Exception as e:
        logger.error(f"Erro na LLM Local: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    system_prompt = "Você é um classificador. Retorne apenas 'solos' ou 'citros e cana'."
    user_prompt = f"ARTIGO:\n{document_text[:2000]}\n\nCLASSIFICAÇÃO:"

    try:
        completion = client_llm.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            model=LLM_MODEL,
            temperature=0.0,
            max_tokens=20
        )
        category = completion.choices[0].message.content.strip().lower()
        
        if "solo" in category: return {"category": "solos"}
        return {"category": "citros e cana"}
    except Exception as e:
        logger.error(f"Erro na categorização local: {e}")
        return {"category": "citros e cana"} # Fallback seguro

@app.get("/")
def read_root():
    return {"status": "online", "model": LLM_MODEL, "service": "Local Ollama"}

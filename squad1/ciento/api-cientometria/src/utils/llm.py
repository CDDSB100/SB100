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
from openai import AsyncOpenAI
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

# Cliente assíncrono (Ollama/OpenAI Compatible)
client_llm = AsyncOpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
    timeout=600.0, # Timeout estendido para inferência em CPU
)

# Cache de Modelos - Singleton/Global carregado explicitamente na CPU
client_qdrant = None
encoder = None

def get_encoder():
    global encoder
    if encoder is None:
        try:
            logger.info("Carregando SentenceTransformer na CPU...")
            encoder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        except Exception as e:
            logger.error(f"Erro ao carregar SentenceTransformer: {e}")
    return encoder

if QDRANT_URL and QDRANT_API_KEY:
    try:
        client_qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        get_encoder()
    except Exception as e:
        logger.error(f"Erro ao iniciar Qdrant: {e}")

class PDFPayload(BaseModel):
    encoded_content: str
    content_type: str # 'pdf' or 'text'
    headers: List[str]
    category: Optional[str] = None

# --- FUNÇÕES AUXILIARES ---

def clean_text_for_llm(text: str) -> str:
    """Limpa ruídos de PDF e aplica truncagem rígida."""
    if not text:
        return ""
    # Remove caracteres não imprimíveis
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Normaliza espaços
    text = re.sub(r'\s+', ' ', text)
    # Remove marcadores de página comuns
    text = re.sub(r'(Page \d+ of \d+|Página \d+ de \d+)', '', text, flags=re.IGNORECASE)
    
    # Limite rígido de 6000 caracteres para evitar lentidão excessiva na CPU
    return text.strip()[:6000]

def get_document_text(encoded_content: str, content_type: str) -> str:
    """Extrai texto de conteúdo base64: 3 primeiras páginas + última página se for PDF."""
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

            num_pages = len(reader.pages)
            pages_to_extract = []
            
            # Estratégia: 3 primeiras páginas (introdução/metadados)
            for i in range(min(3, num_pages)):
                pages_to_extract.append(i)
            
            # E a última página (conclusões/referências)
            if num_pages > 3:
                pages_to_extract.append(num_pages - 1)

            raw_text = ""
            for i in sorted(list(set(pages_to_extract))):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    raw_text += page_text + "\n"

            return clean_text_for_llm(raw_text)
        else:
            raise ValueError(f"Tipo de conteúdo desconhecido: {content_type}")
    except Exception as e:
        logger.error(f"Erro na extração de texto: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler conteúdo: {str(e)}")

async def search_similar_docs(text_query: str, limit: int = 3) -> str:
    """Busca fatos científicos existentes (Assíncrono se possível)."""
    enc = get_encoder()
    if not client_qdrant or not enc:
        return "Nenhum contexto prévio disponível."
    
    try:
        # encoder.encode é CPU-bound, mas aqui rodamos no contexto do endpoint
        query_vector = enc.encode(text_query[:1000]).tolist()
        
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

def clean_llm_json(text: str) -> str:
    """Limpa a resposta da LLM usando Regex para extrair apenas o bloco JSON."""
    # Remove blocos de código markdown (```json ... ``` ou ``` ...)
    text = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
    
    # Tenta encontrar o primeiro { e o último } caso ainda haja ruído
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    return text.strip()

# --- ENDPOINT PRINCIPAL ---

@app.post("/curadoria")
async def curar_documento(payload: PDFPayload):
    # 1. Extração de Texto (Primeiras 3 + Última)
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    # 2. Guardrail: Texto Vazio ou Insuficiente
    if len(document_text) < 150:
        if not ("APROVAÇÃO CURADOR (marcar)" in payload.headers or "FEEDBACK DO CURADOR (escrever)" in payload.headers):
            raise HTTPException(status_code=400, detail="Texto insuficiente para análise.")
        else:
             return {"APROVAÇÃO CURADOR (marcar)": False, "FEEDBACK DO CURADOR (escrever)": "Rejeitado: Texto insuficiente para análise científica."}

    # 3. RAG: Busca de Contexto (Awaitable)
    referencia_rag = await search_similar_docs(document_text[:1000])
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

    # 5. Prompt Engineering
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

### TEXTO DO ARTIGO (TRUNCATED)
'''
{document_text}
'''

Retorne o JSON preenchido."""

    logger.info(f"--- INICIANDO CURADORIA LOCAL ASSÍNCRONA (Modelo: {LLM_MODEL}) ---")

    try:
        # Chamada assíncrona ao LLM
        completion = await client_llm.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=LLM_MODEL,
            temperature=0.1,
        )

        raw_response = completion.choices[0].message.content
        logger.info(f"Resposta Bruta Local: {raw_response}")
        
        # Limpeza robusta com Regex
        json_final = clean_llm_json(raw_response)
        
        try:
            return json.loads(json_final)
        except json.JSONDecodeError as je:
            logger.error(f"Falha ao decodificar JSON: {je}. Resposta limpa: {json_final}")
            raise ValueError("O modelo não retornou um formato JSON válido.")

    except Exception as e:
        logger.error(f"Erro na LLM Local: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    system_prompt = "Você é um classificador científico. Retorne apenas 'solos' ou 'citros e cana'."
    user_prompt = f"ARTIGO:\n{document_text[:2000]}\n\nCLASSIFICAÇÃO:"

    try:
        completion = await client_llm.chat.completions.create(
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
async def read_root():
    return {"status": "online", "model": LLM_MODEL, "service": "Local Ollama Async", "device": "cpu"}

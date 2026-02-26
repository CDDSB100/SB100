import os
import json
import base64
import io
import logging
import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from openai import OpenAI
from pypdf import PdfReader
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

# Variáveis de Ambiente
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "BaseCurador"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")

# Inicialização de Clientes (Lazy Loading Pattern)
client_llm = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama", # Ollama não exige chave real, mas a lib OpenAI sim
)

qdrant_client = None
encoder = None

if QDRANT_URL and QDRANT_API_KEY:
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    except Exception as e:
        logger.error(f"Erro ao iniciar Qdrant: {e}")

try:
    logger.info("Carregando encoder de embeddings...")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    logger.error(f"Erro ao carregar Encoder: {e}")

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
            max_pages = min(len(reader.pages), 10)

            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    raw_text += page_text + "\n"

            return clean_text_for_llm(raw_text)
        else:
            raise ValueError(f"Tipo de conteúdo desconhecido: {content_type}")
    except Exception as e:
        logger.error(f"Erro na extração de texto: {e}")
        logger.error(f"Detalhes do erro na extração de texto: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler conteúdo: {str(e)}")

def search_similar_docs(text_query: str, limit: int = 3) -> str:
    """Busca fatos científicos existentes para verificar contradições."""
    if not qdrant_client or not encoder or not text_query:
        return "Nenhum contexto prévio disponível."
    try:
        vector = encoder.encode(text_query[:1000]).tolist()
        hits = qdrant_client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=vector,
            limit=limit
        )

        if not hits:
            return "Nenhum documento similar encontrado para comparação."

        contextos = []
        for hit in hits:
            p = hit.payload
            info = f"Título: {p.get('titulo', 'Sem título')}. Resumo/Fatos: {p.get('resumo', p.get('conclusao', 'N/A'))}"
            contextos.append(info)

        return "\n---\n".join(contextos)
    except Exception as e:
        logger.warning(f"Erro na busca de contradições: {e}")
        return "Erro ao acessar banco de dados para verificação."

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
    # 2. Extração de Texto
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    # 3. Guardrail: Texto Vazio ou Insuficiente
    if len(document_text) < 150:
        if not ("APROVAÇÃO CURADOR (marcar)" in payload.headers or "FEEDBACK DO CURADOR (escrever)" in payload.headers):
            raise HTTPException(status_code=400, detail="Texto insuficiente para análise.")
        else:
             return {"APROVAÇÃO CURADOR (marcar)": False, "FEEDBACK DO CURADOR (escrever)": "Rejeitado: Texto insuficiente para análise científica."}

    # 4. RAG e Busca de Contradições
    referencia_rag = search_similar_docs(document_text)
    contexto_ref = f"### EXISTING DATABASE KNOWLEDGE (For Contradiction Check):\n{referencia_rag}\n"

    # 5. Gerenciamento de Colunas e Schema
    current_headers = list(payload.headers)
    if "CATEGORIA" in current_headers:
        current_headers.remove("CATEGORIA")

    if "APROVAÇÃO CURADOR (marcar)" not in current_headers:
        current_headers.append("APROVAÇÃO CURADOR (marcar)")
    if "FEEDBACK DO CURADOR (escrever)" not in current_headers:
        current_headers.append("FEEDBACK DO CURADOR (escrever)")

    json_skeleton = {header: "" for header in current_headers}
    schema_str = json.dumps(json_skeleton, indent=2)

    # 6. Prompt Engineering
    if payload.category == "BIOINSUMOS":
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de BIOINSUMOS.
Extraia os metadados e preencha o JSON abaixo.
Valores em PT-BR. Retorne APENAS o JSON.

ESQUEMA:
{schema_str}

CRITÉRIOS DE APROVAÇÃO:
1. Foco em BIOINSUMOS.
2. Formato de Artigo Científico/Tese.
3. Consistência com o banco de dados."""
    else:
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica agronômica.
Extraia os metadados e preencha o JSON abaixo.
Valores em PT-BR. Retorne APENAS o JSON.

ESQUEMA:
{schema_str}

CRITÉRIOS DE APROVAÇÃO:
1. Foco em Agronomia Prática.
2. Formato de Artigo Científico/Tese.
3. Consistência com o banco de dados."""

    user_prompt = f"""
### TAREFA
Preencha o ESQUEMA JSON com os metadados extraídos do TEXTO DE ENTRADA.

{contexto_ref if referencia_rag != "Nenhum contexto prévio disponível." else ""}

### TEXTO DE ENTRADA
'''
{document_text[:6000]}
'''

### SAÍDA
Retorne APENAS o objeto JSON preenchido."""

    logger.info(f"--- INICIANDO CURADORIA ---")
    logger.info(f"Payload Category: {payload.category}")
    logger.info(f"Prompt Enviado (parcial): {user_prompt[:500]}...")

    try:
        response = client_llm.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=LLM_MODEL,
            temperature=0.0,
            response_format={"type": "json_object"}
        )

        raw_response = response.choices[0].message.content
        logger.info(f"Resposta Bruta da LLM: {raw_response}")
        
        clean_response = clean_json_string(raw_response)
        return json.loads(clean_response)

    except Exception as e:
        logger.error(f"Erro LLM Local: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    if len(document_text) < 100:
        raise HTTPException(status_code=400, detail="Texto insuficiente para categorização.")

    system_prompt = """Classifique o artigo em UMA das categorias abaixo. Retorne APENAS o nome da categoria.
    Categorias:
    - BIOINSUMOS
    - MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE"""

    user_prompt = f"Artigo:\n{document_text[:6000]}\n\nCategoria:"

    try:
        response = client_llm.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=LLM_MODEL,
            temperature=0.0,
            max_tokens=50,
        )

        category = response.choices[0].message.content.strip()
        
        # Limpeza básica se o modelo retornar texto extra
        if "BIOINSUMOS" in category.upper():
            category = "BIOINSUMOS"
        else:
            category = "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE"

        return {"category": category}

    except Exception as e:
        logger.error(f"Erro na categorização: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao categorizar: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "online", "model": LLM_MODEL, "service": "Local Ollama"}

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
from groq import Groq
from openai import OpenAI
from pypdf import PdfReader
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# --- CONFIGURAÇÃO DE LOGS ---
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

# Variáveis de Ambiente e Qdrant Credentials
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_URL = "https://57eb89f7-8062-4156-8bd9-761b749c9d3b.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.o4SI3QmZtkdOUXK8KVRunQT1SymcxtZrkzUVCXmiZvQ"
COLLECTION_NAME = "sb100"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://172.28.181.92:11434/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")

# Inicialização de Clientes
def get_groq_client():
    key = os.getenv("GROQ_API_KEY")
    if key:
        try:
            return Groq(api_key=key)
        except Exception as e:
            logger.error(f"Erro ao iniciar Groq: {e}")
    return None

client_groq = get_groq_client()

client_qdrant = None
encoder = None

if QDRANT_URL and QDRANT_API_KEY:
    try:
        client_qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        encoder = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        logger.error(f"Erro ao iniciar Qdrant/Encoder: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PDFPayload(BaseModel):
    encoded_content: str
    content_type: str 
    headers: List[str]
    category: Optional[str] = None

# --- FUNÇÕES AUXILIARES ---

def clean_text_for_llm(text: str) -> str:
    if not text: return ""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def get_document_text(encoded_content: str, content_type: str) -> str:
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
            for i in range(min(len(reader.pages), 10)):
                page_text = reader.pages[i].extract_text()
                if page_text: raw_text += page_text + "\n"
            return clean_text_for_llm(raw_text)
        else:
            raise ValueError(f"Tipo desconhecido: {content_type}")
    except Exception as e:
        logger.error(f"Erro na extração: {e}")
        raise HTTPException(status_code=400, detail=str(e))

def search_similar_docs(text_query: str, limit: int = 3) -> str:
    if not client_qdrant or not encoder:
        return "Nenhum contexto prévio disponível."
    try:
        query_vector = encoder.encode(text_query[:1000]).tolist()
        hits = client_qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=limit
        )
        context = ""
        for hit in hits:
            snippet = hit.payload.get("text", "")[:500]
            context += f"- {snippet}\n"
        return context if context else "Nenhum contexto prévio relevante."
    except Exception as e:
        logger.error(f"Erro Qdrant: {e}")
        return "Erro ao acessar base de conhecimento."

# --- ENDPOINT PRINCIPAL ---

@app.post("/curadoria")
async def curar_documento(payload: PDFPayload):
    if not client_groq:
        raise HTTPException(status_code=503, detail="Groq não configurada.")

    document_text = get_document_text(payload.encoded_content, payload.content_type)
    if len(document_text) < 150:
         return {
             "status": "rejected", 
             "aiFeedback": {
                 "technical_summary": "Rejeitado: Texto insuficiente.",
                 "agronomic_insights": "N/A",
                 "relevance_score": 0.0
             }
         }

    referencia_rag = search_similar_docs(document_text[:1000])
    
    # CamelCase Schema Mapping
    schema = {
        "title": "Title of the work",
        "subtitle": "Subtitle of the work",
        "authors": "Author list",
        "year": "Publication year",
        "keywords": "Keywords from text",
        "abstract": "Brief summary",
        "documentType": "Type of document",
        "publisher": "Publisher name",
        "institution": "Institution name",
        "location": "Location",
        "workType": "Work type",
        "journalTitle": "Journal title",
        "journalQuartile": "Journal quartile",
        "volume": "Volume",
        "issue": "Issue",
        "pages": "Pages",
        "doi": "DOI link",
        "numbering": "Numbering",
        "qualis": "Qualis classification",
        "soilAndRegionCharacteristics": "One paragraph describing soil and region",
        "toolsAndTechniques": "List of techniques used",
        "nutrients": "List of nutrients studied",
        "nutrientSupplyStrategies": "Fertilization strategies",
        "cropGroups": "Crop groups",
        "cropsPresent": "Specific crops",
        "aiFeedback": {
            "technical_summary": "Technical summary in Portuguese",
            "agronomic_insights": "Agronomic insights in Portuguese",
            "relevance_score": 0.0
        },
        "status": "approved_ia OR rejected"
    }

    system_prompt = f"""You are a scientific curator assistant specializing in agriculture (Soil, Citrus, and Sugarcane).
Your task is to extract metadata from the provided text and return a valid JSON object matching the requested schema.

CRITERIA FOR APPROVAL (status field):
1. The paper MUST be about Soil science OR Citrus/Sugarcane cultivation.
2. It MUST be a scientific study (paper, thesis, technical report).
3. It MUST NOT contradict the provided 'Existing Database Knowledge'.

Return 'approved_ia' in status if all criteria are met, otherwise return 'rejected'.
All string values MUST be in PORTUGUESE (PT-BR).
Do not translate JSON keys.

SCHEMA:
{json.dumps(schema, indent=2)}
"""

    user_prompt = f"""
### EXISTING DATABASE KNOWLEDGE:
{referencia_rag}

### INPUT TEXT:
{document_text[:6000]}

### OUTPUT:
Return ONLY the filled JSON object."""

    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Erro Groq: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    if not client_groq:
        raise HTTPException(status_code=503, detail="Groq não configurada.")
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    system_prompt = """Classify the article into ONE category: 'solos' or 'citros e cana'.
Return ONLY the category name in lowercase."""
    
    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"ARTICLE:\n{document_text[:4000]}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=20,
        )
        category = completion.choices[0].message.content.strip().lower()
        if "solo" in category: return {"category": "solos"}
        return {"category": "citros e cana"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "online", "qdrant": "connected" if client_qdrant else "offline"}

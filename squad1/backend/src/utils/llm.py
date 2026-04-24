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
from dotenv import load_dotenv

# --- CONFIGURAÇÃO ---
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

LOG_FILE = "llm.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

app = FastAPI()

# ========== CONFIGURAÇÃO DE CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variáveis de Ambiente
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "BaseCurador"

client_groq = None
if GROQ_API_KEY:
    try:
        client_groq = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Erro ao iniciar Groq: {e}")

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
    content_type: str
    headers: List[str]
    category: Optional[str] = None
    ignore_conflict: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None


# --- FUNÇÕES AUXILIARES ---


def clean_text_for_llm(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_document_text(encoded_content: str, content_type: str) -> str:
    try:
        if content_type == "text":
            return base64.b64decode(encoded_content).decode("utf-8")
        # PDF parsing removido para poupar recursos da VM. Node.js deve enviar o texto.
        return ""
    except Exception as e:
        logger.error(f"Erro extração: {e}")
        return ""


def search_similar_docs(text_query: str, limit: int = 3) -> str:
    if not client_qdrant or not encoder:
        return "Contexto indisponível."
    try:
        vector = encoder.encode(text_query[:1000]).tolist()
        hits = client_qdrant.query_points(
            collection_name=QDRANT_COLLECTION,
            query_batch=[{"vector": vector, "limit": limit}],
        ).batch[0]
        return "\n".join([f"- {h.payload.get('text', '')[:500]}" for h in hits])
    except:
        return "Erro no banco."


# --- ENDPOINT ---


@app.post("/curadoria")
async def curar_documento(payload: PDFPayload):
    if not client_groq:
        raise HTTPException(status_code=503)
    document_text = get_document_text(payload.encoded_content, payload.content_type)
    referencia_rag = search_similar_docs(document_text[:1000])

    headers_to_extract = [
        h
        for h in payload.headers
        if h not in ["CATEGORIA", "curatorFeedback", "aiFeedback", "status"]
    ]

    if payload.category == "solos":
        contexto = "Especialista em Ciência do Solo (Pedologia, Física, Química e Biologia do Solo)."
        criterios = "1. Foco em Manejo, Fertilidade, Conservação ou Biologia do Solo. 2. Aceite Relatórios Técnicos e Experimentos Científicos Reais."
    elif payload.category == "genomica":
        contexto = (
            "Especialista em Genômica, Genética Molecular e Biotecnologia Agrícola."
        )
        criterios = "1. Foco em sequenciamento, marcadores moleculares, edição gênica (CRISPR), melhoramento genético ou transcriptômica. 2. Deve conter metodologias moleculares claras."
    else:
        contexto = "Especialista em Citricultura e Cana-de-açúcar."
        criterios = "1. Foco em produção, manejo, pragas ou fisiologia de Citros ou Cana. 2. Aceite Relatórios de Pesquisa, Teses e Artigos Científicos."

    system_prompt = f"""Você é um {contexto} sênior com alto rigor científico.
Sua missão: Extrair metadados e atuar como CURADOR CIENTÍFICO CRÍTICO.

CRITÉRIOS DE ANÁLISE:
1. {criterios}
2. Verifique contradições com o BANCO: {referencia_rag}
3. RIGOR CIENTÍFICO: Identifique se o artigo parece FICTÍCIO, gerado por IA sem base real, ou se apresenta contradições metodológicas graves.
4. METODOLOGIA: Extraia detalhes específicos sobre como o estudo foi conduzido (materiais, métodos, delineamento experimental, análise estatística).

REGRAS DE SAÍDA:
- Use APENAS JSON plano.
- No campo "APROVAÇÃO CURADOR (marcar)", retorne true APENAS se o artigo for cientificamente sólido e relevante.
- Se o artigo for FICTÍCIO ou apresentar contradições graves, defina "CONTRADICAO_DETECTADA" como true e explique em "MOTIVO_CONTRADICAO".
- No campo "FEEDBACK DO CURADOR (escrever)", explique DETALHADAMENTE a contribuição técnica.
- No campo "methodology", resuma a abordagem experimental em até 300 palavras.

CAMPOS OBRIGATÓRIOS NO JSON:
{json.dumps({h: "string" for h in headers_to_extract}, indent=2)}
Adicione também:
"category": "string (deve ser 'solos', 'genomica' ou 'citros e cana')",
"methodology": "string (resumo técnico da metodologia)",
"APROVAÇÃO CURADOR (marcar)": boolean,
"FEEDBACK DO CURADOR (escrever)": "string",
"CONTRADICAO_DETECTADA": boolean,
"MOTIVO_CONTRADICAO": "string (preencher apenas se CONTRADICAO_DETECTADA for true)",
"EVIDENCIAS_CONTRADICAO": "string (trechos da base ou conhecimento científico que refutam o artigo)"
"""

    user_prompt = f"TEXTO DO DOCUMENTO PARA ANÁLISE:\n{document_text[:7000]}"

    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        result = json.loads(completion.choices[0].message.content)
        if "category" not in result:
            result["category"] = payload.category

        # Garantir campos de contradição
        if "CONTRADICAO_DETECTADA" not in result:
            result["CONTRADICAO_DETECTADA"] = False
        if "MOTIVO_CONTRADICAO" not in result:
            result["MOTIVO_CONTRADICAO"] = ""
        if "EVIDENCIAS_CONTRADICAO" not in result:
            result["EVIDENCIAS_CONTRADICAO"] = ""

        return result
    except Exception as e:
        logger.error(f"Erro Groq: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    document_text = get_document_text(payload.encoded_content, payload.content_type)
    prompt = """Classifique o artigo em UMA destas categorias com base no conteúdo técnico:
- 'genomica': Se o foco for DNA, RNA, sequenciamento, genes, proteômica, marcadores moleculares, CRISPR ou biotecnologia molecular.
- 'solos': Se o foco for pedologia, física do solo, química do solo, fertilidade ou manejo de solo.
- 'citros e cana': Se o foco for produção, pragas, doenças ou fisiologia específica de Citros ou Cana-de-açúcar.

REGRAS:
1. Priorize 'genomica' se houver termos como "genes", "genômica", "proteômica", "molecular" ou "sequenciamento", mesmo que aplicados a plantas.
2. Se for sobre solos, use 'solos'.
3. Se não se encaixar nos acima mas for sobre agricultura/plantas, use 'citros e cana'.

Retorne APENAS a palavra da categoria (letras minúsculas).
"""
    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"TEXTO:\n{document_text[:4000]}"},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
        )
        cat = completion.choices[0].message.content.strip().lower()
        if "genomica" in cat or "genô" in cat or "gene" in cat:
            return {"category": "genomica"}
        if "solo" in cat:
            return {"category": "solos"}
        return {"category": "citros e cana"}
    except:
        return {"category": "citros e cana"}


@app.get("/")
def read_root():
    return {"status": "online"}

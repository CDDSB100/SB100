import os
import json
import base64
import io
import logging
import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from groq import Groq
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

# Variáveis de Ambiente
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "BaseCurador"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")

# Inicialização de Clientes (Lazy Loading Pattern)
client_groq = None
if GROQ_API_KEY:
    try:
        client_groq = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Erro ao iniciar Groq: {e}")

client_llm = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
    timeout=120.0,
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
        raise HTTPException(status_code=400, detail=f"Erro ao ler conteúdo: {str(e)}")

def search_similar_docs(text_query: str, limit: int = 3) -> str:
    """Busca fatos científicos existentes para verificar contradições."""
    if not client_qdrant or not encoder:
        return "Nenhum contexto prévio disponível."
    
    try:
        query_vector = encoder.encode(text_query[:1000]).tolist()
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
    # 1. Verificação de Saúde
    if not client_groq:
        raise HTTPException(status_code=503, detail="Serviço indisponível: Groq não configurada.")

    # 2. Extração de Texto
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    # 3. Guardrail: Texto Vazio ou Insuficiente
    if len(document_text) < 150:
        if not ("APROVAÇÃO CURADOR (marcar)" in payload.headers or "FEEDBACK DO CURADOR (escrever)" in payload.headers):
            raise HTTPException(status_code=400, detail="Texto insuficiente para análise.")
        else:
             return {"APROVAÇÃO CURADOR (marcar)": False, "FEEDBACK DO CURADOR (escrever)": "Rejeitado: Texto insuficiente para análise científica."}

    # 4. RAG: Busca de Contexto
    referencia_rag = search_similar_docs(document_text[:1000])
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
    if payload.category == "solos":
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de SOLOS (pedologia, física, química e biologia do solo).

Sua Tarefa Principal: Extrair todos os metadados solicitados do texto fornecido e preencher o esquema JSON.

**INSTRUÇÕES DE EXTRAÇÃO DE METADADOS (Siga para todos os campos):**
- **Subtítulo:** Extraia o subtítulo do artigo, se houver.
- **Caracteristicas do solo e região (escrever):** Descreva em um parágrafo as características do solo, clima e localização geográfica mencionadas no estudo. Se não mencionadas, deixe vazio.
- **ferramentas e técnicas (seleção):** Liste as metodologias científicas, ferramentas de laboratório ou campo. Ex: "Análise granulométrica, Espectroscopia, Difração de Raios-X, Amostragem de solo". Sempre liste pelo menos uma se aplicável.
- **nutrientes (seleção):** Liste os nutrientes, minerais ou elementos químicos foco do estudo do solo. Ex: "Nitrogênio, Fósforo, Carbono orgânico, Silício". Sempre liste pelo menos um se aplicável.
- **estratégias de fornecimento de nutrientes (seleção):** Liste o modo de correção ou fertilização do solo. Ex: "Calagem, Gessagem, Adubação de base, Incorporação de resíduos". Sempre liste pelo menos uma se aplicável.
- **grupos de culturas (seleção):** Liste os grandes grupos de culturas agrícolas investigados no solo. Sempre liste pelo menos um se aplicável.
- **culturas presentes (seleção):** Liste os nomes específicos das culturas ou plantas estudadas. Sempre liste pelo menos uma se aplicável.

**CONTEXTO DE CURADORIA (se aplicável):**
Se os campos "APROVAÇÃO CURADOR (marcar)" e "FEEDBACK DO CURADOR (escrever)" estiverem presentes no esquema,
você TAMBÉM atuará como um Curador Científico especializado em SOLOS, seguindo estes critérios:

**CRITÉRIOS DE VALIDAÇÃO (OBRIGATÓRIOS - TODOS devem ser atendidos para aprovação):**
1.  **Tópico Principal:** O FOCO PRINCIPAL do artigo deve ser o estudo do SOLO (manejo, conservação, fertilidade, física ou biologia do solo).
    -   *REJEITAR* se o foco for puramente genética vegetal ou processamento industrial sem foco no solo.
2.  **Formato:** Deve ser um artigo científico, tese ou estudo de caso detalhado com Metodologia e Resultados claros.
3.  **Consistência:** Não deve contradizer fatos do 'EXISTING DATABASE KNOWLEDGE'.

**REGRAS DE SAÍDA (Siga rigorosamente):**
1.  Sua saída completa deve ser um único objeto JSON válido.
2.  Preencha todos os campos de texto do esquema com base no conteúdo do documento. Garanta que os campos específicos (Caracteristicas do solo e região, ferramentas e técnicas, nutrientes, estratégias de fornecimento de nutrientes, grupos de culturas, culturas presentes) sejam sempre respondidos com informações relevantes, inferindo do contexto se necessário. Se um campo não puder ser encontrado ou não for aplicável, deixe vazio.
3.  Se os campos de curadoria estiverem presentes:
    -   Preencha o campo **'FEEDBACK DO CURADOR (escrever)'** com a razão explícita para sua decisão:
        -   Se aprovando: Comece com "Aprovado:" e declare a contribuição específica para a ciência do solo (ex: "Aprovado: Avalia a compactação do solo sob diferentes sistemas de plantio.").
        -   Se rejeitando: Comece com "Rejeitado:" e declare qual critério de validação falhou.
    -   Defina o campo **'APROVAÇÃO CURADOR (marcar)'** como `true` or `false`.
4.  **IDIOMA:** TODOS os valores de string no JSON devem estar em PORTUGUÊS (PT-BR). Não traduza as chaves JSON.

ESQUEMA:
{schema_str}
"""
    else:
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de CITROS E CANA (cultivo e manejo de citricultura e cana-de-açúcar).

Sua Tarefa Principal: Extrair todos os metadados solicitados do texto fornecido e preencher o esquema JSON.

**INSTRUÇÕES DE EXTRAÇÃO DE METADADOS (Siga para todos os campos):**
- **Subtítulo:** Extraia o subtítulo do artigo, se houver.
- **Caracteristicas do solo e região (escrever):** Descreva em um parágrafo as características do solo, clima e localização geográfica mencionadas no estudo de citros ou cana. Se não mencionadas, deixe vazio.
- **ferramentas e técnicas (seleção):** Liste, em formato de string separada por vírgulas, as principais ferramentas, equipamentos e metodologias científicas utilizadas. Ex: "Cromatografia gasosa, Fotossíntese líquida, RCBD, ANOVA". Sempre liste pelo menos uma se aplicável.
- **nutrientes (seleção):** Liste, em formato de string separada por vírgulas, todos os nutrientes ou compostos que são foco do estudo. Ex: "Nitrogênio, Potássio, Sacarose, Ácidos orgânicos". Sempre liste pelo menos um se aplicável.
- **estratégias de fornecimento de nutrientes (seleção):** Liste, em formato de string separada por vírgulas, as estratégias de fertilização ou manejo. Ex: "Fertirrigação, Aplicação foliar, Controle de pragas, Poda". Sempre liste pelo menos uma se aplicável.
- **grupos de culturas (seleção):** Liste "Frutíferas" para citros ou "Grandes Culturas" para cana, conforme o caso.
- **culturas presentes (seleção):** Liste os nomes específicos das culturas estudadas (ex: Laranja Hamlin, Cana-de-açúcar RB867515). Sempre liste pelo menos uma se aplicável.

**CONTEXTO DE CURADORIA (se aplicável):**
Se os campos "APROVAÇÃO CURADOR (marcar)" e "FEEDBACK DO CURADOR (escrever)" estiverem presentes no esquema,
você TAMBÉM atuará como um Curador Científico especializado em CITROS E CANA, seguindo estes critérios:

**CRITÉRIOS DE VALIDAÇÃO (OBRIGATÓRIOS - TODOS devem ser atendidos para aprovação):**
1.  **Tópico Principal:** O FOCO PRINCIPAL do artigo deve ser CITROS (laranja, limão, tangerina, etc.) ou CANA-DE-AÇÚCAR (produção, manejo, doenças, nutrição).
    -   *REJEITAR* se o tópico for outras culturas sem relação com citros ou cana.
2.  **Formato:** Deve ser um artigo científico, tese ou estudo de caso detalhado com Metodologia e Resultados claros.
3.  **Consistência:** Não deve contradizer fatos do 'EXISTING DATABASE KNOWLEDGE'.

**REGRAS DE SAÍDA (Siga rigorosamente):**
1.  Sua saída completa deve ser um único objeto JSON válido.
2.  Preencha todos os campos de texto do esquema com base no conteúdo do documento.
3.  Se os campos de curadoria estiverem presentes:
    -   Preencha o campo **'FEEDBACK DO CURADOR (escrever)'** com a razão explícita para sua decisão:
        -   Se aprovando: Comece com "Aprovado:" e depois declare brevemente a contribuição específica (ex: "Aprovado: Detalha a resposta da cana-de-açúcar à adubação nitrogenada.").
        -   Se rejeitando: Comece com "Rejeitado:" e depois declare qual critério falhou.
    -   Defina o campo **'APROVAÇÃO CURADOR (marcar)'** como `true` ou `false`.
4.  **IDIOMA:** TODOS os valores de string no JSON devem estar em PORTUGUÊS (PT-BR). Não traduza as chaves JSON.

ESQUEMA:
{schema_str}
"""

    user_prompt = f"""
### TAREFA
1. Analise o TEXTO DE ENTRADA.
2. Compare com o CONHECIMENTO EXISTENTE DO BANCO DE DADOS (se fornecido).
3. Preencha o ESQUEMA JSON ALVO com os metadados extraídos.

{contexto_ref if referencia_rag != "Nenhum contexto prévio disponível." else ""}

### TEXTO DE ENTRADA
'''
{document_text[:6000]}
'''

### SAÍDA
Retorne APENAS o objeto JSON preenchido."""

    logger.info(f"--- INICIANDO CURADORIA ---")
    logger.info(f"Payload Category: {payload.category}")

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

        raw_response = completion.choices[0].message.content
        logger.info(f"Resposta Bruta da LLM: {raw_response}")
        
        clean_response = clean_json_string(raw_response)
        return json.loads(clean_response)

    except Exception as e:
        logger.error(f"Erro Groq: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    if not client_groq:
        raise HTTPException(status_code=503, detail="Serviço indisponível: Groq não configurada.")

    document_text = get_document_text(payload.encoded_content, payload.content_type)

    if len(document_text) < 100:
        raise HTTPException(status_code=400, detail="Texto insuficiente para categorização.")

    system_prompt = """Você é um assistente especializado em classificação de artigos científicos agrícolas.

Classifique o artigo em UMA das seguintes categorias:
1. **solos** - Artigos sobre pedologia, física do solo, química do solo, biologia do solo, manejo e conservação do solo, fertilidade do solo, nutrição de plantas via solo
2. **citros e cana** - Artigos sobre cultivo, manejo, nutrição e fisiologia de citros (laranja, limão, tangerina) ou cana-de-açúcar

Instruções:
- Analise o CONTEÚDO PRINCIPAL do artigo
- Se o foco principal for SOLO, retorne "solos"
- Se o foco principal for CITROS ou CANA, retorne "citros e cana"
- Retorne APENAS o nome exato da categoria, em minúsculas

Categorias válidas:
- solos
- citros e cana"""

    user_prompt = f"ARTIGO:\n{document_text[:6000]}\n\nCLASSIFICAÇÃO:"

    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=50,
        )

        category = completion.choices[0].message.content.strip().lower()
        
        # Normalização de categorias
        if "solo" in category:
            category = "solos"
        elif "citro" in category or "cana" in category:
            category = "citros e cana"
        else:
            # Se não reconhecer, fazer inferência baseada no conteúdo
            if "solo" in document_text[:2000].lower() or "pedologia" in document_text.lower():
                category = "solos"
            else:
                category = "citros e cana"

        logger.info(f"Categorização realizada: {category}")
        return {"category": category}

    except Exception as e:
        logger.error(f"Erro na categorização: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao categorizar: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "online", "version": "v12-Contradiction-Fixed", "service": "Groq Cloud"}

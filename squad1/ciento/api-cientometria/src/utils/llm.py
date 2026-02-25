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
from groq import Groq
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

# --- CONFIGURAÇÃO ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Variáveis de Ambiente
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "BaseCurador"

if not all([GROQ_API_KEY, QDRANT_URL, QDRANT_API_KEY]):
    logger.error("CRÍTICO: Variáveis de ambiente faltando! Verifique os Secrets.")

# Inicialização de Clientes (Lazy Loading Pattern)
client_groq = None
qdrant_client = None
encoder = None

if GROQ_API_KEY:
    try:
        client_groq = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Erro ao iniciar Groq: {e}")

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
        # Add more specific logging for debugging 422 errors
        logger.error(f"Detalhes do erro na extração de texto: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler conteúdo (ver logs do servidor para mais detalhes): {str(e)}")

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
    # 1. Verificação de Saúde
    if not client_groq:
        raise HTTPException(status_code=503, detail="Serviço indisponível: Groq não configurada.")

    # 2. Extração de Texto
    document_text = get_document_text(payload.encoded_content, payload.content_type)

    # 3. Guardrail: Texto Vazio ou Insuficiente
    if len(document_text) < 150:
        # Se o texto for muito curto, e se não houver headers específicos para curadoria, retornar um erro.
        if not ("APROVAÇÃO CURADOR (marcar)" in payload.headers or "FEEDBACK DO CURADOR (escrever)" in payload.headers):
            raise HTTPException(status_code=400, detail="Texto insuficiente para análise e extração de metadados.")
        # Se houver headers de curadoria, retorne um objeto de erro que inclui esses cabeçalhos.
        else:
             return {"APROVAÇÃO CURADOR (marcar)": False, "FEEDBACK DO CURADOR (escrever)": "Rejeitado: Texto insuficiente para análise científica."}

    # 4. RAG e Busca de Contradições
    referencia_rag = search_similar_docs(document_text)
    contexto_ref = f"### EXISTING DATABASE KNOWLEDGE (For Contradiction Check):\n{referencia_rag}\n"

    # 5. Gerenciamento de Colunas e Schema
    # Use os headers fornecidos no payload para o esqueleto JSON
    current_headers = list(payload.headers)

    # Remove CATEGORIA para que não seja preenchida em curadoria
    # A categoria será determinada somente no endpoint /categorize
    if "CATEGORIA" in current_headers:
        current_headers.remove("CATEGORIA")

    # Garante que os cabeçalhos de curadoria estejam presentes, se ainda não estiverem.
    if "APROVAÇÃO CURADOR (marcar)" not in current_headers:
        current_headers.append("APROVAÇÃO CURADOR (marcar)")
    if "FEEDBACK DO CURADOR (escrever)" not in current_headers:
        current_headers.append("FEEDBACK DO CURADOR (escrever)")


    json_skeleton = {header: "" for header in current_headers}
    schema_str = json.dumps(json_skeleton, indent=2)

    # 6. Prompt Engineering (System + User)
    if payload.category == "BIOINSUMOS":
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica de BIOINSUMOS (insumos de origem biológica na agricultura).
Sua Tarefa Principal: Extrair todos os metadados solicitados do texto fornecido e preencher o esquema JSON.

**INSTRUÇÕES DE EXTRAÇÃO DE METADADOS (Siga para todos os campos):**
- **Subtítulo:** Extraia o subtítulo do artigo, se houver.
- **Caracteristicas do solo e região (escrever):** Descreva em um parágrafo as características do solo, clima e localização geográfica mencionadas no estudo. Se não mencionadas, deixe vazio.
- **ferramentas e técnicas (seleção):** Liste as metodologias científicas, ferramentas de laboratório ou campo. Ex: "PCR, Sequenciamento, Microscopia, Ensaios em vasos". Sempre liste pelo menos uma se aplicável.
- **nutrientes (seleção):** Liste os MICRO-ORGANISMOS (Gênero/Espécie) ou AGENTES BIOLÓGICOS investigados. Ex: "Bradyrhizobium japonicum, Trichoderma harzianum, Bacillus subtilis". Sempre liste pelo menos um se aplicável.
- **estratégias de fornecimento de nutrientes (seleção):** Liste o MODO DE APLICAÇÃO ou FORMULAÇÃO do bioinsumo. Ex: "Inoculação de sementes, Aplicação via sulco, Pulverização foliar, Grânulos". Sempre liste pelo menos uma se aplicável.
- **grupos de culturas (seleção):** Liste os grandes grupos de culturas agrícolas investigados. Sempre liste pelo menos um se aplicável.
- **culturas presentes (seleção):** Liste os nomes específicos das culturas ou plantas estudadas. Sempre liste pelo menos uma se aplicável.

**CONTEXTO DE CURADORIA (se aplicável):**
Se os campos "APROVAÇÃO CURADOR (marcar)" e "FEEDBACK DO CURADOR (escrever)" estiverem presentes no esquema,
você TAMBÉM atuará como um Curador Científico especializado em BIOINSUMOS, seguindo estes critérios:

**CRITÉRIOS DE VALIDAÇÃO (OBRIGATÓRIOS - TODOS devem ser atendidos para aprovação):**
1.  **Tópico Principal:** O FOCO PRINCIPAL do artigo deve ser o uso de BIOINSUMOS (inoculantes, biofertilizantes, biopesticidas, controle biológico, promotores de crescimento).
    -   *REJEITAR* se o foco for puramente fertilizantes químicos ou manejo de água sem componente biológico proeminente.
2.  **Formato:** Deve ser um artigo científico, tese ou estudo de caso detalhado com Metodologia e Resultados claros.
3.  **Consistência:** Não deve contradizer fatos do 'EXISTING DATABASE KNOWLEDGE'.

**REGRAS DE SAÍDA (Siga rigorosamente):**
1.  Sua saída completa deve ser um único objeto JSON válido.
2.  Preencha todos os campos de texto do esquema com base no conteúdo do documento. Garanta que os campos específicos (Caracteristicas do solo e região, ferramentas e técnicas, nutrientes, estratégias de fornecimento de nutrientes, grupos de culturas, culturas presentes) sejam sempre respondidos com informações relevantes, inferindo do contexto se necessário. Se um campo não puder ser encontrado ou não for aplicável, deixe vazio.
3.  Se os campos de curadoria estiverem presentes:
    -   Preencha o campo **'FEEDBACK DO CURADOR (escrever)'** com a razão explícita para sua decisão:
        -   Se aprovando: Comece com "Aprovado:" e declare a contribuição específica do bioinsumo (ex: "Aprovado: Avalia a eficácia de Bacillus no controle de fungos em soja.").
        -   Se rejeitando: Comece com "Rejeitado:" e declare qual critério de validação falhou.
    -   Defina o campo **'APROVAÇÃO CURADOR (marcar)'** como `true` ou `false`.
4.  **IDIOMA:** TODOS os valores de string no JSON devem estar em PORTUGUÊS (PT-BR). Não traduza as chaves JSON."""
    else:
        system_prompt = f"""Você é um assistente especializado em extração de metadados e curadoria científica.
Sua Tarefa Principal: Extrair todos os metadados solicitados do texto fornecido e preencher o esquema JSON.

**INSTRUÇÕES DE EXTRAÇÃO DE METADADOS (Siga para todos os campos):**
- **Subtítulo:** Extraia o subtítulo do artigo, se houver.
- **Caracteristicas do solo e região (escrever):** Descreva em um parágrafo as características do solo, clima e localização geográfica mencionadas no estudo. Se não mencionadas, deixe vazio.
- **ferramentas e técnicas (seleção):** Liste, em formato de string separada por vírgulas, as principais ferramentas, equipamentos e metodologias científicas utilizadas. Ex: "Cromatografia gasosa, Espectrometria de massa, Análise de variância (ANOVA)". Sempre liste pelo menos uma se aplicável.
- **nutrientes (seleção):** Liste, em formato de string separada por vírgulas, todos os nutrientes de plantas (macro e micro) que são foco do estudo. Ex: "Nitrogênio, Fósforo, Potássio, Boro". Sempre liste pelo menos um se aplicável.
- **estratégias de fornecimento de nutrientes (seleção):** Liste, em formato de string separada por vírgulas, as estratégias de fertilização ou fornecimento de nutrientes. Ex: "Fertilização de cobertura, Adubação foliar, Fertirrigação". Sempre liste pelo menos uma se aplicável.
- **grupos de culturas (seleção):** Liste, em formato de string separada por vírgulas, os grandes grupos de culturas agrícolas investigados. Ex: "Cereais, Leguminosas, Hortaliças, Frutíferas". Sempre liste pelo menos um se aplicável.
- **culturas presentes (seleção):** Liste, em formato de string separada por vírgulas, os nomes específicos das culturas ou plantas estudadas. Ex: "Milho (Zea mays), Soja (Glycine max), Tomate (Solanum lycopersicum)". Sempre liste pelo menos uma se aplicável.

**CONTEXTO DE CURADORIA (se aplicável):**
Se os campos "APROVAÇÃO CURADOR (marcar)" e "FEEDBACK DO CURADOR (escrever)" estiverem presentes no esquema,
você TAMBÉM atuará como um Curador Científico especializado em Agronomia, seguindo estes critérios:

**CRITÉRIOS DE VALIDAÇÃO (OBRIGATÓRIOS - TODOS devem ser atendidos para aprovação):**
1.  **Tópico Principal:** O FOCO PRINCIPAL do artigo deve ser agronomia prática (ex: CULTIVO DE CULTURAS, MANEJO DO SOLO, CONTROLE DE PRAGAS/DOENÇAS, IRRIGAÇÃO, FERTILIZAÇÃO, PLANTAÇÕES).
    -   *REJEITAR* se o tópico for biologia geral, química, ciência climática, ou se agronomia for apenas um exemplo menor.
2.  **Formato:** Deve ser um artigo científico, tese ou estudo de caso detalhado com Metodologia e Resultados claros.
    -   *REJEITAR* resumos, notícias, opiniões ou conteúdo de marketing.
3.  **Consistência:** Não deve contradizer fatos do 'EXISTING DATABASE KNOWLEDGE'.
    -   *REJEITAR* se uma contradição for encontrada.

**REGRAS DE SAÍDA (Siga rigorosamente):**
1.  Sua saída completa deve ser um único objeto JSON válido.
2.  Preencha todos os campos de texto do esquema com base no conteúdo do documento. Garanta que os campos específicos (Caracteristicas do solo e região, ferramentas e técnicas, nutrientes, estratégias de fornecimento de nutrientes, grupos de culturas, culturas presentes) sejam sempre respondidos com informações relevantes, inferindo do contexto se necessário. Se um campo não puder ser encontrado ou não for aplicável, deixe vazio.
3.  Se os campos de curadoria estiverem presentes:
    -   Preencha o campo **'FEEDBACK DO CURADOR (escrever)'** com a razão explícita para sua decisão:
        -   Se aprovando: Comece com "Aprovado:" e depois declare brevemente a contribuição agronômica específica (ex: "Aprovado: Detalha uma nova técnica de irrigação para milho.").
        -   Se rejeitando: Comece com "Rejeitado:" e depois declare CLARAMENTE QUAL critério de validação falhou (ex: "Rejeitado: O foco principal é botânica, não agronomia prática." ou "Rejeitado: Não apresenta seção de metodologia.").
        -   Se rejeitando devido a contradição: Comece com "Rejeitado (Contradição):" e explique a contradição.
    -   Com base no feedback que você acabou de escrever, defina o campo **'APROVAÇÃO CURADOR (marcar)'** como `true` ou `false` (valor booleano, **NUNCA** "N/A" ou string vazia).
4.  **IDIOMA:** TODOS os valores de string no JSON devem estar em PORTUGUÊS (PT-BR). Não traduza as chaves JSON."""


    user_prompt = f"""
### TAREFA
1. Analise o TEXTO DE ENTRADA.
2. Compare com o CONHECIMENTO EXISTENTE DO BANCO DE DADOS (se fornecido).
3. Preencha o ESQUEMA JSON ALVO com os metadados extraídos.

### ESQUEMA ALVO
{schema_str}

{contexto_ref if referencia_rag != "Nenhum contexto prévio disponível." else ""}

### TEXTO DE ENTRADA
'''
{document_text[:7000]}
'''

### SAÍDA
Retorne APENAS o objeto JSON preenchido.
"""

    # 7. Chamada à API
    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )

        raw_response = completion.choices[0].message.content
        clean_response = clean_json_string(raw_response)

        return json.loads(clean_response)

    except json.JSONDecodeError:
        logger.error(f"Erro JSON: {raw_response[:200]}")
        raise HTTPException(status_code=500, detail="Modelo gerou JSON inválido.")
    except Exception as e:
        logger.error(f"Erro Groq: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorize")
async def categorize_article(payload: PDFPayload):
    if not client_groq:
        raise HTTPException(status_code=503, detail="Serviço indisponível: Groq não configurada.")

    document_text = get_document_text(payload.encoded_content, payload.content_type)

    if len(document_text) < 100: # Minimum text for categorization
        raise HTTPException(status_code=400, detail="Texto insuficiente para categorização.")

    system_prompt = """Você é um assistente especialista em agronomia. Sua tarefa é classificar um artigo em uma das duas categorias a seguir.
    Retorne APENAS o nome da categoria.

    Categorias disponíveis:
    - BIOINSUMOS
    - MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE

    Se o artigo abordar ambos os temas, escolha a categoria que for mais proeminente no texto.
    Sempre retorne uma das duas categorias, mesmo que o artigo não se encaixe perfeitamente.
    """

    user_prompt = f"""
    Classifique o seguinte artigo em uma das categorias: BIOINSUMOS ou MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE.

    '''
    {document_text[:7000]}
    '''

    Retorne APENAS a categoria.
    """

    try:
        completion = client_groq.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=50, # Expecting a short response
        )

        category = completion.choices[0].message.content.strip()

        # Validate the category
        if category not in ["BIOINSUMOS", "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE"]:
            category = "BIOINSUMOS" # Default to BIOINSUMOS if unexpected

        return {"category": category}

    except Exception as e:
        logger.error(f"Erro na categorização: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao categorizar o artigo: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "online", "version": "v12-Contradiction-Fixed"}

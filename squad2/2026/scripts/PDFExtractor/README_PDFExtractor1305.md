# PDFExtractor1305.py — Pipeline de Ingestão Multimodal RAG

**Squad 02 — SB100 Agrônomo Virtual | Nicolas Alves Witzel da Silva**

Script principal de ingestão, vetorização e indexação de artigos científicos agrícolas para o projeto SB100. Converte PDFs em chunks vetorizados indexados no Qdrant, cobrindo texto, tabelas e figuras.

> **Segurança:** o código no repositório não contém credenciais. Todos os campos sensíveis (URLs, chaves de API, usuário e senha) foram substituídos por marcadores genéricos. Solicite os valores reais ao coordenador da equipe antes de executar.

---

## Pré-requisitos

- Conta Google com o Google Drive contendo a pasta `Pdfextractor/`
- Acesso ao Google Colab
- Credenciais do projeto: API Qdrant, API de curadoria e API Gemini

---

## Estrutura de pastas esperada no Drive

```
Pdfextractor/
├── data/
│   ├── PDFs não vetorizados/     ← PDFs de entrada (Script 1)
│   ├── PDFs concluídos/          ← movidos automaticamente após indexação
│   └── Imagens/                  ← PNGs e JSONs gerados (Scripts 2 e 3)
├── indexados.json                ← controle de PDFs já processados
└── metadados_api.json            ← cache dos metadados da curadoria
```

---

## Passo a passo de execução

### 0. Coletar os PDFs aprovados

Acesse a plataforma de curadoria do projeto, filtre os artigos com aprovação `TRUE` e rejeição `FALSE`, faça o download dos PDFs e copie-os para a pasta `PDFs não vetorizados/` no Drive. O nome do arquivo deve corresponder exatamente ao campo `URL DO DOCUMENTO` registrado na plataforma.

### 1. Abrir o Colab e montar o Drive

Abra o arquivo `PDFExtractor1305.py` no Google Colab. Execute a célula de montagem do Drive e autorize o acesso com a conta que contém a pasta `Pdfextractor/`.

### 2. Instalar as dependências

Execute a célula de instalação — necessária apenas uma vez por sessão:

```bash
pip install docling sentence-transformers transformers torch requests PyMuPDF opencv-python-headless Pillow -q
sudo apt install tesseract-ocr tesseract-ocr-por tesseract-ocr-eng tesseract-ocr-spa -y -qq
```

### 3. Preencher as credenciais

Na seção `CONFIGURAÇÕES` do script, preencha:

```python
API_BASE     = "https://sb100cientometria.optin.com.br"
API_USER     = "INSERIR_USUARIO"
API_PASSWORD = "INSERIR_SENHA"

QDRANT_URL     = "INSERIR_URL_DO_QDRANT"
QDRANT_API_KEY = "INSERIR_CHAVE_SEGURA"

GEMINI_API_KEY = "INSERIR_CHAVE_SEGURA"
```

### 4. Executar o Script 1 — Extração e vetorização de texto

Executa para cada PDF novo na pasta de entrada:

1. Busca metadados bibliográficos na API de curadoria (JWT renovável automaticamente)
2. Converte o PDF com Docling + Tesseract CLI trilíngue (PT, ES, EN)
3. Tabelas: dupla vetorização — formato Markdown + versão descritiva em linguagem natural
4. Chunking: 1024 chars, 256 overlap, preservando número de página de origem
5. Figuras: renderiza páginas via PyMuPDF (150 DPI) + filtro OpenCV de 3 camadas (cor HSV, densidade de blob, direção Sobel)
6. Salva PNGs aprovados e JSONs de contexto em `data/Imagens/`
7. Vetoriza chunks em batch com Qwen3-Embedding-0.6B (denso) + SPLADE (esparso)
8. Upsert no Qdrant via REST direto (sem qdrant-client — contorna IPv6 do Colab)
9. Move PDF para `PDFs concluídos/` e registra em `indexados.json`

PDFs já presentes em `indexados.json` são automaticamente ignorados — o script é idempotente.

### 5. Executar o Script 2 — Descrição de imagens com Gemini Vision

Processa os PNGs gerados pelo Script 1 ainda não descritos (`gemini_processado: false`):

1. Lê os JSONs de metadados da pasta `Imagens/`
2. Envia cada PNG + contexto textual (800 chars anteriores à figura) para a API Gemini
3. O prompt extrai: eixos com unidades, séries, valores numéricos, regressões, significância estatística e conclusão agronômica
4. Salva a descrição no JSON e marca `gemini_processado: true`
5. Erros 429 (rate limit) não marcam como processado — a página será retentada na próxima execução

O script pode ser interrompido e retomado a qualquer momento sem reprocessar imagens já descritas.

### 6. Executar o Script 3 — Vetorização das descrições de imagens

Indexa no Qdrant as descrições geradas pelo Script 2 ainda não vetorizadas (`qdrant_vetorizado: false`):

1. Compõe texto estruturado com tipo, eixos, séries, pontos de dados, regressão e conclusão
2. Vetoriza com Qwen3-Embedding-0.6B + SPLADE — mesmo espaço vetorial do Script 1
3. Upsert no Qdrant com `tipo: imagem` — filtrável independentemente pelo Squad 04
4. Marca `qdrant_vetorizado: true` no JSON

### 7. Verificar os resultados

- **`indexados.json`** no Drive: lista todos os PDFs processados com chunks gerados, imagens indexadas e data de ingestão
- **Painel Qdrant** (`https://sb100qdrant.optin.com.br/dashboard`): total de pontos na coleção `sb100`

---

## Modelos utilizados

| Componente | Modelo |
|---|---|
| OCR e extração | Docling + Tesseract CLI (por, eng, spa) |
| Renderização de imagens | PyMuPDF (fitz) |
| Filtro visual | OpenCV (HSV + blob density + Sobel) |
| Descrição de figuras | Gemini 3.1 Pro (API) |
| Embedding denso | Qwen3-Embedding-0.6B — 1024 dims, Cosine |
| Embedding esparso | opensearch-neural-sparse-encoding-doc-v2-distill (SPLADE) |
| Banco vetorial | Qdrant Cloud — sa-east-1, AWS São Paulo |

---

## Observação sobre infraestrutura

O pipeline roda no Google Colab porque o servidor local do projeto não possui suporte à extensão AVX, requisito obrigatório para inicialização dos modelos PyTorch. O armazenamento persistente entre sessões é feito via Google Drive.

# Testes_Boletim_100_tamanhos_variados_de_chunk.ipynb

**Squad 02 — SB100 Agrônomo Virtual | Nicolas Alves Witzel da Silva**

Notebook de experimentos sistemáticos de estratégias de chunking aplicadas ao Boletim 100 (511 páginas, IAC 2022). Popula 13 coleções Qdrant com configurações distintas para avaliação comparativa de qualidade de recuperação semântica.

> **Segurança:** o notebook no repositório não contém credenciais. Todos os campos sensíveis foram substituídos por marcadores genéricos. Solicite os valores reais ao coordenador da equipe antes de executar.

---

## Objetivo

Comparar 7 estratégias de chunking em configurações variadas de tamanho e overlap sobre um documento longo e estruturalmente complexo (recomendações agronômicas, tabelas de adubação, múltiplas culturas), identificando qual estratégia produz melhores resultados de recuperação semântica para o pipeline RAG do SB100.

---

## Documento utilizado

**Boletim 100** — Recomendações de adubação e calagem para o Estado de São Paulo (IAC, 2022).
511 páginas, português, com tabelas complexas, múltiplas culturas, referências cruzadas e seções bem definidas por cultura/nutriente.

Caminho esperado no Drive:
```
/content/drive/MyDrive/Pdfextractor/data/PDFs concluídos/
Boletim 100_15.07.2022_FINAL - Fernanda Bochi Dos Santos.pdf
```

---

## As 13 coleções geradas

| Coleção | Estratégia | Tamanho | Overlap |
|---|---|---|---|
| `sb100_boletim100_c512_o128` | Fixed char | 512 chars | 128 |
| `sb100_boletim100_c1024_o256` | Fixed char | 1024 chars | 256 |
| `sb100_boletim100_c2048_o0` | Fixed char | 2048 chars | 0 |
| `sb100_boletim100_token_c256_o128` | Fixed token | 256 tokens | 128 |
| `sb100_boletim100_semantic` | Semântico puro | — | 0 |
| `sb100_boletim100_semantic_max512_o256` | Semântico com cap | 512 chars | 256 |
| `sb100_boletim100_semantic_max1024_o256` | Semântico com cap | 1024 chars | 256 |
| `sb100_boletim100_struct_sem` | Struct+semântico puro | — | 0 |
| `sb100_boletim100_struct_sem_max1024_o256` | Struct+semântico com cap | 1024 chars | 256 |
| `sb100_boletim100_recursive_c512_o128` | Recursivo | 512 chars | 128 |
| `sb100_boletim100_recursive_c1024_o256` | Recursivo | 1024 chars | 256 |
| `sb100_boletim100_sliding_c512_o384` | Sliding window | 512 chars | 384 |
| `sb100_boletim100_proposition_o0` | Proposicional | — | 0 |

---

## Descrição das estratégias

**Fixed char** — divide o texto em blocos de tamanho fixo em caracteres, com overlap opcional. Estratégia mais simples, usada como baseline.

**Fixed token** — divide por número de tokens (usando o tokenizador SPLADE), garantindo alinhamento preciso com os limites do modelo de embedding.

**Semântico** — agrupa blocos naturais do Docling (parágrafos, itens) por coerência semântica, sem cortar no meio de um parágrafo. O `chunk_size` opcional limita o tamanho máximo antes de subdividir.

**Struct+semântico** — detecta seções pelo Docling (headings) e aplica chunking semântico dentro de cada seção, prefixando o título da seção no primeiro chunk. Com fallback automático para semântico puro quando o Docling não detecta headings.

**Recursivo** — processa bloco a bloco, tentando manter blocos coesos. Subdivide recursivamente apenas blocos que excedem o tamanho máximo, preservando o mapeamento de páginas de forma determinística.

**Sliding window** — variante do fixed char com overlap proporcional alto (384/512 = 75%), maximizando a sobreposição entre chunks consecutivos para capturar contexto de fronteira.

**Proposicional** — cada bloco natural do Docling vira um chunk independente, sem agregação. Preserva tabelas como chunk único. Produz chunks menores e mais precisos semanticamente, mas em maior quantidade.

---

## Pré-requisitos

- Boletim 100 PDF já na pasta `PDFs concluídos/` do Drive (processado pelo Script 1 do PDFExtractor)
- JSON de imagens do Boletim 100 já gerado em `data/Imagens/`
- Acesso ao Google Colab
- Credenciais do Qdrant

---

## Passo a passo

### 1. Abrir no Colab e montar o Drive

Abra o notebook no Google Colab e execute a célula de montagem do Drive.

### 2. Instalar dependências

```bash
pip install docling sentence-transformers transformers torch requests PyMuPDF opencv-python-headless -q
sudo apt install tesseract-ocr tesseract-ocr-por tesseract-ocr-eng -y -qq
```

### 3. Preencher credenciais

Na seção `CONFIGURAÇÕES`, preencha:

```python
QDRANT_URL     = "INSERIR_URL_DO_QDRANT"
QDRANT_API_KEY = "INSERIR_CHAVE_SEGURA"
```

### 4. Confirmar caminho do PDF

Verifique se `PDF_PATH` aponta para o Boletim 100 correto no Drive.

### 5. Executar

O notebook processa as 13 coleções em sequência. Para cada coleção:

1. Verifica se já existe no Qdrant — se sim, pula (idempotente)
2. Converte o PDF com Docling + Tesseract
3. Converte tabelas: dupla representação (Markdown + texto descritivo)
4. Aplica a estratégia de chunking configurada
5. Vetoriza em batch com Qwen3-Embedding-0.6B (denso) + SPLADE (esparso)
6. Faz upsert no Qdrant com payload completo

### 6. Verificar resultados

Acesse o painel Qdrant e compare o número de pontos em cada coleção. Os resultados de recuperação comparativa estão documentados no relatório auxiliar linkado no Anexo I do relatório FAPESP.

---

## Correções implementadas na v3

Esta é a versão 3 do notebook. As principais correções em relação à v2:

- `chunk_semantic`: overlap agora funciona corretamente com fluxo de sentenças
- `chunk_struct_sem`: fallback quando Docling não detecta headings
- `chunk_recursive`: processamento bloco a bloco sem `find()` por substring (evitava mapeamento incorreto de páginas)
- `split_em_sentencas`: whitelist de abreviações em português + taxonomia científica (evitava corte incorreto em "sp.", "var.", "cv." etc.)
- `chunk_proposition`: pula `table_md`, preserva `table_text` como chunk único

---

## Modelos utilizados

| Componente | Modelo |
|---|---|
| Extração | Docling + Tesseract CLI (por, eng, spa) |
| Embedding denso | Qwen3-Embedding-0.6B — 1024 dims, Cosine |
| Embedding esparso | opensearch-neural-sparse-encoding-doc-v2-distill (SPLADE) |
| Banco vetorial | Qdrant Cloud — sa-east-1, AWS São Paulo |

# Squad 02 — Ingestão e Vetorização / 2026

**Projeto SB100 Agrônomo Virtual | Iniciação Científica FAPESP**
**Responsável:** Nicolas Alves Witzel da Silva

Repositório de scripts, relatórios, apresentações e documentação técnica da Squad 02 referentes ao período de fevereiro a junho de 2026. O trabalho concentrou-se na construção e refinamento do pipeline de ingestão multimodal de artigos científicos agrícolas para o banco vetorial do SB100.

---

## Estrutura

```
2026/
├── apresentacoes/          ← slides de reuniões e apresentações internas
├── documentacao-pdfextractor/  ← documentação técnica do pipeline
├── relatorios/             ← relatórios FAPESP, de ferramentas e de testes
├── scripts/                ← scripts do pipeline e experimentos
└── README.md               ← este arquivo
```

---

## Scripts

### Pipeline principal — `scripts/PDFExtractor/`

| Arquivo | Descrição |
|---|---|
| `PDFExtractor1305.py` | Script principal de ingestão: extração (Docling + Tesseract), filtro OpenCV, vetorização (Qwen3 + SPLADE) e upsert no Qdrant. Inclui Scripts 1, 2 (Gemini Vision) e 3 (vetorização de imagens). |
| `README_PDFExtractor1305.md` | Instruções completas de instalação, configuração e execução passo a passo. |
| `ExplicacaoPDFExtractor.txt` | Descrição textual do fluxo do pipeline para referência rápida. |
| `script-do-pdf-extractor-2025/pdfextractor.py` | Versão anterior do pipeline (v1, 2025) — mantida para referência histórica. |

### Experimentos de chunking — `scripts/testando-o-tamanho-das-chunks/`

| Arquivo | Descrição |
|---|---|
| `Testes_Boletim_100_tamanhos_variados_de_chunk.ipynb` | Notebook que popula 13 coleções Qdrant com 7 estratégias de chunking (fixed char, fixed token, semântico, struct+semântico, recursivo, sliding window, proposicional) sobre o Boletim 100. |
| `README_Testes_Boletim_100_tamanhos_variados_de_chunk.md` | Descrição das 13 coleções, estratégias e passo a passo de execução. |

### Experimentos de classificação e comparação — `scripts/TesteCGLP/`

Notebooks de comparação de métodos de classificação e extração de imagens, conduzidos como experimentos paralelos ao pipeline principal.

| Arquivo | Descrição |
|---|---|
| `N1_comparacao_3_metodos.ipynb` | Comparação inicial de 3 métodos |
| `N2_comparacao_4_metodos_top10.ipynb` | Expansão para 4 métodos com top-10 |
| `N3_chartvlm_classifier.ipynb` | Avaliação do ChartVLM como classificador |
| `N4_llamaparse_detector_classifier.ipynb` | LlamaParse como detector e classificador |
| `N5_comparacao_qualidade_4dim.ipynb` | Comparação de qualidade com 4 dimensões de avaliação |

---

## Relatórios

### FAPESP — `relatorios/relatorio-anual-para-fapesp/`
Relatórios de progresso submetidos à FAPESP cobrindo o período da bolsa.

### Ferramentas avaliadas — `relatorios/relatorio-de-ferramentas/`
Avaliações técnicas de ferramentas consideradas para integração ao pipeline:

| Pasta | Ferramenta | Data |
|---|---|---|
| `relatorio-chandra-22-04-2026/` | Chandra OCR 2 — avaliação de viabilidade e benchmarks | Abr/2026 |
| `relatorio-chartvlm-18-03-2026/` | ChartVLM — avaliação para extração de gráficos | Mar/2026 |
| `relatorio-llamaparse/` | LlamaParse — avaliação para extração de PDFs | Mar/2026 |
| `relatorioChandraLllamaGLM/` | Comparativo Chandra, LlamaParse e GLM | Abr–Mai/2026 |

### Testes — `relatorios/relatorio-de-testes/`

| Pasta | Conteúdo |
|---|---|
| `relatorio-de-teste-boletim-100-tamanho-de-chunks/` | Metodologia e resultados dos experimentos de chunking no Boletim 100 |
| `relatorio-tamanho-de-dimensao-de-vetores/` | Comparativo 512 vs 1024 dimensões de embedding com avaliação do Squad 04 |

### Servidor — `relatorios/relatorio-do-servidor/`
Diagnóstico da incompatibilidade AVX no servidor do projeto e justificativa técnica para adoção do Google Colab como ambiente permanente de execução.

### Falcão — `relatorios/relatorio-alexandre-falcao/`
Materiais produzidos para reuniões de avaliação com o Professor Alexandre Falcão, incluindo diagnóstico do filtro de imagens e validação de metodologia com OmniDocBench.

---

## Segurança

Nenhum arquivo neste repositório contém credenciais, tokens, senhas ou chaves de API. Nos scripts, esses campos aparecem como marcadores genéricos (`INSERIR_URL_DO_QDRANT`, `INSERIR_CHAVE_SEGURA` etc.). Os valores reais devem ser solicitados ao coordenador da equipe.

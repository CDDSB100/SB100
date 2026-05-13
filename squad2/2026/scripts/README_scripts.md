# scripts/

Scripts e notebooks desenvolvidos pela Squad 02 no período de 2026, organizados por finalidade.

---

## Estrutura

```
scripts/
├── PDFExtractor/                          ← pipeline principal de ingestão
├── TesteCGLP/                             ← experimentos de classificação e comparação
├── testando-o-tamanho-das-chunks/         ← experimentos de chunking no Boletim 100
├── pdf-extractor-2025/                    ← versão anterior do pipeline (referência)
├── pdfextracto1304comimagensvetorizadasepdfs1024nomeuqdrant/  ← artefatos de sessão anterior
├── pypdf/                                 ← experimento inicial de extração de imagens
├── torch-env-check/                       ← diagnóstico de compatibilidade AVX/PyTorch
└── teste_qdrant.py                        ← teste de conexão com o Qdrant
```

---

## PDFExtractor/

Pipeline principal de ingestão multimodal. Contém o script de produção e sua documentação.

| Arquivo | Descrição |
|---|---|
| `PDFExtractor1305.py` | Script principal — extração (Docling + Tesseract), filtro OpenCV, Gemini Vision, vetorização (Qwen3 + SPLADE) e upsert no Qdrant |
| `README_PDFExtractor1305.md` | Instruções completas de instalação, configuração e execução passo a passo |
| `ExplicacaoPDFExtractor.txt` | Descrição textual resumida do fluxo para referência rápida |
| `script-do-pdf-extractor-2025/pdfextractor.py` | Versão v1 do pipeline (2025) — mantida para referência histórica |

---

## testando-o-tamanho-das-chunks/

Experimentos sistemáticos de estratégias de chunking aplicadas ao Boletim 100, gerando 13 coleções Qdrant para avaliação comparativa.

| Arquivo | Descrição |
|---|---|
| `Testes_Boletim_100_tamanhos_variados_de_chunk.ipynb` | Notebook principal — popula as 13 coleções com 7 estratégias de chunking |
| `README_Testes_Boletim_100_tamanhos_variados_de_chunk.md` | Descrição das coleções, estratégias e passo a passo de execução |

---

## TesteCGLP/

Notebooks de comparação de métodos de classificação e extração de imagens, conduzidos como experimentos paralelos ao pipeline principal.

| Arquivo | Descrição |
|---|---|
| `N1_comparacao_3_metodos.ipynb` | Comparação inicial de 3 métodos de extração/classificação |
| `N2_comparacao_4_metodos_top10.ipynb` | Expansão para 4 métodos com avaliação top-10 |
| `N3_chartvlm_classifier.ipynb` | Avaliação do ChartVLM como classificador de imagens científicas |
| `N4_llamaparse_detector_classifier.ipynb` | LlamaParse como detector e classificador |
| `N5_comparacao_qualidade_4dim.ipynb` | Comparação de qualidade com 4 dimensões de avaliação |

---

## Outros

| Arquivo / Pasta | Descrição |
|---|---|
| `pypdf/pdf_image_extraction.ipynb` | Experimento inicial de extração de imagens com PyPDF, substituído pelo pipeline OpenCV |
| `pdf-extractor-2025/` | Versão anterior do pipeline desenvolvida em 2025 pela equipe, mantida para referência |
| `pdfextracto1304.../` | Artefatos de sessão de desenvolvimento anterior (indexados.json e metadados_api.json) |
| `torch-env-check/` | Scripts de diagnóstico da incompatibilidade AVX no servidor do projeto |
| `teste_qdrant.py` | Script simples de teste de conexão e contagem de pontos no Qdrant |

---

## Segurança

Nenhum script nesta pasta contém credenciais, tokens ou chaves de API. Os campos sensíveis aparecem como marcadores genéricos (`INSERIR_URL_DO_QDRANT`, `INSERIR_CHAVE_SEGURA` etc.). Solicite os valores reais ao coordenador da equipe antes de executar qualquer script.

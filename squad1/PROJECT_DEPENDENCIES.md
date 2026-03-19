# Dependências do Projeto - SB100 Squad 1

## 📁 Raiz (Monorepo)
| Dependência | Versão | Tipo |
| :--- | :--- | :--- |
| `@google/generative-ai` | `^0.24.1` | Produção |
| `concurrently` | `^8.2.2` | Desenvolvimento |
| `cross-env` | `^7.0.3` | Desenvolvimento |
| `pm2` | `^6.0.14` | Desenvolvimento |

**Overrides (Segurança):**
- `minimatch`: `^10.2.1`

---

## ⚙️ Backend
| Dependência | Versão | Tipo |
| :--- | :--- | :--- |
| `@google-cloud/local-auth` | `^3.0.1` | Produção |
| `adm-zip` | `^0.5.16` | Produção |
| `axios` | `^1.13.2` | Produção |
| `bcrypt` | `^6.0.0` | Produção |
| `body-parser` | `^1.20.2` | Produção |
| `cors` | `^2.8.6` | Produção |
| `dotenv` | `^17.3.1` | Produção |
| `express` | `^4.19.2` | Produção |
| `googleapis` | `^140.0.1` | Produção |
| `jsonwebtoken` | `^9.0.3` | Produção |
| `mongodb` | `^7.1.0` | Produção |
| `mongoose` | `^9.2.4` | Produção |
| `multer` | `^1.4.5-lts.1` | Produção |
| `mysql2` | `^3.17.1` | Produção |
| `pdf-parse` | `^1.1.1` | Produção |
| `pdf-to-img` | `^5.0.0` | Produção |
| `sqlite3` | `^6.0.1` | Produção |
| `swagger-jsdoc` | `^6.2.8` | Produção |
| `swagger-ui-express` | `^5.0.1` | Produção |
| `tesseract.js` | `^7.0.0` | Produção |
| `xlsx` (SheetJS) | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | Produção |
| `concurrently` | `^9.2.1` | Desenvolvimento |
| `cross-env` | `^10.1.0` | Desenvolvimento |

---

## 🐍 Backend (Python - IA & Extração)
Estas dependências são instaladas no ambiente virtual (`venv`) do backend para o processamento de LLM e documentos.

| Dependência | Versão | Função |
| :--- | :--- | :--- |
| `fastapi` | `latest` | Servidor Web de alta performance |
| `uvicorn` | `latest` | Servidor ASGI para FastAPI |
| `pydantic` | `latest` | Validação de dados e Schemas |
| `openai` | `latest` | Cliente compatível com Ollama API |
| `ollama` | `latest` | **[LOCAL LLM]** Interface nativa para modelos locais |
| `sentence-transformers`| `latest` | **[LOCAL EMBEDDINGS]** Geração de vetores localmente |
| `pypdf` | `latest` | Extração de texto de PDFs |
| `qdrant-client` | `latest` | Cliente para Banco de Dados Vetorial |
| `python-dotenv` | `latest` | Carregamento de variáveis de ambiente |
| `httpx` | `latest` | Cliente HTTP assíncrono |

> **Nota:** Para rodar localmente, certifique-se de ter o [Ollama](https://ollama.com/) instalado no sistema e o modelo (ex: `llama3.1:8b`) baixado.

---

## 💻 Frontend
| Dependência | Versão | Tipo |
| :--- | :--- | :--- |
| `@emotion/react` | `^11.14.0` | Produção |
| `@emotion/styled` | `^11.14.1` | Produção |
| `@mui/icons-material` | `^7.3.6` | Produção |
| `@mui/lab` | `^7.0.1-beta.20` | Produção |
| `@mui/material` | `^7.3.6` | Produção |
| `axios` | `^1.13.2` | Produção |
| `jwt-decode` | `^4.0.0` | Produção |
| `react` | `^19.2.0` | Produção |
| `react-dom` | `^19.2.0` | Produção |
| `react-router-dom` | `^7.12.0` | Produção |
| `@eslint/js` | `^9.39.1` | Desenvolvimento |
| `@types/react` | `^19.2.5` | Desenvolvimento |
| `@types/react-dom` | `^19.2.3` | Desenvolvimento |
| `@vitejs/plugin-react` | `^5.1.1` | Desenvolvimento |
| `concurrently` | `^9.2.1` | Desenvolvimento |
| `cross-env` | `^10.1.0` | Desenvolvimento |
| `eslint` | `^9.39.1` | Desenvolvimento |
| `eslint-plugin-react-hooks` | `^7.0.1` | Desenvolvimento |
| `eslint-plugin-react-refresh` | `^0.4.24` | Desenvolvimento |
| `globals` | `^16.5.0` | Desenvolvimento |
| `vite` | `^7.2.4` | Desenvolvimento |

**Overrides (Segurança):**
- `minimatch`: `^10.2.1`
- `ajv`: `^8.18.0`

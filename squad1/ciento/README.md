# Ciento - Sistema de Cientometria e Curadoria

Sistema completo para busca, extração de metadados e curadoria de artigos científicos, utilizando IA para análise e MongoDB para persistência.

## 📂 Estrutura do Projeto

```text
.
├── backend/             # API Node.js, Processamento Python e Documentos
│   ├── src/             # Código-fonte da API Node
│   ├── scripts/         # Scripts de migração e utilitários
│   ├── documents/       # Armazenamento local de PDFs (aprovados/reprovados)
│   ├── main.py          # Servidor LLM (FastAPI/Python)
│   └── server.js        # Servidor Principal (Express)
├── frontend/            # Aplicação Web (React + Vite + Material UI)
├── docs/                # Guias de Integração e Deployment
├── docker-compose.yml   # Orquestração de Containers (App + MongoDB)
├── ecosystem.config.js  # Configuração para rodar com PM2
└── nginx.conf           # Configuração do Proxy Reverso
```

## 🚀 Como Executar

### Usando Docker (Recomendado)
```bash
docker-compose up --build -d
```

### Usando PM2 (Servidor)
1. Certifique-se de que o MongoDB está rodando (via Docker ou local).
2. Instale as dependências: `npm install` na raiz, no `frontend` e no `backend`.
3. Inicie: `pm2 start ecosystem.config.js`

## 🛠 Principais Tecnologias
- **Frontend:** React, Material UI, Vite.
- **Backend:** Node.js, Express, FastAPI (Python).
- **Banco de Dados:** MongoDB (Dados dos artigos), SQLite (Autenticação).
- **IA:** Integração com LLMs (Ollama/OpenAI) para extração de metadados.

# Ciento - Sistema de Cientometria e Curadoria

Sistema completo para busca, extração de metadados e curadoria de artigos científicos, utilizando IA para análise e MongoDB para persistência.

## 📂 Estrutura do Projeto

```text
/
├── backend/          # API Node.js (Express) e FastAPI (Python)
│   ├── documents/    # 📂 Armazenamento de PDFs
│   │   ├── aprovados/   # Documentos aprovados pela curadoria
│   │   └── reprovados/  # Documentos rejeitados
├── frontend/         # Interface React (Vite)
├── docs/             # Documentação detalhada
└── package.json      # Configurações do Monorepo
```

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Material UI, Vite.
- **Backend:** Node.js, Express, FastAPI (Python).
- **Banco de Dados:** MongoDB (Artigos), SQLite (Autenticação).
- **IA:** Integração com LLMs (Ollama/Groq) para extração de metadados.

---

## 📂 Armazenamento de PDFs

Os documentos processados pelo sistema são organizados automaticamente no diretório `backend/documents/`:

1.  **Pendentes:** Arquivos recém-carregados ficam na raiz da pasta `documents/`.
2.  **Aprovados:** Após a curadoria (IA ou Manual), o PDF é movido para `documents/aprovados/` e um arquivo `.txt` com os metadados extraídos é gerado ao lado dele.
3.  **Rejeitados:** Arquivos que não atendem aos critérios são movidos para `documents/reprovados/`.

---

## 🚀 Como Executar Localmente (Ambiente de Teste/Dev)

O projeto está configurado como um **Monorepo**. Você pode subir todos os serviços com um único comando.

### 1. Pré-requisitos
- Node.js (v18+)
- Python 3.10+
- MongoDB (Local ou Remoto)

### 2. Instalação
Na raiz do projeto, instale todas as dependências (root, frontend e backend):
```bash
npm run install:all
```

### 3. Configuração
Crie um arquivo `.env` dentro da pasta `backend/` seguindo o modelo abaixo:
```env
JWT_SECRET=sua_chave_secreta
MONGODB_URI=mongodb://seu_ip:27017/cientometria
GROQ_API_KEY=sua_chave_groq
API_BASE_URL=http://localhost:8000
```

### 4. Execução
Para iniciar o Frontend, Backend Node e Backend Python simultaneamente:
```bash
npm run dev
```
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **API Node:** [http://localhost:5001](http://localhost:5001)
- **API Python:** [http://localhost:8000](http://localhost:8000)

---

## 🏗️ Deployment (Ambiente de Produção)

Para produção, utilizamos o **PM2** para gerenciar os processos e o **Nginx** como proxy reverso.

### 1. Build do Frontend
```bash
npm run build:frontend
```

### 2. Iniciar Serviços com PM2
O comando abaixo utiliza o arquivo `ecosystem.config.js` para orquestrar os servidores:
```bash
npm run start:prod
```

### 3. Monitoramento de Logs
Os logs em produção são organizados automaticamente na pasta `backend/logs/`. Você pode acompanhá-los via PM2:

- **Logs Gerais (Sucesso/Info):**
```bash
pm2 logs --out
```

- **Logs de Erro:**
```bash
pm2 logs --err
```

- **Logs Combinados em Tempo Real:**
```bash
pm2 logs
```

---

## 📊 Migração de Dados
Caso precise migrar dados de uma planilha Excel para o MongoDB:
```bash
cd backend
node scripts/migrate_to_mongodb.js
```

---

## 📝 Documentação Adicional
- [Guia de Integração de API](./docs/API_INTEGRATION_GUIDE.md)
- [Guia de Deployment Detalhado](./docs/DEPLOYMENT_GUIDE.md)
- [Fluxo de Trabalho (WORKFLOW)](./README.md)

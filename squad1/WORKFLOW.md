# Fluxo de Trabalho e Arquitetura do Projeto (SQUAD 1)

Este documento descreve o fluxo completo de dados, a arquitetura técnica, o processo de deploy e as estratégias de escalonamento do projeto.

---

## 🏗️ 1. Arquitetura Geral

O sistema é dividido em três camadas principais, cada uma utilizando tecnologias específicas para otimizar seu desempenho e responsabilidade.

### 🎨 Frontend (Interface do Usuário)
- **Tecnologias:** React (v19), Vite, Material UI (MUI).
- **Responsabilidade:** Interface visual, gestão de estado e comunicação via Axios.
- **Servidor de Produção:** Distribuído como arquivos estáticos servidos via Nginx.

### ⚙️ Backend de Gestão (Node.js API)
- **Tecnologias:** Node.js, Express.js.
- **Responsabilidade:** Autenticação (JWT/Bcrypt), persistência em bancos de dados (MySQL/SQLite para dados relacionais e MongoDB para documentos), e orquestração de arquivos.
- **Interoperabilidade:** Atua como ponte para o processamento pesado de IA.

### 🧠 Backend de IA & LLM (Python FastAPI)
- **Tecnologias:** FastAPI, Python, Groq/OpenAI, Qdrant (Vector DB).
- **Responsabilidade:** Curadoria automática, extração de metadados via LLM e busca vetorial (RAG).

---

## 🔄 2. Resumo do Ciclo de Vida de um Documento

1. **Entrada:** O usuário faz o upload de um PDF ou inicia uma busca (OpenAlex).
2. **Recepção:** O Node.js armazena o arquivo temporariamente e cria um registro no banco de dados com status "Pendente".
3. **Análise de IA:** O Node.js envia o conteúdo (ou texto extraído) para o FastAPI.
4. **Inferência:** O Python utiliza modelos como GPT-4o ou Llama-3 (via Groq) para classificar o documento e extrair campos específicos (autores, ano, relevância).
5. **Retorno:** O FastAPI devolve um JSON estruturado; o Node.js atualiza o status para "Aprovado por IA" ou "Rejeitado".
6. **Consumo:** O Frontend reflete os dados atualizados em tempo real.

---

## 🚀 3. Processo de Deploy e Infraestrutura

O projeto utiliza uma estratégia de **Conteinerização Multi-Stage** e **Proxy Reverso** para garantir segurança e performance.

### 🐳 Docker & Orchestration
- **Docker-Compose:** Orquestra quatro serviços principais (`mongodb`, `frontend`, `backend-node`, `backend-python`).
- **Persistência:** Utiliza volumes Docker para garantir que os dados do MongoDB e os documentos PDF não sejam perdidos em reinicializações.
- **Rede Interna:** Os serviços se comunicam via nomes de host internos (ex: `http://backend-python:8000`), isolando o tráfego de backend da internet pública.

### 🌐 Nginx (Proxy Reverso & SSL)
- **Terminação SSL:** O Nginx gerencia os certificados (Let's Encrypt), permitindo que o tráfego interno (HTTP) seja seguro externamente (HTTPS).
- **Roteamento Inteligente:**
  - `/` -> Encaminha para o Frontend (Porta 5173).
  - `/api/` -> Encaminha para a API Node.js (Porta 5001).
  - `/api-py/` -> Encaminha para o FastAPI Python (Porta 8000).
- **Segurança:** Configurado com protocolos TLSv1.2/v1.3 e Gzip para compressão de dados.

---

## 📈 4. Escalonamento e Performance (Scaling)

Para suportar o crescimento do volume de documentos e usuários, o sistema está preparado para os seguintes modelos de escala:

### ⚖️ Escalonamento Horizontal (Load Balancing)
- **Nginx Upstreams:** A configuração permite adicionar múltiplos servidores no bloco `upstream`, distribuindo a carga entre diferentes instâncias do backend.
- **PM2 (Cluster Mode):** Em ambientes onde o Docker não é o único orquestrador, o `ecosystem.config.js` está configurado para o PM2. Ele permite rodar múltiplas instâncias do Node.js aproveitando todos os núcleos da CPU (`instances: 'max'`).

### 🚄 Otimização de IA
- **Groq Inference:** O uso da API do Groq permite que a inferência do LLM (Llama-3) ocorra em frações de segundo, evitando gargalos no processamento de grandes lotes de documentos.
- **Qdrant Vector Search:** A busca vetorial é desacoplada, permitindo buscas semânticas rápidas mesmo com milhares de documentos indexados.

### 💾 Gerenciamento de Memória e Recursos
- **Max Memory Restart:** O PM2 está configurado para reiniciar instâncias automaticamente caso excedam 1GB de RAM, prevenindo memory leaks de degradar o servidor.
- **Background Tasks:** Processamentos pesados de PDF (OCR e extração) são tratados de forma assíncrona para não bloquear o loop de eventos da API.

---

## 🛠️ 5. Monitoramento e Logs
- **Logs Consolidados:** Centralizados no arquivo `llm.log` para a parte de IA e via `pm2 logs` para o backend.
- **Health Checks:** O Docker-Compose garante o `restart: always`, assegurando que o serviço suba automaticamente após falhas críticas ou reinicialização do servidor físico.

# Correções Implementadas para Comunicação API-Frontend

## ✅ Problemas Resolvidos

### 1. **Bloqueio de Conteúdo Misto (Mixed Content)**
- **Problema**: Frontend HTTPS tentando acessar API HTTP em `http://172.28.181.92:5001`
- **Solução**: Configurar proxy do Vite para rotear `/api` → backend, mantendo protocolo relativo

### 2. **Cloudflare Insights Bloqueado**
- **Problema**: Script de integridade estava causando erro de hash
- **Solução**: Remover Cloudflare Insights (não essencial para funcionalidade)

### 3. **Content-Security-Policy Muito Restritiva**
- **Problema**: CSP bloqueava conexões para IPs específicos
- **Solução**: Usar CSP permissivo apenas onde necessário

## 🚀 Como Rodar

### Desenvolvimento Local

```bash
cd busca-cientometrica

# Instalar dependências
npm install

# Criar .env.local (se não existir)
cp .env.example .env.local

# Editar .env.local com IP/porta corretos da API
nano .env.local

# Rodar dev server
npm run dev
```

### Configuração da API

No `.env.local` ou `.env`:

```env
# Para rodar localmente na mesma máquina
VITE_API_TARGET=http://127.0.0.1:5001

# Para rodar com API em máquina remota
VITE_API_TARGET=http://172.28.181.92:5001

# Python API (quando necessário)
VITE_API_PY_TARGET=http://172.28.181.92:8000
```

## 📋 Arquivos Modificados

1. **vite.config.js**: Proxy dinâmico via variáveis de ambiente
2. **index.html**: Removido Cloudflare Insights, CSP simplificado
3. **.env.local**: Configuração de endpoints da API
4. **src/api/index.js**: Usa rotas relativas (`/api`)
5. **api-cientometria/server.js**: CORS simples, sem CSP restritiva

## 🔧 Troubleshooting

Se ainda houver problema de conexão:

1. Verificar se a API está rodando: `curl http://172.28.181.92:5001/api/health`
2. Verificar console do navegador para erros de CORS
3. Confirmar IP/porta no `.env.local`
4. Limpar cache: `npm cache clean --force && npm install`
5. Reiniciar dev server: `npm run dev`

## ✔️ Testes

Após rodar `npm run dev`:

1. Abrir http://localhost:5173
2. Ir para página de login
3. Verificar console se há erros de CORS ou conteúdo misto
4. Tentar fazer login com credenciais de teste

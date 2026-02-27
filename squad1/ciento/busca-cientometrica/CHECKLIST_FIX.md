# ✅ CHECKLIST - Corrigindo Frontend

## 🎯 Problemas Principais

❌ **"Bloqueado carregamento de conteúdo misto ativo http://172.28.181.92:5001/api/login"**
❌ **"Falha no carregamento do script Cloudflare Insights"**

---

## 🚀 SOLUÇÃO PASSO-A-PASSO

### ✅ Passo 1: Limpar Cache do Navegador

**Chrome/Edge:**
- Abra DevTools (F12)
- Clique com botão direito no ícone de reload
- Selecione "Empty cache and hard refresh"
- **OU:** Ctrl+Shift+Del → Limpar como "Todo o tempo"

**Firefox:**
- DevTools (F12) → Storage → Clear All
- Ctrl+Shift+R para hard refresh

**Safari:**
- Menu Develop → Empty Caches
- Cmd+Option+E

### ✅ Passo 2: Deletar Arquivos de Build Antigos

```bash
cd ~/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica

# Remover build cache
rm -rf dist .vite

# Se tiver problemas com node_modules
rm -rf node_modules/.vite node_modules/.parcel-cache
```

### ✅ Passo 3: Verificar Configuração

Execute o script de diagnóstico:
```bash
chmod +x diagnose.sh
./diagnose.sh
```

**Esperado:**
- ✅ Node.js e npm instalados
- ✅ .env existe com `VITE_API_BASE_URL=/api`
- ✅ vite.config.js tem proxy configurado
- ✅ src/api/index.js usa `/api` (relativo)
- ✅ Pasta dist NÃO existe
- ✅ Backend (172.28.181.92:5001) respondendo

Se algum ❌ aparecer, leia as instruções.

### ✅ Passo 4: Limpar tudo e Reinstalar

```bash
# Nuclear option
rm -rf node_modules package-lock.json dist .vite
npm cache clean --force
npm install

# Se demorar, espere...
```

### ✅ Passo 5: Rodar Dev Server

```bash
npm run dev
```

**OU usando o script:**
```bash
chmod +x dev.sh
./dev.sh
```

Esperado:
```
  ➜  Local:   http://localhost:5173/
```

### ✅ Passo 6: Testar no Navegador

1. Abra **http://localhost:5173** em novo abrir (ou modo incógnito)
2. Abra DevTools (F12)
3. Vá para aba **Network**
4. Tente fazer login
5. **Verifique:**
   - Deve ver requisição para `/api/login` 
   - **NÃO** deve ver `http://172.28.181.92:5001/api/login`

---

## ✔️ Archivos que foram Corrigidos

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `.env` | Tinha URL absoluta | Agora tem `/api` (relativo) |
| `vite.config.js` | Proxy não estava claro | Proxy agora explícito com fallback 172.28.181.92 |
| `index.html` | Cloudflare Insights causava erro | Removido completamente |
| `src/api/index.js` | Fallback era URL absoluta | Agora usa `/api` |
| `src/pages/Curation.jsx` | Fallback era URL absoluta | Agora usa `/api` |
| `dist/` | Build antigo com IP hardcoded | **Deletado** - será recriado sem erros |

---

## 🧪 Testes Rápidos

### Teste 1: Verificar Proxy do Vite

No console do navegador (F12 → Console):
```javascript
// Abrir Network tab e executar:
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Esperado:**
- ✅ Vê requisição para `/api/health` (sem domínio)
- ✅ Resposta: `{ status: "ok" }`

**Se ver erro de CORS ou 404:**
- ❌ Proxy não está funcionando
- Verifique `vite.config.js`

### Teste 2: Verificar Backend

No terminal:
```bash
curl http://172.28.181.92:5001/api/health
```

**Esperado:**
```json
{"status":"ok"}
```

**Se der erro de conexão:**
- Backend não está rodando
- Configure IP correto em vite.config.js

---

## 🆘 Se Ainda Não Funcionar

1. **Documentar o erro exato** que aparece no console (F12)
2. **Compartilhar:**
   - Saída de: `./diagnose.sh`
   - Saída de: `npm run dev`
   - Screenshot do erro no console

3. **Verificar:**
   - Backend está realmente em `http://172.28.181.92:5001`?
   - Port 5001 está aberta?
   - Node.js e npm estão instalados?
   - Vite conseguem escrever em `.env.local`?

---

## 📚 Documentação Adicional

- [RUN_FRONTEND.md](./RUN_FRONTEND.md) - Guia detalhado de execução
- [CLEAR_CACHE.md](./CLEAR_CACHE.md) - Como limpar cache completamente
- [SETUP_API_CONNECTION.md](./SETUP_API_CONNECTION.md) - Configuração da API

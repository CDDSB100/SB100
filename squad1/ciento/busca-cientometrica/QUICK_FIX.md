# ⚡ RÁPIDO - 5 Passos para Corrigir

## 🎯 Objetivo
Acessar frontend em `http://localhost:5173` e login na API em `http://localhost:5001`

---

## 📋 PASSO 1: Limpar Cache do Navegador

### Chrome / Edge:
```
Ctrl+Shift+Del → Selecionar "All time" → Clear data
```
OU
```
F12 → Application → Clear Site Data → Clear All
```

### Firefox:
```
Ctrl+Shift+Delete → Selecionar "Everything" → Clear
F12 → Storage → Clear All
```

### Safari:
```
Develop → Empty Caches
```

---

## 📋 PASSO 2: Fechar Abas

- ❌ Feche TODAS as abas com `localhost:5173`
- ❌ Feche o navegador completamente
- ⏳ Espere 3 segundos
- ✅ Reabra o navegador

---

## 📋 PASSO 3: Limpar Servidor

Abra terminal e execute:

```bash
cd ~/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
chmod +x cleanup.sh
./cleanup.sh
```

**Esperado:**
```
✅ dist/, .vite/, cache removidos
✅ vite.config.js (proxy) apontando para localhost:5001
```

---

## 📋 PASSO 4: Rodar Dev Server

```bash
npm run dev
```

**Esperado:**
```
  ➜  Local:   http://localhost:5173/
```

---

## 📋 PASSO 5: Testar

1. **Abra em aba NOVA** (Ctrl+T):
   ```
   http://localhost:5173
   ```

2. **Ou modo incógnito** (mais seguro):
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P

3. **Verifique Console** (F12):
   - ✅ Sem erros de Cloudflare
   - ✅ Sem "conteúdo misto"
   - ✅ Sem erros vermelhos

4. **Tente login**:
   - Username: `admin`
   - Password: `password123`

---

## ✅ Resultado Esperado

```
✅ Página carrega sem erros
✅ Console limpo
✅ Consegue fazer login
✅ Redirecionado para /home
```

---

## 🆘 Se Ainda Not Funcionar

### 1. Verificar API

```bash
curl http://localhost:5001/api/health
```

**Esperado:**
```json
{"status":"ok"}
```

Se der erro:
- API não está rodando
- Verifique PM2: `pm2 status`

### 2. Verificar Vite Config

```bash
cat .env.local
```

**Deve ter:**
```
VITE_API_TARGET=http://localhost:5001
```

### 3. Hard Refresh

```
Chrome/Firefox: Ctrl+Shift+R
Safari: Cmd+Option+R
```

### 4. Limpar Tudo Novamente

```bash
cd ~/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
rm -rf dist .vite node_modules/.vite
npm run dev
```

---

## 📞 Info

Arquivo completo com mais detalhes: [FIX_LOCALHOST.md](./FIX_LOCALHOST.md)

Testes de diagnóstico: Execute `./diagnose.sh`

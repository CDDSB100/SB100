# 🔧 FIX - Acesso via Localhost

## 🎯 O que foi corrigido

✅ **vite.config.js** - Proxy agora aponta para `localhost:5001` em vez de `172.28.181.92:5001`
✅ **.env.local** - Configurado para usar `localhost`
✅ **index.html** - Sem referências a Cloudflare Insights

## ⚠️ O Problema

O navegador está em cache carregando:
- ❌ Script Cloudflare antigo (já removido do HTML)
- ❌ Requisições para IP 172.28.181.92 (já removido do config)

## ✅ SOLUÇÃO - Siga em Ordem

### 1️⃣ Limpar Cache do Navegador

**Chrome/Chromium:**
```
F12 → Application → Clear Site Data → Clear All
OU: Ctrl+Shift+Del → "All time" → Clear data
```

**Firefox:**
```
F12 → Storage → Clear All
OU: Ctrl+Shift+Delete → "Everything" → Clear
```

**Safari:**
```
Develop → Empty Caches
OU: Preferences → Privacy → Remove All Website Data
```

### 2️⃣ Fechar Todas as Abas

- Feche todas as abas com `localhost:5173`
- Close dev tools
- Feche e reabra o navegador

### 3️⃣ Limpar Cache do Vite

```bash
cd ~/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica

# Deletar cache
rm -rf dist .vite node_modules/.vite node_modules/.cache

# Se tiver npm disponível:
npm cache clean --force
npm install
```

### 4️⃣ Restartar Dev Server

```bash
# Interromper o servidor atual (Ctrl+C se estiver rodando)
# Depois:
npm run dev
```

**Esperado:**
```
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 5️⃣ Abrir no Navegador

- **Abra em aba NOVA** (ou modo incógnito): `http://localhost:5173`
- Ou use modo incógnito: Ctrl+Shift+N (Chrome) / Ctrl+Shift+P (Firefox)

### 6️⃣ Validar

Abra DevTools (F12):

**Console deve estar clean:**
- ✅ Sem erros de "Falha no carregamento"
- ✅ Sem "Bloqueado carregamento de conteúdo misto"
- ✅ Sem erros de CSP

**Network deve mostrar:**
- ✅ Requisições para `/api/login` (NÃO URLs absolutas)
- ✅ Status 200 nas requisições de API

## 🆘 Se Ainda Houver Erro

### Verificar Configuração

```bash
# Ver se .env.local está correto
cat .env.local

# Deve ter:
# VITE_API_TARGET=http://localhost:5001
```

### Limpar Tudo (Nuclear Option)

```bash
cd ~/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica

# Deletar TUDO
rm -rf dist .vite node_modules/.vite .next

# No navegador pressione:
# Ctrl+Shift+Del → Limpar TUDO → "All time"

# Restartar tudo
npm run dev
```

### No Navegador

Modo incógnito (sem extensões/cache):
- Chrome: Ctrl+Shift+N
- Firefox: Ctrl+Shift+P
- Safari: Cmd+Shift+N

Depois abra: `http://localhost:5173`

## 📋 Checklist Final

- [ ] Cache do navegador limpo
- [ ] Servidor dev parado (Ctrl+C)
- [ ] Pasta `dist` deletada
- [ ] Pasta `.vite` deletada
- [ ] npm cache limpo: `npm cache clean --force`
- [ ] Dev server reiniciado: `npm run dev`
- [ ] Nova aba aberta: `http://localhost:5173`
- [ ] Modo incógnito se possível
- [ ] F12 → Console limpo (sem erros Cloudflare ou conteúdo misto)
- [ ] Tentou login

## ✨ Resultado Esperado

```
✅ Login page carregada
✅ Console limpo
✅ Network mostra /api/login
✅ Sem erros de conteúdo misto
✅ Sem script de Cloudflare
```

Se tudo estiver ok, você consegue fazer login!

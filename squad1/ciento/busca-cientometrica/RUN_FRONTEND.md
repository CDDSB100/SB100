# 🚀 Guia Rápido - Rodando o Frontend

## ✅ Com Proxy (Recomendado - Sem Conteúdo Misto)

O Vite proxy roteia `/api` → backend, evitando erros de conteúdo misto.

### Opção 1: Usando o script

```bash
chmod +x dev.sh
# Para API em 172.28.181.92:5001 (padrão)
./dev.sh

# Ou com IP customizado:
VITE_API_TARGET=http://seu-ip:5001 ./dev.sh
```

### Opção 2: Variável de ambiente

```bash
export VITE_API_TARGET=http://172.28.181.92:5001
npm run dev
```

### Opção 3: Arquivo .env.local (já configurado)

```bash
npm run dev
```

Acesse: **http://localhost:5173**

## 📡 Como Funciona

```
Frontend (http://localhost:5173)
            ↓
        Vite Proxy
            ↓
    Backend (http://172.28.181.92:5001)

Frontend JS Code: axios.post('/api/login')
Vite Proxy:       /api → http://172.28.181.92:5001
Result:           Sem erro de conteúdo misto (mesma origem)
```

## 💡 Por que isso evita erros de conteúdo misto?

- ❌ **Sem proxy**: Frontend HTTPS → Backend HTTP = **BLOQUEADO**
- ✅ **Com proxy**: Frontend HTTPS → Vite proxy (HTTPS) → Backend HTTP = **PERMITIDO**

## 🔧 Troubleshooting

### Erro: "Bloqueado carregamento de conteúdo misto"

**Causa**: Vite proxy não está funcionando ou variável de ambiente não foi carregada

**Solução**:
```bash
# Verificar se .env.local foi criado
cat .env.local

# Deve conter:
# VITE_API_BASE_URL=/api

# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install

# Restartar dev server
npm run dev
```

### Erro: "Network Error" no login

**Causa**: Backend não está rodando ou IP/porta está incorreto

**Solução**:
```bash
# Verificar se backend está rodando
curl http://172.28.181.92:5001/api/health

# Se não responder, verificar vite.config.js:
cat vite.config.js | grep -A 5 "proxy:"
```

### Erro: "Cannot GET /api/login"

**Causa**: Proxy não está configurado corretamente

**Solução**:
1. Verificar `vite.config.js` - deve ter seção `proxy`
2. Verificar variável `VITE_API_TARGET` 
3. Reiniciar dev server: `npm run dev`

## 📦 Build para Produção

```bash
npm run build

# Antes de deployar, copiar .env.example para .env.production
# e nele especificar o URL final da API:
# VITE_API_BASE_URL=/api
# (O servidor de produção deve ter seu próprio proxy ou estar no mesmo host)
```

## ✔️ Checklist

- [ ] `.env.local` criado com `VITE_API_BASE_URL=/api`
- [ ] `vite.config.js` tem seção `proxy` configurada  
- [ ] Backend rodando em `http://172.28.181.92:5001` (ou IP configurado)
- [ ] `npm run dev` foi executado
- [ ] Frontend acessível em `http://localhost:5173`
- [ ] Console (F12) não mostra erro de conteúdo misto
- [ ] Axios faz requisições para `/api` (não URL absoluta)

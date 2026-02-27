# ⚡ SOLUÇÃO - Erro ERR_NETWORK no Firefox

## 🎯 O Problema

O Firefox acessa `https://sb100cientometria.optin.com.br` (HTTPS + domínio) mas o frontend tenta fazer requisições para `http://172.28.181.92:5001` (HTTP + IP).  
Resultado: **bloqueado por conteúdo misto** + **erro de rede**.

---

## ✅ SOLUÇÃO (no servidor físico)

### **Passo 1: SSH para o servidor**

```bash
ssh sb100@seu-servidor
cd /home/sb100/squad1/ciento
```

### **Passo 2: Copiar e executar o script de deploy**

```bash
# Copie o script DEPLOY_SERVER.sh para o servidor
scp DEPLOY_SERVER.sh sb100@seu-servidor:/home/sb100/squad1/ciento/busca-cientometrica/

# Execute no servidor:
ssh sb100@seu-servidor
cd /home/sb100/squad1/ciento/busca-cientometrica
chmod +x DEPLOY_SERVER.sh
./DEPLOY_SERVER.sh
```

### **OU: Passos Manuais**

```bash
# No servidor:
cd /home/sb100/squad1/ciento/busca-cientometrica

# 1. Limpar cache
rm -rf dist node_modules/.vite .vite

# 2. Rebuild (isto faz o novo frontend com /api relativo)
npm run build

# 3. Verificar se dist/ foi criado
ls -la dist/ | head -5

# 4. Parar e reiniciar a API (ela serve o novo frontend)
cd ../api-cientometria
pm2 restart api-ciento

# 5. Verificar status
pm2 status

# 6. Testar saúde
curl http://localhost:5001/api/health
```

---

## 🔍 Se Ainda Não Funcionar

### **Verificar se o frontend está sendo servido**

```bash
curl http://localhost:5001/

# Esperado: HTML da aplicação (não error 404)
```

### **Verificar logs da API**

```bash
pm2 logs api-ciento | head -50

# Procure por:
# ✅ "[API CALL] GET /api/health"
# ✅ "Servindo frontend estático de ..."
# ❌ Se não ver "frontend", significa dist/ não foi criado
```

### **Validar que /api funciona**

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Esperado: {"accessToken":"..."}
```

---

## 🧹 Limpeza no Navegador Cliente (Firefox)

Depois que rodar o deploy, **no Firefox do cliente**:

1. Abra o site: `https://sb100cientometria.optin.com.br`
2. F12 → Storage → **Clear All**
3. Ctrl+Shift+R (hard refresh)
4. Tente fazer login

---

## ✨ Resultado Esperado

✅ Login page carrega sem erros  
✅ Network requests vão para `/api/login` (relativo, não http://172...)  
✅ Login bem-sucedido  
✅ Redireciona para /home

---

## 📋 Checklist

- [ ] Executou `npm run build` no servidor
- [ ] Parou/restartou a API com PM2
- [ ] Confirmou que `dist/` tem ficheiros
- [ ] Validou que `http://localhost:5001/` retorna HTML
- [ ] Limpou cache do navegador cliente
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Tentou login novamente

Se AINDA houver erro, será problema de firewall ou DNS—não de código.

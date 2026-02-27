# 🚀 GUIA RÁPIDO - ERR_NETWORK Firefox

## ⚡ 3 Passos no Servidor

```bash
cd /home/sb100/squad1/ciento
chmod +x busca-cientometrica/DEPLOY_SERVER.sh
./busca-cientometrica/DEPLOY_SERVER.sh
```

Isto vai:
1. ✅ Limpar cache
2. ✅ Fazer novo build do frontend  
3. ✅ Reiniciar API

## 🧹 No Navegador Cliente

1. Firefox: F12 → Storage → Clear All
2. Ctrl+Shift+R (hard refresh)
3. Acesse: https://sb100cientometria.optin.com.br
4. Tente login

---

## 📝 Se der erro novamente...

Execute no servidor:

```bash
# Ver logs
pm2 logs api-ciento

# Testar API direto
curl http://localhost:5001/api/health

# Testar frontend
curl http://localhost:5001/ | head -10
```

---

**99% dos problemas resolvem com rebuild + restart + cache limpo.**

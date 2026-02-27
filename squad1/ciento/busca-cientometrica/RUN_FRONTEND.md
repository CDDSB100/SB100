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
```

> Se você estiver deployando em um servidor junto com a API, siga estes passos adicionais:
> 1. Certifique‑se de que a build está disponível em `busca-cientometrica/dist`.
> 2. Execute a API (`api-cientometria/server.js`) no mesmo host; ela automaticamente
>    serve os arquivos estáticos quando encontra o diretório `dist`.
>    ```bash
>    cd api-cientometria
>    node server.js               # ou use PM2/forever
>    ```
> 3. Configure um proxy reverso (Nginx, Apache, Caddy, etc.) para mapear o domínio
>    público para `http://localhost:5001` e habilite HTTPS. Exemplo nginx:
>    ```nginx
>    server {
>      listen 80;
>      server_name sb100cientometria.optin.com.br;
>      location / {
>        proxy_pass http://127.0.0.1:5001;
>        proxy_http_version 1.1;
>        proxy_set_header Upgrade $http_upgrade;
>        proxy_set_header Connection 'upgrade';
>        proxy_set_header Host $host;
>        proxy_cache_bypass $http_upgrade;
>      }
>    }
>    ```
> 4. (Opcional) Ajuste `.env.production` com qualquer variável de ambiente necessária.

# Dicas de produção
- `VITE_API_BASE_URL` pode permanecer `/api` quando front e API estiverem no mesmo host.
- Se frontend e backend estiverem separados, defina `VITE_API_BASE_URL` para o URL público
  da API (usando HTTPS para evitar mixed‑content).
- Não esqueça de limpar o cache dos clientes após atualizar a build (versão de arquivo,
  query string, etc.).
- **Rede/Firewall:** abra as portas 5173 (dev) e 5001 (API) no servidor. Para produção, o
  proxy reverso (nginx) geralmente escuta na porta 80/443 e encaminha internamente.  
  Se estiver usando máquinas na mesma rede, verifique se o IP público ou nome de
  host resolve corretamente e se não há regras de firewall bloqueando HTTP/HTTPS.


## ✔️ Checklist

- [ ] `.env.local` criado com `VITE_API_BASE_URL=/api`
- [ ] `vite.config.js` tem seção `proxy` configurada  
- [ ] Backend rodando em `http://172.28.181.92:5001` (ou IP configurado)
- [ ] `npm run dev` foi executado
- [ ] Frontend acessível em `http://localhost:5173`
- [ ] Console (F12) não mostra erro de conteúdo misto
- [ ] Axios faz requisições para `/api` (não URL absoluta)

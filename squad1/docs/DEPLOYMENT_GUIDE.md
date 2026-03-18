# 🚀 Guia de Deployment para Produção

## 📋 Pré-requisitos

```bash
# Sistema: Ubuntu 20.04 LTS
# Portas necessárias:
# - 80 (HTTP) → redireciona para 443
# - 443 (HTTPS) ← reverse proxy nginx
# - 5001 (interno) ← backend API Node.js
# - 8000 (interno) ← backend API FastAPI
# - 5173 (interno) ← Vite dev ou build assets
```

---

## 🔐 Step 1: Instalar SSL Certificate (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Gerar certificado SSL
sudo certbot certonly --standalone -d sb100cientometria.optin.com.br

# Verificar instalação
ls /etc/letsencrypt/live/sb100cientometria.optin.com.br/
```

---

## 🌐 Step 2: Instalar e Configurar Nginx

```bash
# Instalar Nginx
sudo apt-get install -y nginx

# Copiar config do projeto
sudo cp /path/to/ciento/nginx.conf /etc/nginx/sites-available/sb100cientometria

# Habilitar o site
sudo ln -s /etc/nginx/sites-available/sb100cientometria /etc/nginx/sites-enabled/

# Desabilitar site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar sintaxe
sudo nginx -t

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📦 Step 3: Preparar Aplicações para Produção

### 3.1 Backend Node.js (Express API)

```bash
cd /path/to/ciento/api-cientometria

# Instalar dependências
npm install --production

# Compilar (se necessário)
npm run build

# Verificar que está ouvindo em localhost:5001
# Verificar arquivo server.js
```

**Importante:** O arquivo `server.js` deve estar ouvindo em:
```javascript
const PORT = process.env.PORT || 5001;
app.listen(PORT, 'localhost', () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
```

### 3.2 Backend FastAPI (Python)

```bash
cd /path/to/ciento/api-cientometria

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Verificar que está ouvindo em localhost:8000
```

### 3.3 Frontend React (Vite - Build estático)

```bash
cd /path/to/ciento/busca-cientometrica

# Instalar dependências
npm install --production

# Build para produção
npm run build

# Resultado será em: dist/

# Verificar arquivo Vite config
# IMPORTANTE: deve ter proxy /api → localhost:5001
```

---

## 🔄 Step 4: Configurar PM2 (Gerenciador de Processos)

Para manter os servidores rodando em background:

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Criar arquivo ecosystem.config.js na raiz do projeto
```

Crie este arquivo na raiz `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'backend-express',
      script: './api-cientometria/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/backend-express-error.log',
      out_file: './logs/backend-express.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'backend-fastapi',
      script: 'python3 -m uvicorn',
      args: 'api_cientometria.src.utils.llm:app --host 127.0.0.1 --port 8000 --workers 2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PYTHONUNBUFFERED: 1
      },
      error_file: './logs/backend-fastapi-error.log',
      out_file: './logs/backend-fastapi.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

Iniciar com PM2:

```bash
# Iniciar todos os processos
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Iniciar no boot
pm2 startup
```

---

## ✅ Step 5: Servir Frontend Estático via Nginx

Se você quer servir os arquivos build (`dist/`) diretamente do Nginx em vez de um servidor de desenvolvimento:

```nginx
# Substitua em /etc/nginx/sites-available/sb100cientometria:

upstream frontend {
    # Em vez de proxiar para :5173, servir arquivos estáticos
    # NÃO é necessário um servidor Node/Vite rodando
}

location / {
    # Servir arquivos estáticos
    root /path/to/ciento/busca-cientometrica/dist;
    try_files $uri $uri/ /index.html;
    
    # Cache para assets versionados
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Sem cache para index.html
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
```

---

## 🧪 Step 6: Testar Configuração

```bash
# Verificar que Nginx está rodando
sudo systemctl status nginx

# Testar certificado SSL
curl -I https://sb100cientometria.optin.com.br/

# Testar API
curl -X POST https://sb100cientometria.optin.com.br/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Monitorar logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs
```

---

## 🔧 Variáveis de Ambiente Produção

Crie `.env` na raiz de cada aplicação:

```bash
# /path/to/ciento/api-cientometria/.env
NODE_ENV=production
PORT=5001
CORS_ORIGIN=https://sb100cientometria.optin.com.br
JWT_SECRET=seu_secreto_aqui
```

```bash
# /path/to/ciento/busca-cientometrica/.env.production
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:5001
```

```bash
# /path/to/ciento/api-cientometria/.env (FastAPI)
GROQ_API_KEY=sua_chave_aqui
QDRANT_URL=seu_url_qdrant
QDRANT_API_KEY=sua_chave_qdrant
```

---

## 📊 Arquitetura Final

```
┌─────────────────────────────────────────┐
│     Internet/Navegador                   │
│  https://sb100cientometria.optin.com.br │
└──────────────────┬──────────────────────┘
                   │ HTTPS (443)
                   ▼
        ┌──────────────────────┐
        │    Nginx Reverse     │
        │      Proxy (443)     │
        │  - SSL Certificate   │
        │  - CORS Headers      │
        │  - Rate Limiting     │
        └───┬────────────────┬──┘
            │                │
  ┌─────────▼──┐    ┌──────▼──────┐
  │ Frontend   │    │  Backend     │
  │ React/Vite│    │  API Routes  │
  │ (5173/dist)    │              │
  │            │    ├─ /api/*     │
  │            │    │ (5001)       │
  │            │    ├─ /api-py/*  │
  │            │    │ (8000)       │
  └────────────┘    └──────────────┘
```

---

## 🐛 Troubleshooting

### Erro: "Failed to connect to backend"
```bash
# Verificar se servidores estão rodando
ps aux | grep node
ps aux | grep python
pm2 status

# Verificar logs
pm2 logs backend-express
pm2 logs backend-fastapi
```

### Erro: "Mixed Content" (HTTP em página HTTPS)
```bash
# Verificar headers no Nginx
curl -v https://sb100cientometria.optin.com.br/api/health

# Garantir X-Forwarded-Proto: https nos headers
```

### Erro: "Certificate validation failed"
```bash
# Renovar certificado
sudo certbot renew --force-renewal

# Verificar validade
openssl x509 -in /etc/letsencrypt/live/sb100cientometria.optin.com.br/fullchain.pem -noout -dates
```

---

## 📝 Checklist de Deployment

- [ ] SSL Certificate instalado e válido
- [ ] Nginx configurado e testado
- [ ] Backend Express rodando na porta 5001
- [ ] Backend FastAPI rodando na porta 8000
- [ ] Frontend buildado em `dist/`
- [ ] PM2 gerenciando processos
- [ ] Variáveis de ambiente configuradas
- [ ] Logs sendo monitorados
- [ ] CORS funcionando
- [ ] HTTPS redirecionando corretamente

---

**Última atualização:** 28 de Fevereiro de 2026

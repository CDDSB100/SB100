# 📡 Guia de Integração: Frontend Vite + FastAPI Backend

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  NAVEGADOR (https://sb100cientometria.optin.com.br)     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Vite Dev Server (5173)    │
        │   Reverse Proxy              │
        │   /api → localhost:8000    │
        └────────────┬────────────────┘
                     │
       ┌─────────────┴──────────────┐
       ▼                            ▼
  ┌─────────────┐          ┌──────────────────┐
  │   React     │          │  FastAPI Server  │
  │   Frontend  │          │  (localhost:8000)│
  │ requests    │          │  /curadoria      │
  │  to /api/*  │          │  /categorize     │
  └─────────────┘          │  /                │
                           └──────────────────┘
```

---

## ✅ Alterações Implementadas

### 1️⃣ **Vite Config** (`busca-cientometrica/vite.config.js`)

O proxy foi configurado para redirecionar todas as requisições `/api/*` para o FastAPI:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // Apontando para FastAPI
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),  // Remove /api antes de enviar
      secure: false,
    },
  },
}
```

**Como funciona:**
- `http://localhost:5173/api/curadoria` → `http://localhost:8000/curadoria`
- `http://localhost:5173/api/categorize` → `http://localhost:8000/categorize`

---

### 2️⃣ **FastAPI CORS** (`api-cientometria/src/utils/llm.py`)

O middleware CORS foi adicionado para aceitar requisições do frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sb100cientometria.optin.com.br",  # Produção
        "http://localhost:5173",                    # Desenvolvimento local
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 3️⃣ **Cliente Axios no React** (`busca-cientometrica/src/api/index.js`)

Já está configurado corretamente! Usa `/api` como base:

```javascript
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});
```

---

## 🚀 Como Usar a API no Frontend

### **Exemplo 1: Fazer uma requisição POST simples com Axios**

```javascript
// Em qualquer componente React
import { getCuratedArticles } from '@/api';

async function loadArticles() {
  try {
    const data = await getCuratedArticles();
    console.log(data);
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

### **Exemplo 2: Chamar a curadoria com um documento**

```javascript
// Importar o cliente de API
import axios from 'axios';

async function curateDocument(encodedPdf, headers, category) {
  const API_BASE_URL = '/api';  // Usa o proxy
  
  const payload = {
    encoded_content: encodedPdf,
    content_type: 'pdf',
    headers: headers,
    category: category
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/curadoria`, payload);
    return response.data;
  } catch (error) {
    console.error('Erro na curadoria:', error);
  }
}
```

### **Exemplo 3: Using Fetch API**

```javascript
const API_BASE_URL = '/api';

async function categorizeArticle(encodedPdf, contentType) {
  const payload = {
    encoded_content: encodedPdf,
    content_type: contentType,
    headers: [],
  };

  try {
    const response = await fetch(`${API_BASE_URL}/categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

### **Exemplo 4: Hook React Custom para Requisições**

```javascript
import { useState, useCallback } from 'react';
import axios from 'axios';

function useFetchData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api${url}`, options);
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
}

// Uso no componente:
function MyComponent() {
  const { data, loading, fetchData } = useFetchData();

  const handleLoad = async () => {
    await fetchData('/curation');
  };

  return (
    <div>
      <button onClick={handleLoad} disabled={loading}>
        {loading ? 'Carregando...' : 'Carregar Artigos'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

---

## 🔧 Variáveis de Ambiente

Crie um `.env.local` na pasta `busca-cientometrica/`:

```bash
# .env.local
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:8000
```

---

## 🏃 Como Rodar Tudo

### **Terminal 1: FastAPI Server**
```bash
cd api-cientometria
python -m uvicorn src.utils.llm:app --host 0.0.0.0 --port 8000 --reload
```

### **Terminal 2: Vite Dev Server**
```bash
cd busca-cientometrica
npm run dev
```

### **Terminal 3: Express/Node Server (opcional, se usando)**
```bash
cd api-cientometria
npm start
```

---

## ✨ Diagrama de Fluxo de Requisição

```
┌─────────────────────────────────────────┐
│  React Componente                       │
│  axios.post('/api/curadoria', data)    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Vite Dev Server     │
        │  Port 5173           │
        │  Intercepta /api/*   │
        └──────────┬───────────┘
                   │ rewrite: remove /api
                   │
                   ▼
      ┌────────────────────────────┐
      │  FastAPI Server            │
      │  Port 8000                 │
      │  /curadoria endpoint       │
      │  + CORS Middleware         │
      └────────────┬───────────────┘
                   │
                   ▼
      ┌────────────────────────────┐
      │  Processa com Groq + Qdrant│
      │  Valida com CORS           │
      │  Retorna JSON              │
      └────────────┬───────────────┘
                   │
                   ▼
      ┌────────────────────────────┐
      │  Response retorna ao React │
      │  .then(res => setData(...)) │
      └────────────────────────────┘
```

---

## 🐛 Troubleshooting

### **Erro: CORS error no Console**
✅ **Solução:** Certifique-se de que o FastAPI tem a url correta em `allow_origins[]`

### **Erro: Cannot POST /api/curadoria**
✅ **Solução:** Verifique se o Vite proxy está ativo e se o FastAPI está rodando na porta 8000

### **Erro: Mixed Content (production)**
✅ **Solução:** Use `https://` para o domínio e certifique-se de que o endpoint do FastAPI também é HTTPS

---

## 📋 Checklist de Verificação

- [ ] FastAPI rodando em `http://localhost:8000`
- [ ] Vite rodando em `http://localhost:5173`
- [ ] `vite.config.js` tem proxy `/api` → `localhost:8000`
- [ ] `llm.py` tem CORSMiddleware configurado
- [ ] React chamando `/api/curadoria` (não `localhost:8000/curadoria`)
- [ ] Token JWT sendo passado em `Authorization` header
- [ ] `.env.local` configurado corretamente

---

## 🎯 Próximos Passos

1. **Teste localmente** com `npm run dev`
2. **Deploy no servidor** com domínio `sb100cientometria.optin.com.br`
3. **Configure certificado HTTPS** (Let's Encrypt)
4. **Monitore logs** via FastAPI e React DevTools

---

**Última atualização:** 28 de Fevereiro de 2026

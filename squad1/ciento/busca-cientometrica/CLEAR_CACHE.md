# 🔧 Corrigindo Erros de Cloudflare e Conteúdo Misto

## ❌ Erros Comuns e Soluções

### 1. "Falha no carregamento do script Cloudflare Insights"
### 2. "Bloqueado carregamento de conteúdo misto ativo"

Esses erros ocorrem devido a **cache do navegador** carregando versões antigas.

## ✅ Solução Completa

### Passo 1: Limpar Cache do Navegador

#### Firefox
1. Abra o console (F12 ou Ctrl+Shift+K)
2. Vá para aba **Storage**
3. Clique em **Clear All** (ou limpe cookies/cache)
4. Recarregue a página (Ctrl+Shift+R - hard refresh)

#### Chrome
1. Abra DevTools (F12)
2. Clique com botão direito no ícone de reload
3. Selecione "Empty cache and hard refresh"
4. Ou: Ctrl+Shift+Del → Limpar dados de navegação → Clear data

#### Safari
1. Menu Develop → Empty Caches
2. Ou: Preferences → Privacy → Manage Website Data → Remove All

### Passo 2: Deletar Arquivos de Build Antigos

```bash
# No diretório do frontend
rm -rf dist node_modules/.vite .vite

# Depois restartar dev server
npm run dev
```

### Passo 3: Limpar Node.js Cache

```bash
# Se npm estiver disponível
npm cache clean --force
rm -rf package-lock.json
npm install
npm run dev
```

### Passo 4: Verificar Arquivos de Configuração

✅ Esses arquivos devem estar corretos:

**`.env`**:
```
VITE_API_BASE_URL=/api
```

**`vite.config.js`** deve ter:
```javascript
proxy: {
  '/api': {
    target: 'http://172.28.181.92:5001',
    changeOrigin: true,
  }
}
```

**`src/api/index.js`** deve ter:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
```

## 🧹 Nuclear Option (Se Nada Funcionar)

```bash
# Deletar TUDO e recomeçar
rm -rf dist node_modules package-lock.json .vite

# Reinstalar tudo
npm install

# Limpar cache do browser (abra DevTools → Application → Clear Site Data)
# Ou em Firefox: Storage → Clear All

# Usar Hard Refresh: Ctrl+Shift+R ou Cmd+Shift+R (Mac)

# Rodar de novo
npm run dev
```

## ✔️ Verificar Se Funcionou

1. Abra http://localhost:5173 em uma aba incógnita (private)
2. Abra Console (F12)
3. Vá para aba **Network**
4. Tente fazer login
5. Você deve ver requisições para `/api/login` (NÃO `http://172.28.181.92:5001/api/login`)

**Se ver `/api/login` → ✅ Página usando proxy corretamente**

**Se ver `http://172.28.181.92:5001/api/login` → ❌ Ainda há cache ou arquivo antigo carregado**

## 💡 Dica: Usar Modo Incógnito

Para testar sem cache:

```
Firefox: Ctrl+Shift+P (Private Window)
Chrome:  Ctrl+Shift+N (Incognito)
Safari:  Cmd+Shift+N (Private)
```

Depois acesse `http://localhost:5173`

# Mixed Content Error - HTTPS/Domain Access

## Error Message
```
Bloqueado carregamento de conteúdo misto ativo "http://172.28.181.92:5001/api/login"
Login failed: AxiosError: Network Error
```

## Root Cause

**You're accessing via HTTPS but trying to make HTTP requests:**

| Scenario | URL Protocol | API Call | Result |
|----------|--------------|----------|--------|
| Localhost Dev | HTTP | HTTP | ✅ Works |
| IP Dev | HTTP | HTTP | ✅ Works |
| Domain via Nginx | HTTPS | HTTP | ❌ **BLOCKED** |

Modern browsers **block active mixed content** for security:
- ✅ HTTPS page → HTTPS API = Allowed
- ✅ HTTP page → HTTP API = Allowed  
- ❌ HTTPS page → HTTP API = **Blocked** (mixed content)

---

## Solution: Choose Your Access Method

### ✅ Development Mode (Use This While Coding)

**Best for:** Local development, quick testing on IP

**Access Methods:**
- `http://localhost:5173` 
- `http://172.28.181.92:5173`
- NOT via domain with HTTPS

**Setup:**

Terminal 1 - Backend:
```bash
cd api-cientometria
npm start
# Listens on port 5001
```

Terminal 2 - Frontend:
```bash
cd busca-cientometrica
npm run dev
# Listens on port 5173
```

**API Requests:** 
- Frontend → HttpClient sends request to `/api/login` (relative path)
- Vite dev server proxy → Forwards to `http://localhost:5001/api/login`
- Everything HTTP ✅

---

### ✅ Production Mode (Use This for Domain/HTTPS)

**Best for:** Domain access, HTTPS, staging/production

**Build Frontend:**
```bash
cd busca-cientometrica
npm run build
# Creates dist/ folder with optimized build
```

**Start Backend (serves both frontend + API):**
```bash
cd api-cientometria
npm start
# Serves:
#   - Frontend at http://localhost:5001
#   - API at http://localhost:5001/api
#   - Static files from ../busca-cientometrica/dist
```

**Access:**
- Local: `http://localhost:5001`
- IP: `http://172.28.181.92:5001`
- Domain (via Nginx HTTPS): `https://sb100cientometria.optin.com.br`

**Why This Works:**
- Frontend is prebuilt → No Vite dev server
- Frontend + API on same origin → No CORS issues
- Reverse proxy (Nginx) handles HTTPS → Backend stays on HTTP
- No mixed content errors ✅

---

## Common Mistakes

### ❌ Mistake 1: Running Dev Mode BUT Accessing via Domain HTTPS

```bash
# Terminal 1
cd api-cientometria
npm start              # Backend on 5001

# Terminal 2
cd busca-cientometrica
npm run dev            # Vite dev server on 5173
```

Then accessing: `https://sb100cientometria.optin.com.br`

**Why it fails:**
- Nginx reverse proxy routes domain HTTPS → Vite dev server HTTP
- Vite proxy uses http://localhost:5001 for API calls
- Browser sees: HTTPS page trying HTTP API → Mixed content error ❌

**Fix:** Either:
1. Use dev mode on HTTP: `http://172.28.181.92:5173`
2. Or use production build: `npm run build && cd ../api-cientometria && npm start`

---

### ❌ Mistake 2: Trying to Mix Dev + Production

```bash
# Starting both dev AND production is confusing
npm run dev            # Port 5173 - Vite proxy
npm run build          # Creates dist/
npm start              # Port 5001 - Serves dist/
```

This creates conflicts. **Choose ONE mode.**

---

### ❌ Mistake 3: Forgetting to Rebuild After Changes

When switching from dev to production:

```bash
# After making changes
npm run dev            # Test in dev mode first

# Before deploying
npm run build          # ⚠️ MUST rebuild!
# Then move dist/ and restart backend
```

Forgetting `npm run build` means old code is still in production.

---

## Step-by-Step: Get It Working

### For Development (HTTP - Local Work)

```bash
# 1. Kill any existing processes
killall node

# 2. Terminal 1 - Backend
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/api-cientometria
npm install      # One time
npm start

# Wait for: "Server running on port 5001"

# 3. Terminal 2 - Frontend  
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
npm install      # One time
npm run dev

# Wait for: "Local: http://localhost:5173"

# 4. Open browser
open http://172.28.181.92:5173
```

Test login - should work! ✅

---

### For Production (HTTPS - Domain Access)

```bash
# 1. Kill existing processes
killall node

# 2. Build frontend (one-time, or after changes)
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
npm run build

# Creates dist/ folder

# 3. Start backend only (serves frontend + API)
cd ../api-cientometria
npm start

# Output: "Server running on port 5001"
#         "Serving frontend from ./dist"

# 4. Nginx (separate, already configured)
# Routes: https://sb100cientometria.optin.com.br → http://localhost:5001

# 5. Open browser
open https://sb100cientometria.optin.com.br
```

No mixed content errors! ✅

---

## Debugging Mixed Content

### Check Browser Console

Open DevTools (F12) → Console:

```js
// See what protocol the page is using
console.log(window.location.protocol);  // "https:" or "http:"

// See what API URLs are being called
// (Check Network tab for failed requests)
```

### Check Network Requests

DevTools → Network tab → Click on failed `login` request:

```
URL: http://172.28.181.92:5001/api/login  ← This is HTTP
```

If the page is HTTPS but URL is HTTP → **Mixed content blocked!**

### Fix

Make sure accessing via:
- `http://...` (dev mode), or
- `https://...` with production build (not dev mode)

---

## Server Configuration

### Backend (.env)
```env
PORT=5001
NODE_ENV=development  # or production
CORS_ORIGIN=*         # Allow all origins
```

### Frontend (.env)
```env
VITE_API_BASE_URL=/api  # ← Always relative! Never hardcode origins
```

---

## Still Not Working?

1. **Verify mode you're in:**
   ```bash
   ps aux | grep node
   # Shows processes - are you running dev OR production?
   ```

2. **Check port conflicts:**
   ```bash
   lsof -i :5001
   lsof -i :5173
   # One or both in use?
   ```

3. **Clear cache:**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Or use DevTools → Network → Disable cache
   - Or open in incognito/private mode

4. **Check backend is responding:**
   ```bash
   curl http://localhost:5001/api/health
   # Should return 200 with valid response
   ```

5. **Test from backend logs:**
   ```bash
   # In api-cientometria directory, check what's happening
   # Look for error messages when you attempt login
   ```

---

## Summary

| Need | Mode | Command | Access |
|------|------|---------|--------|
| Code, debug fast | **Dev** | `npm run dev` | `http://172.28.181.92:5173` |
| Deploy, use domain | **Prod** | `npm run build` + `npm start` | `https://sb100cientometria.optin.com.br` |
| Mixed content errors | Change | Use HTTP for dev, HTTPS for prod | See above |

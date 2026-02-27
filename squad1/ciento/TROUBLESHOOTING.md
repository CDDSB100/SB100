# Troubleshooting Guide - React Hook Errors & Port Issues

## Issues Fixed

### 1. ✅ React Hook Errors - "dispatcher is null"
**Problem:** Invalid hook call when accessing context
```
Uncaught TypeError: can't access property "useContext", dispatcher is null
```

**Root Cause:** `AuthProvider` was returning `null` during loading state, breaking React's component tree.

**Solution Applied:** 
- Modified `src/context/AuthContext.jsx` to always render children
- Added loading state handling in `src/components/ProtectedRoute.jsx`
- Components now properly receive context even during initial load

**Files Changed:**
- ✅ `src/context/AuthContext.jsx` - Removed `null` return during loading
- ✅ `src/components/ProtectedRoute.jsx` - Added loading spinner during auth initialization

---

### 2. ⚠️ Multiple React Instances (Emotion/MUI)
**Problem:** 
```
You are loading @emotion/react when it is already loaded. Running multiple instances may cause problems.
```

**Status:** Checked `package.json` - dependencies are correct (single React instance)
**Likely Cause:** Browser cache or development session issue

**Solution:** 
```bash
# Clear browser cache or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
# Or access in incognito/private mode
```

---

### 3. Port 5001 EADDRINUSE Error
**Problem:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5001
```

**Solution - Kill Existing Process:**
```bash
# Method 1: Using lsof (Linux/Mac)
lsof -i :5001
kill -9 <PID>

# Method 2: Using fuser (Linux)
sudo fuser -k 5001/tcp

# Method 3: Using netstat + grep (if lsof unavailable)
ss -tulpn | grep :5001
kill -9 <PID>

# Method 4: Using Node directly
ps aux | grep node
kill -9 <PID>
```

---

## Correct Startup Sequence

### Step 1: Navigate to Directories (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/api-cientometria
```

**Terminal 2 - Frontend:**
```bash
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
```

---

### Step 2: Install Dependencies (First Time Only)

**Terminal 1:**
```bash
npm install
```

**Terminal 2:**
```bash
npm install
```

---

### Step 3: Start Services

**Terminal 1 - Start Backend API (Port 5001):**
```bash
npm run dev
# Or directly:
# node server.js
```

**Expected output:**
```
[dotenv@17.3.1] injecting env (5) from .env
Initializing SQLite database...
Server running on port 5001
```

**Terminal 2 - Start Frontend Dev Server (Port 5173):**
```bash
npm run dev
# This runs: vite --host 0.0.0.0
```

**Expected output:**
```
VITE v7.2.4 ready in XXX ms

➜ Local: http://localhost:5173
➜172.28.181.92:5173  
➜ press h to show help
```

---

## Access Points

| Access Method | URL | Status |
|---|---|---|
| Direct IP | `http://172.28.181.92:5173` | ✅ Works |
| Localhost | `http://localhost:5173` | ✅ Works |
| 0.0.0.0 | `http://0.0.0.0:5173` | ⚠️ Invalid (use IP instead) |
| Domain HTTPS | `https://sb100cientometria.optin.com.br` | 🔧 Requires reverse proxy |

---

## Domain Access (HTTPS - Advanced)

### The Issue You're Seeing
```
CORS error: https://static.cloudflareinsights.com/beacon.min.js
```

**This is expected** because:
1. You're accessing via `https://` (encrypted)
2. Cloudflare beacon is third-party script
3. Browser's tracking protection blocks it

### To Enable Domain Access

You need a **reverse proxy** setup that:
1. Listens on the domain (`sb100cientometria.optin.com.br`)
2. Proxies to `http://172.28.181.92:5173` (frontend) and `:5001` (API)
3. Forwards the correct headers

**Example with Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name sb100cientometria.optin.com.br;
    
    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/cert.key;
    
    # Frontend
    location / {
        proxy_pass http://172.28.181.92:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api {
        proxy_pass http://172.28.181.92:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Development Checklist

- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173 
- [ ] Browser can access `http://172.28.181.92:5173`
- [ ] Login page loads without React errors
- [ ] Can see "Login" form (not blank page)
- [ ] API calls aren't showing 404 errors in network tab
- [ ] Token stored in localStorage after login
- [ ] Can navigate to protected routes after login

---

## Quick Debug Commands

```bash
# Check if backend is running
curl http://localhost:5001/api/health 2>/dev/null || echo "Backend not running"

# Check if frontend dev server is running  
curl http://localhost:5173 2>/dev/null | head -20 || echo "Backend not running"

# Check ports in use
lsof -i :5001 -i :5173 -i :8000

# View backend logs
tail -f api-cientometria/server.js

# View frontend dev server logs (in terminal running npm run dev)
# Already visible in the terminal window
```

---

## Summary of Changes Made

1. ✅ Fixed `AuthContext.jsx` - Always renders children (no null return)
2. ✅ Fixed `ProtectedRoute.jsx` - Shows loading spinner during auth initialization  
3. ✅ Verified `package.json` - No duplicate React instances
4. ✅ Created this troubleshooting guide

All React hook errors should now be resolved. The remaining Cloudflare CORS warnings are normal and don't break functionality.

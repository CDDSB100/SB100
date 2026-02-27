# Domain Access Setup - HTTPS://sb100cientometria.optin.com.br

## Current Situation

| Scenario | Status | URL |
|----------|--------|-----|
| Direct IP (HTTP) | ✅ Working | http://172.28.181.92:5173 |
| Localhost | ✅ Working | http://localhost:5173 |
| Domain (HTTPS) | ❌ Not working | https://sb100cientometria.optin.com.br |

---

## Why Domain Access Doesn't Work (Yet)

### 1. DNS Resolution
The domain `sb100cientometria.optin.com.br` must resolve to your server IP:
```bash
nslookup sb100cientometria.optin.com.br
# Should return: 172.28.181.92 (or your actual IP)
```

### 2. SSL/TLS Certificate
You need a valid SSL certificate for the domain:
```bash
# Check if certificate exists
sudo ls -la /etc/ssl/certs/ | grep sb100

# If not, obtain one:
# Option A: Let's Encrypt (Free)
sudo certbot certonly --standalone -d sb100cientometria.optin.com.br

# Option B: Self-signed (Development only)
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/sb100.key -out /etc/ssl/certs/sb100.crt -days 365 -nodes
```

### 3. Reverse Proxy Configuration
The domain needs a reverse proxy to route traffic:

**Nginx Example:**
```nginx
sudo nano /etc/nginx/sites-available/sb100-cientometria

# Add this configuration:
upstream frontend {
    server 172.28.181.92:5173;
}

upstream backend {
    server 172.28.181.92:5001;
}

server {
    listen 443 ssl http2;
    server_name sb100cientometria.optin.com.br;

    # SSL Certificates
    ssl_certificate /etc/ssl/certs/sb100.crt;
    ssl_certificate_key /etc/ssl/private/sb100.key;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend - Vite Dev Server
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        # WebSocket support (for Vite HMR)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API Proxy
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name sb100cientometria.optin.com.br;
    return 301 https://$server_name$request_uri;
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/sb100-cientometria /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

## CORS & Cloudflare Beacon Errors (Common When Using Domain)

### Error in Browser Console:
```
Requisição cross-origin bloqueada: A diretiva Same Origin não permite...
Nenhum dos hashes "sha512" no atributo 'integrity' corresponde...
```

### Why It Happens:
1. Vite dev server talks to Cloudflare for analytics
2. Browsers block cross-origin resources by default
3. Serving over HTTPS makes it stricter

### Solution:
The app **doesn't actually need** Cloudflare beacon. It's from the Vite dev template and can be safely removed.

Check `busca-cientometrica/index.html`:
```html
<!-- Look for and remove or comment out this line -->
<script defer src="https://static.cloudflareinsights.com/..."></script>
```

Or, if it's injected elsewhere, disable in your security policy by adding to `vite.config.js`:
```javascript
server: {
  headers: {
    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
  },
  // ... rest of config
}
```

---

## Environment Variables for Domain Access

Update `.env.production` (if exists) or `.env` in both directories:

**busca-cientometrica/.env.production:**
```env
# For production with domain
VITE_API_BASE_URL=/api
VITE_API_TARGET=https://sb100cientometria.optin.com.br
```

**api-cientometria/.env.production:**
```env
# Allow domain as origin
CORS_ORIGIN=https://sb100cientometria.optin.com.br
NODE_ENV=production
PORT=5001
JWT_SECRET=your-long-random-secret-key-here
```

---

## Testing Domain Access

### Before Domain is Live:
Edit your `/etc/hosts` to test locally:
```bash
# Linux/Mac
sudo nano /etc/hosts

# Add this line:
172.28.181.92 sb100cientometria.optin.com.br

# Windows
notepad C:\Windows\System32\drivers\etc\hosts
# Add: 172.28.181.92 sb100cientometria.optin.com.br
```

Then test:
```bash
curl https://sb100cientometria.optin.com.br -k  # -k ignores self-signed cert warnings
```

---

## Firewall Rules

Make sure your firewall allows:
```bash
# Allow HTTPS
sudo ufw allow 443/tcp

# Allow HTTP (for redirect)
sudo ufw allow 80/tcp

# Check status
sudo ufw status
```

---

## Production Build vs Dev Server

For production with domain, consider building the frontend and serving it from the backend:

```bash
# Build frontend
cd busca-cientometrica
npm run build
# Creates dist/ folder

# Then just run backend which serves dist
cd ../api-cientometria
npm run start
# Frontend available at https://sb100cientometria.optin.com.br
# API at https://sb100cientometria.optin.com.br/api
```

---

## Checklist for Domain Access

- [ ] DNS resolves domain to server IP: `nslookup sb100cientometria.optin.com.br`
- [ ] SSL certificate exists and valid
- [ ] Nginx (or similar) installed and configured
- [ ] Backend running on 5001
- [ ] Frontend running on 5173 (or built to dist)
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`
- [ ] Port 80 (HTTP) accessible from internet
- [ ] Port 443 (HTTPS) accessible from internet
- [ ] Can curl the domain without errors
- [ ] Browser shows login page without CORS warnings
- [ ] API calls work from browser console

---

## Debugging Domain Issues

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check Nginx access log
sudo tail -f /var/log/nginx/access_log

# Test reverse proxy to backend
curl -H "X-Forwarded-Proto: https" http://localhost:5001/api/health

# Test SSL certificate
openssl s_client -connect sb100cientometria.optin.com.br:443 -servername sb100cientometria.optin.com.br

# DNS verification
dig sb100cientometria.optin.com.br
nslookup sb100cientometria.optin.com.br
```

---

## Still Having Issues?

1. **Check backend logs:**
   ```bash
   tail -f api-cientometria/server.log
   ```

2. **Check frontend in network tab:**
   - Open DevTools → Network tab
   - Reload page
   - Check /api calls - should show 200 status

3. **Verify CORS headers:**
   ```bash
   curl -i https://sb100cientometria.optin.com.br/api/health
   # Should see: Access-Control-Allow-Origin: *
   ```

4. **Clear browser cache:**
   - Ctrl+Shift+Delete (Chrome/Firefox)
   - Or access in incognito mode

5. **Check firewall:**
   ```bash
   sudo ufw status verbose
   sudo ufw allow 443/tcp
   ```

# Quick Start Guide

## Prerequisites
- Node.js v18+ installed
- Two terminal windows

## Setup (One-Time)

```bash
# Terminal 1: Backend API Setup
cd /path/to/ciento/api-cientometria
npm install

# Terminal 2: Frontend Setup  
cd /path/to/ciento/busca-cientometrica
npm install
```

## Running the Application

### Option 1: Development Mode (Recommended)

**Terminal 1 - Start Backend API:**
```bash
cd /path/to/ciento/api-cientometria
npm run dev  # or: node server.js
# Should output: "Server running on port 5001"
```

**Terminal 2 - Start Frontend Dev Server:**
```bash
cd /path/to/ciento/busca-cientometrica
npm run dev
# Should output: "Local: http://localhost:5173" and "0.0.0.0:5173"
```

**Access the application:**
- Local IP: `http://172.28.181.92:5173`
- Localhost: `http://localhost:5173`
- Domain: `https://sb100cientometria.optin.com.br` (if configured)

### Option 2: Production Mode

```bash
# Build frontend
cd /path/to/ciento/busca-cientometrica
npm run build

# Start backend (serves frontend from dist folder)
cd /path/to/ciento/api-cientometria
npm start
# Both API and static frontend available on http://localhost:5001
```

## Troubleshooting

### Port 5001 Already in Use
```bash
# Find and kill process on port 5001
lsof -i :5001
kill <PID>

# Or use fuser (Linux)
sudo fuser -k 5001/tcp
```

### Port 5173 Already in Use
```bash
# Find and kill process on port 5173
lsof -i :5173
kill <PID>
```

### Clear Dependencies Issues
```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

### React Hook Errors Fixed
- AuthProvider no longer returns `null` during loading
- ProtectedRoute now handles loading state properly
- All hooks are now properly wrapped by context providers

## File Structure
```
api-cientometria/
  └─ server.js → Backend API (port 5001)
  
busca-cientometrica/
  ├─ src/
  ├─ package.json
  ├─ vite.config.js → Dev server config (port 5173)
  └─ dist/ → Production build output
```

## Environment Variables
Both directories have `.env` and `.env.local` files with proper configurations.

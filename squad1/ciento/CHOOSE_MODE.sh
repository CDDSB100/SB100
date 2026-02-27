#!/bin/bash

# Quick solution for dev mode mixed content:
# This kills any existing processes and restarts cleanly

echo "🧹 Cleaning up..."

# Kill Node processes
killall node 2>/dev/null || true
sleep 2

echo "✅ Processes cleaned"
echo ""
echo "📝 Choose your access method:"
echo ""
echo "=== OPTION 1: Development Mode (HTTP Only) ==="
echo "Run these in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/api-cientometria"
echo "  npm start"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica"
echo "  npm run dev"
echo ""
echo "Access: http://localhost:5173 or http://172.28.181.92:5173"
echo ""
echo "=== OPTION 2: Production Mode (Supports HTTPS Domain) ==="
echo "Run:"
echo "  cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica"
echo "  npm run build"
echo ""
echo "Then:"
echo "  cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/api-cientometria"
echo "  npm start"
echo ""
echo "Access: http://localhost:5001 or https://sb100cientometria.optin.com.br (with Nginx)"
echo ""

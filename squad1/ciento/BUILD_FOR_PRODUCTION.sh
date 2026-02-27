#!/bin/bash

# Build frontend (requires Node.js in PATH)
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica
echo "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully to dist/"
    echo ""
    echo "Now start the backend:"
    echo "cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/api-cientometria"
    echo "npm start"
    echo ""
    echo "Then access via:"
    echo "  Local: http://localhost:5001"
    echo "  IP: http://172.28.181.92:5001"
    echo "  Domain: https://sb100cientometria.optin.com.br"
else
    echo "❌ Build failed"
    exit 1
fi

#!/bin/bash

# Script to run the development server with correct API configuration
# This ensures the Vite proxy forwards /api requests to the backend

# Default values
API_TARGET="${VITE_API_TARGET:-http://172.28.181.92:5001}"
API_PY_TARGET="${VITE_API_PY_TARGET:-http://172.28.181.92:8000}"

echo "🚀 Starting Busca Cientométrica Frontend"
echo "📡 API Target: $API_TARGET"
echo "🐍 Python API Target: $API_PY_TARGET"
echo ""
echo "ℹ️  To change the API target, set VITE_API_TARGET environment variable:"
echo "   export VITE_API_TARGET=http://172.28.181.92:5001"
echo "   ./dev.sh"
echo ""

# Export environment variables and run npm dev
VITE_API_TARGET="$API_TARGET" \
VITE_API_PY_TARGET="$API_PY_TARGET" \
npm run dev

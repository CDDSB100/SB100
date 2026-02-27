#!/bin/bash

# Complete cleanup script for Busca Cientometrica Frontend
# This will remove all cache and start fresh

set -e

FRONTEND_DIR="$HOME/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica"

echo "🧹 Limpeza Completa - Busca Cientométrica"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo "❌ Erro: Não encontrei o diretório correto"
    echo "   Esperado: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"
echo "📁 Diretório: $FRONTEND_DIR"
echo ""

# 1. Stop any running dev server
echo "⏹️  Parando servidor de desenvolvimento..."
pkill -f "vite" 2>/dev/null || true
pkill -f "webpack" 2>/dev/null || true
sleep 1
echo "   ✅ Servidor parado"
echo ""

# 2. Remove build artifacts
echo "🗑️  Removendo artefatos de build..."
rm -rf dist .vite node_modules/.vite node_modules/.cache 2>/dev/null || true
echo "   ✅ dist/, .vite/, cache removidos"
echo ""

# 3. Display current config
echo "📋 Verificando Configuração:"
echo ""

if [ -f ".env.local" ]; then
    echo "   ✅ .env.local:"
    grep "VITE_" .env.local | sed 's/^/      /'
else
    echo "   ⚠️  .env.local não encontrado"
fi

echo ""
echo "   ✅ vite.config.js (proxy):"
grep -A 5 "'/api':" vite.config.js 2>/dev/null | head -6 | sed 's/^/      /'

echo ""
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📝 Próximas Etapas:"
echo ""
echo "1. Limpe o cache do navegador:"
echo "   Chrome:  Ctrl+Shift+Del → All time → Clear data"
echo "   Firefox: F12 → Storage → Clear All"
echo "   Safari:  Develop → Empty Caches"
echo ""
echo "2. Feche TODAS as abas do navegador"
echo ""
echo "3. Inicie o dev server:"
echo "   cd $FRONTEND_DIR"
echo "   npm run dev"
echo ""
echo "4. Abra em uma NOVA aba ou modo incógnito:"
echo "   http://localhost:5173"
echo ""
echo "5. Verifique console (F12) - deve estar sem erros"
echo ""
echo "✨ Pronto!"

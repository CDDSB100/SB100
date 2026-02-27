#!/bin/bash

# Diagnostic script to check frontend configuration

echo "🔍 Diagnóstico - Busca Cientométrica Frontend"
echo "=============================================="
echo ""

# Check 1: Node.js and npm
echo "📦 Verificando Node.js e npm..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js: $(node --version)"
else
    echo "   ❌ Node.js não encontrado"
fi

if command -v npm &> /dev/null; then
    echo "   ✅ npm: $(npm --version)"
else
    echo "   ❌ npm não encontrado"
fi
echo ""

# Check 2: Environment files
echo "⚙️  Verificando arquivos de configuração..."
if [ -f ".env" ]; then
    echo "   ✅ .env existe:"
    grep "VITE_" .env | sed 's/^/      /'
else
    echo "   ❌ .env não encontrado"
fi

if [ -f ".env.local" ]; then
    echo "   ✅ .env.local existe:"
    grep "VITE_" .env.local | sed 's/^/      /'
else
    echo "   ⚠️  .env.local não encontrado (não é problema)"
fi
echo ""

# Check 3: vite.config.js proxy
echo "🔌 Verificando proxy no vite.config.js..."
if grep -q "proxy:" vite.config.js; then
    echo "   ✅ Proxy encontrado"
    grep -A 6 "'\/api':" vite.config.js | sed 's/^/      /'
else
    echo "   ❌ Proxy não configurado em vite.config.js"
fi
echo ""

# Check 4: API configuration in src/api/index.js
echo "🛠️  Verificando configuração de API..."
if grep -q "VITE_API_BASE_URL || '/api'" src/api/index.js; then
    echo "   ✅ API usando rotas relativas (/api)"
else
    echo "   ❌ API não configurada para rotas relativas"
fi
echo ""

# Check 5: Build artifacts
echo "📁 Verificando artefatos de build..."
if [ -d "dist" ]; then
    echo "   ⚠️  Pasta dist encontrada (pode ter code antigo)"
    echo "      Recomendado: rm -rf dist"
else
    echo "   ✅ Pasta dist não encontrada"
fi

if [ -d ".vite" ]; then
    echo "   ⚠️  Pasta .vite encontrada (cache)"
    echo "      Recomendado: rm -rf .vite"
else
    echo "   ✅ Pasta .vite não encontrada"
fi
echo ""

# Check 6: Backend status
echo "🔗 Verificando conexão com backend..."
if command -v curl &> /dev/null; then
    if curl -s http://172.28.181.92:5001/api/health > /dev/null 2>&1; then
        echo "   ✅ Backend (172.28.181.92:5001) está respondendo"
    else
        echo "   ❌ Backend (172.28.181.92:5001) não está respondendo"
        echo "      Verifique se: 1) API está rodando 2) IP/porta estão corretos"
    fi
else
    echo "   ⚠️  curl não disponível, não posso testar conexão"
fi
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "Próximos passos:"
echo "1. Se algum ❌ apareceu, correija-o"
echo "2. Execute: npm run dev"
echo "3. Abra: http://localhost:5173"
echo "4. No console do navegador (F12 → Network), verifique se requisições vão para /api/login (não http://172.28.181.92:5001/api/login)"

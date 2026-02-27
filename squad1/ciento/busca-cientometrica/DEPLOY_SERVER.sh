#!/bin/bash
# Executar NO SERVIDOR (não em VS Code)
# Este script deve rodar onde a aplicação está hospedada

set -e

FRONTEND_DIR="/home/sb100/squad1/ciento/busca-cientometrica"
API_DIR="/home/sb100/squad1/ciento/api-cientometria"

echo "🔧 DEPLOYMENT SCRIPT - Busca Cientométrica"
echo "=========================================="
echo ""

# 1. Verificar se estamos no servidor certo
echo "1️⃣  Verificando ambiente..."
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend não encontrado em $FRONTEND_DIR"
    echo "   Ajuste o caminho no script se necessário"
    exit 1
fi

if [ ! -d "$API_DIR" ]; then
    echo "❌ API não encontrada em $API_DIR"
    echo "   Ajuste o caminho no script se necessário"
    exit 1
fi

echo "   ✅ Diretórios encontrados"
echo ""

# 2. Limpar build antigo
echo "2️⃣  Limpando build antigo..."
cd "$FRONTEND_DIR"
rm -rf dist node_modules/.vite .vite
echo "   ✅ Cache removido"
echo ""

# 3. Fazer novo build
echo "3️⃣  Compilando frontend..."
npm install --production || npm i
npm run build
echo "   ✅ Build concluído"
echo ""

# 4. Restart API
echo "4️⃣  Reiniciando API no PM2..."
cd "$API_DIR"
pm2 restart api-ciento || pm2 start server.js --name api-ciento
sleep 2
pm2 status
echo "   ✅ API reiniciada"
echo ""

# 5. Verificar saúde
echo "5️⃣  Verificando saúde da API..."
curl -s http://localhost:5001/api/health && echo "✅ API respondendo" || echo "⚠️  API ainda iniciando..."
echo ""

echo "✅ Deployment concluído!"
echo ""
echo "📝 Próximos passos:"
echo "1. Acesse: https://sb100cientometria.optin.com.br"
echo "2. Feche cache do navegador (Ctrl+Shift+Del)"
echo "3. Hard refresh (Ctrl+Shift+R)"
echo "4. Tente fazer login"
echo ""
echo "Se ainda houver erro ERR_NETWORK:"
echo "- Verifique se portas estão abertas no firewall"
echo "- Confirme que o domínio resolve para o IP correto"
echo "- Veja os logs: pm2 logs api-ciento"

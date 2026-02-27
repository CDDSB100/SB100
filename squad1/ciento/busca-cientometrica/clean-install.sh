#!/bin/bash

echo "🧹 Clearing node_modules and cache..."

# Remove node_modules and lock file
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
npm cache clean --force 2>/dev/null || echo "npm cache clean not available"

echo "✅ Cleaned"
echo ""
echo "📦 Installing fresh dependencies..."

# Install with clean slate
npm install

echo ""
echo "✨ Installation complete!"
echo ""
echo "Next steps:"
echo "  npm run dev"

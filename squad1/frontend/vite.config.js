import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Deduplicação obrigatória para evitar múltiplas instâncias de bibliotecas core
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material']
  },
  server: {
    host: true,
    hmr: {
      host: 'sb100cientometria.optin.com.br',
      protocol: 'wss',
      clientPort: 443
    },
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1', '172.28.181.92', '0.0.0.0'],
    middlewareMode: false,
    proxy: {
      // 1. Roteamento para o FastAPI (Inteligência Artificial)
      '/api/curadoria': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/categorize': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },

      // 2. Roteamento para o Node.js (Gerenciamento/Banco de Dados)
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  },
})

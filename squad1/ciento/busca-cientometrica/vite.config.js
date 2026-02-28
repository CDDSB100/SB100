import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Força o uso da mesma instância física no disco
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, './node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, './node_modules/@emotion/styled'),
    },
    // Deduplicação obrigatória
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material']
  },
  server: {
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1', '172.28.181.92', '0.0.0.0'],
    middlewareMode: false,
    proxy: {
      // 1. Roteamento para o FastAPI (Inteligência Artificial)
      // Redireciona endpoints específicos de IA para a porta 8000
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
      // Tudo que sobrar em /api vai para a porta 5001
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        // O Node.js já espera o prefixo /api no server.js, então não fazemos rewrite aqui
      },
    },
    // Headers para CORS e segurança
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  },
})

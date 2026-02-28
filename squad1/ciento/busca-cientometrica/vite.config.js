import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Força o uso de uma única instância do React e Emotion para evitar erros de Hooks e múltiplos carregamentos
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
    },
    // Garante que o Vite use apenas uma cópia dessas bibliotecas
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled']
  },
  server: {
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1', '172.28.181.92', '0.0.0.0'],
    middlewareMode: false,
    proxy: {
      // Redireciona todas as chamadas /api para o backend FastAPI na porta 8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Remove o prefixo /api antes de enviar a requisição para o FastAPI
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Log para depuração de rotas em desenvolvimento
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
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

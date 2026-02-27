import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/api-py': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-py/, ''),
        secure: false,
        logLevel: 'debug',
      },
    },
    // Headers para permitir recursos externos e desabilitar proteção de rastreamento que bloqueia Cloudflare
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Security-Policy': "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; script-src 'self' https://static.cloudflareinsights.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' https: 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' http://127.0.0.1:5001 http://localhost:8000 https: ws: wss:;",
    }
  },
})

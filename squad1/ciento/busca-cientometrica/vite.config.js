import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react')
    }
  },
  server: {
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1', '172.28.181.92', '0.0.0.0'],
    middlewareMode: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        // Trust X-Forwarded-Proto header from reverse proxy (for HTTPS)
        headers: {
          'X-Forwarded-Proto': 'https',
        },
        // Rewrite the host header based on incoming request
        onProxyReq: (proxyReq, req, res) => {
          // This ensures the backend knows what host it's being accessed from
          proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        },
      },
      '/api-py': {
        target: process.env.VITE_API_PY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-py/, ''),
        secure: false,
        logLevel: 'debug',
        headers: {
          'X-Forwarded-Proto': 'https',
        },
        onProxyReq: (proxyReq, req, res) => {
          proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
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

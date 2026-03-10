import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, './node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, './node_modules/@emotion/styled'),
      '@mui/material': path.resolve(__dirname, './node_modules/@mui/material'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material']
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'sb100cientometria.optin.com.br',
      protocol: 'wss',
      clientPort: 443
    },
    allowedHosts: ['sb100cientometria.optin.com.br', 'localhost', '127.0.0.1', '172.28.181.92', '0.0.0.0'],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

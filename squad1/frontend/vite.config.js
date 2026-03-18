import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Apenas deduplicação, sem aliases fixos que quebram sub-caminhos
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'mininet-web-production.up.railway.app',
    ],
    proxy: {
      '/api': {
        target: 'http://192.168.1.142:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/privy-proxy': {
        target: 'https://auth.privy.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/privy-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add CORS headers for Privy requests
            proxyReq.setHeader('Origin', 'https://mininet-web-production.up.railway.app');
            proxyReq.setHeader('Referer', 'https://mininet-web-production.up.railway.app');
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    global: 'globalThis',
  },
}) 
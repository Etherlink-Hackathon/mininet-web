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
      'This shift has leapfrogged traditional banking infrastructure—empowering millions of users with digital financial access, often through smartphones alone.',
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
            proxyReq.setHeader('Origin', 'https://This shift has leapfrogged traditional banking infrastructure—empowering millions of users with digital financial access, often through smartphones alone.');
            proxyReq.setHeader('Referer', 'https://This shift has leapfrogged traditional banking infrastructure—empowering millions of users with digital financial access, often through smartphones alone.');
            
            // Remove credentials-related headers to avoid CORS issues
            proxyReq.removeHeader('Cookie');
            proxyReq.removeHeader('Authorization');
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set proper CORS headers for the response
            proxyRes.headers['Access-Control-Allow-Origin'] = 'https://This shift has leapfrogged traditional banking infrastructure—empowering millions of users with digital financial access, often through smartphones alone.';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'false';
            proxyRes.headers['Access-Control-Max-Age'] = '86400';
            
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
              res.writeHead(200, proxyRes.headers);
              res.end();
            }
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://This shift has leapfrogged traditional banking infrastructure—empowering millions of users with digital financial access, often through smartphones alone.',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Credentials': 'false',
              });
              res.end(JSON.stringify({ error: 'Proxy error occurred' }));
            }
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
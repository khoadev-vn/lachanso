import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Trỏ @ vào thư mục src để import file sạch sẽ hơn
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in the platform via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/proxy/google-news': {
          target: 'https://news.google.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/proxy\/google-news/, ''),
        },
        '/proxy/factcheck': {
          target: 'https://factchecktools.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/proxy\/factcheck/, ''),
        },
        '/proxy/newsapi': {
          target: 'https://newsapi.org',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/proxy\/newsapi/, ''),
        },
      },
    },
  };
});
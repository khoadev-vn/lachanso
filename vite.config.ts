import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
  react(),
  tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    },
    dedupe: ["react", "react-dom"]
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    strictPort: false,
    host: "0.0.0.0",
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/proxy/ddg': {
        target: 'https://api.duckduckgo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/proxy\/ddg/, '')
      },
      '/proxy/google-news': {
        target: 'https://news.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/proxy\/google-news/, '')
      },
      '/proxy/factcheck': {
        target: 'https://factchecktools.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/proxy\/factcheck/, '')
      },
      '/proxy/newsapi': {
        target: 'https://newsapi.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/proxy\/newsapi/, '')
      }
    }
  }
});

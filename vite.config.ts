import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(), 
      tailwindcss(), // Chỉ giữ lại 1 cái này thôi bạn nhé
    ],
    resolve: {
      alias: {
        // Trỏ @ vào thư mục src để import file sạch sẽ hơn
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Giữ nguyên cấu hình HMR của bạn
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
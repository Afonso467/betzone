import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [react()],

  base: '/betzone/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    proxy: isDev
      ? {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        }
      : undefined,
  },
});
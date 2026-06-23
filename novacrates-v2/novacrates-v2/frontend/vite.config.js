import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// No GitHub Pages, o site fica em https://teu-user.github.io/nome-do-repo/
// — por isso o "base" tem de ser "/nome-do-repo/". Em desenvolvimento local
// (vite dev) o base continua "/" para o servidor funcionar normalmente.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/betzone/' : '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));

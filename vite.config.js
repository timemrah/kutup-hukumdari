import { defineConfig } from 'vite';
export default defineConfig({
  // './' göreli yol: GitHub Pages alt dizininde (kullanici.github.io/repo) çalışır
  base: './',
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 5173 },
  build: { target: 'es2020' }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Base path pour GitHub Pages (uniquement en production)
  base: process.env.NODE_ENV === 'production' ? '/tetrix-plus-prototype/' : '/',
  build: {
    // Force un nouveau hash à chaque build en incluant le timestamp
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  },
  server: {
    port: 5173,
    host: true, // Écouter sur toutes les interfaces pour Codespaces
    strictPort: true,
    hmr: {
      clientPort: 443, // Pour GitHub Codespaces
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

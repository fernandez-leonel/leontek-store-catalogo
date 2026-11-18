
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE || '/leontek-store-catalogo/',
  plugins: [react()],
  cacheDir: path.resolve('.vite-cache'),
  server: {
    port: 5174,
    strictPort: true,
  },
});

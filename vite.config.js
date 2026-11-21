
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE || (process.env.CF_PAGES ? '/' : '/leontek-store-catalogo/'),
  plugins: [react()],
  cacheDir: path.resolve('.vite-cache'),
  server: {
    port: 5174,
    strictPort: true,
  },
});

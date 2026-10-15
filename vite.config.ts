import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@gbedu/whot-engine': path.resolve(__dirname, './packages/whot-engine/src/index.ts'),
      '@gbedu/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});

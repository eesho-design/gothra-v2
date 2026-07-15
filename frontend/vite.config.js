import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /\.[jt]sx?$/,
    exclude: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-rest': ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'sonner', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Simplified - remove complex optimizations causing issues
      output: {
        manualChunks: undefined
      }
    },
    sourcemap: false,
    minify: false // Disable minification to avoid optimization errors
  }
});
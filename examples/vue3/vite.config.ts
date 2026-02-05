import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'epub-reader-src': resolve(__dirname, '../../src'),
    },
    extensions: ['.ts', '.js', '.vue', '.json']
  },
  define: {
    global: 'globalThis',
  },

  optimizeDeps: {
    include: ['jszip', 'xml2js', 'vue', 'element-plus'],
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'es2015',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined
      }
    }
  },
});
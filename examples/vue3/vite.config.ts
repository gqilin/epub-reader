import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // 配置主项目src目录的别名
      'epub-reader-src': resolve(__dirname, '../../src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['jszip', 'xml2js'],
    // 强制包含主项目的依赖
  },
  server: {
    port: 3000,
  },
  build: {
    target: ['es2015', 'chrome58', 'firefox57', 'safari11'],
  },
});
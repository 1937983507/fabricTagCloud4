import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    assetsDir: 'static', // 将资源目录从 assets 改为 static，避免与 nginx /assets/ 代理冲突
  },
  assetsInclude: ['**/*.md'],
});


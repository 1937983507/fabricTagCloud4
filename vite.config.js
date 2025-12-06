import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    vue(),
    // Gzip压缩配置
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 只压缩大于1KB的文件
      deleteOriginFile: false, // 保留原文件
      verbose: true, // 显示压缩信息
    }),
  ],
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


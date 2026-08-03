import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    // 分包策略：three / R3F / react 各自独立 chunk（配合 RainNight 懒加载，
    // 首屏交互层不再背着 ~1MB 的 WebGL 依赖）。
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/postprocessing'],
        },
      },
    },
  },
});

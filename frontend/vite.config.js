import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_APP_BASE || './',
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT || 5173),
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, env.VITE_API_PROXY_BASE || '/Blood Bank Management System/api'),
        },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});

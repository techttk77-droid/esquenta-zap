import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // forward API requests to the real backend service
        target: 'https://api-aqc-zap.up.railway.app',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://api-aqc-zap.up.railway.app',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

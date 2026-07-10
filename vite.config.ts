import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'vendor-map';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('@phosphor-icons')) return 'vendor-icons';
          if (id.includes('/src/pages/CoupleMapPage') || id.includes('/src/components/couple-map/')) return 'couple-map';
          if (id.includes('/src/components/admin/') || id.includes('/src/pages/AdminPage')) return 'admin';
        },
      },
    },
  },
});

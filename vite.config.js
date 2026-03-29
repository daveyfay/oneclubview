import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const manualChunks = (id) => {
  if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
  if (
    id.includes('node_modules/@capacitor/core') ||
    id.includes('node_modules/@capacitor/app') ||
    id.includes('node_modules/@capacitor/haptics') ||
    id.includes('node_modules/@capacitor/keyboard') ||
    id.includes('node_modules/@capacitor/status-bar') ||
    id.includes('node_modules/@capacitor/splash-screen') ||
    id.includes('node_modules/@capacitor/push-notifications')
  ) {
    return 'vendor-capacitor';
  }
  if (id.includes('node_modules/react-dom')) return 'vendor-react';
  if (id.includes('node_modules/react/')) return 'vendor-react';
};

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 3000,
  },
});

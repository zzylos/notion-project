import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store/useStore'),
      '@types': path.resolve(__dirname, './src/types/index'),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - rarely changes, good for caching
          'react-vendor': ['react', 'react-dom'],
          // Canvas visualization library
          'canvas-vendor': ['@xyflow/react'],
          // D3 for timeline view
          'd3-vendor': ['d3'],
          // State management
          'zustand-vendor': ['zustand'],
        },
      },
    },
    // Increase warning limit since we're intentionally creating larger vendor chunks
    chunkSizeWarningLimit: 600,
    // Generate source maps only in development
    sourcemap: process.env.NODE_ENV !== 'production',
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@xyflow/react'],
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Set root to server directory to avoid picking up parent's postcss config
  root: '.',
  css: {
    // Disable CSS processing for Node.js server tests
    postcss: {},
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '**/*.d.ts', '**/*.config.*', '**/types/**'],
    },
  },
});

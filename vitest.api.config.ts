// vitest.api.config.ts - API testing configuration
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/src/__tests__/api/**/*.test.ts', 'backend/src/__tests__/integration/**/*.test.ts', 'backend/src/__tests__/api/**/*.spec.ts', 'backend/src/__tests__/integration/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'e2e/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        '**/seed/**',
        '**/migrations/**',
      ],
    },
    alias: {
      '@': resolve(__dirname, './backend/src'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './backend/src'),
    },
  },
})

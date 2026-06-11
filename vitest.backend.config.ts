// vitest.backend.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'backend/src/__tests__/**/*.test.ts'
    ],
    exclude: [
      'backend/src/__tests__/api/admin.api.test.ts',
      'backend/src/__tests__/api/users.api.test.ts',
      'backend/src/__tests__/api/boundary.api.test.ts',
      'backend/src/__tests__/api/permissions.api.test.ts',
      'backend/src/__tests__/api/security.api.test.ts',
      'backend/src/__tests__/performance/**',
      'backend/src/__tests__/middlewares/**',
      'backend/src/__tests__/utils/sanitize.test.ts'
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'backend/src')
    }
  }
})

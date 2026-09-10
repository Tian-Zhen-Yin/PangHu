// vitest.frontend.config.ts - 前端单元测试配置
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'frontend/src/__tests__/utils/imageCompress.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend/src'),
    },
  },
})

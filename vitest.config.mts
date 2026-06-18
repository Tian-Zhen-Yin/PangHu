// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend/src'),
      // 统一 Vue 实例：根 node_modules 和 frontend/node_modules 都装了 Vue，
      // 不去重会导致组件用一份 Vue 编译、test-utils 用另一份，破坏响应式追踪。
      vue: resolve(__dirname, 'frontend/node_modules/vue'),
      '@vue/runtime-core': resolve(__dirname, 'frontend/node_modules/@vue/runtime-core'),
      '@vue/runtime-dom': resolve(__dirname, 'frontend/node_modules/@vue/runtime-dom'),
      '@vue/reactivity': resolve(__dirname, 'frontend/node_modules/@vue/reactivity'),
      '@vue/shared': resolve(__dirname, 'frontend/node_modules/@vue/shared'),
    },
    dedupe: ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'],
  },
})

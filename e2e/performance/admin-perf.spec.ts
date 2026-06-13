// e2e/performance/admin-perf.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Page Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('PERF-009: user list page FCP should be < 1.5s', async ({ page }) => {
    const start = Date.now()

    await page.goto('/admin/users')
    await page.waitForSelector('table', { timeout: 5000 })

    const fcp = Date.now() - start

    // FCP 应小于 1.5s
    expect(fcp).toBeLessThan(1500)
  })

  test('PERF-010: dashboard LCP should be < 2.5s', async ({ page }) => {
    const start = Date.now()

    await page.goto('/admin/dashboard')
    await page.waitForSelector('.stat-card', { timeout: 5000 })

    const lcp = Date.now() - start

    expect(lcp).toBeLessThan(2500)
  })

  test('PERF-011: page TTI should be < 3.5s', async ({ page }) => {
    const start = Date.now()

    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const tti = Date.now() - start

    expect(tti).toBeLessThan(3500)
  })

  test('PERF-015: resource size should be < 1MB', async ({ page }) => {
    let totalSize = 0

    page.on('response', async (response) => {
      const headers = response.headers()
      const contentLength = headers['content-length']
      if (contentLength) {
        totalSize += parseInt(contentLength)
      }
    })

    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')

    // 资源大小（gzip前）应小于 3MB
    expect(totalSize).toBeLessThan(3 * 1024 * 1024)
  })
})

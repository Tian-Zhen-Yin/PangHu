// e2e/admin-dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.locator('.stat-card')).toHaveCount(4)
    
    await expect(page.locator('.stat-value').first()).toBeVisible()
    await expect(page.locator('.stat-label').first()).toBeVisible()
  })

  test('should display charts', async ({ page }) => {
    await expect(page.locator('.chart-container')).toBeVisible()
  })

  test('should display recent activities', async ({ page }) => {
    await expect(page.locator('text=最近操作')).toBeVisible()
  })

  test('should filter by date range', async ({ page }) => {
    await page.click('.el-date-picker')
    await page.click('.el-picker-panel__icon-btn')
    await page.click('button:has-text("确定")')
    
    await expect(page.locator('.stat-card')).toBeVisible()
  })
})

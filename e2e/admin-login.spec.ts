// e2e/admin-login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/admin/login')
    
    await expect(page.locator('h1')).toHaveText('管理员登录')
    
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('/admin/dashboard')
    await expect(page.locator('.page-title')).toHaveText('数据概览')
  })

  test('should show error with invalid password', async ({ page }) => {
    await page.goto('/admin/login')
    
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.el-message--error')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/admin/login')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  })

  test('should navigate back to login after logout', async ({ page }) => {
    await page.goto('/admin/login')
    
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('/admin/dashboard')
    
    await page.click('.logout-button')
    await page.waitForURL('/admin/login')
    
    await expect(page.locator('h1')).toHaveText('管理员登录')
  })
})

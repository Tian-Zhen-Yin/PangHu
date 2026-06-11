// e2e/admin/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    await page.waitForURL('/admin/dashboard', { timeout: 5000 })
    await expect(page.locator('h1, .page-title')).toBeVisible()
  })

  test('should show validation error for empty username', async ({ page }) => {
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    await expect(page.locator('.el-form-item__error, .error-message')).toContainText('用户名')
  })

  test('should show validation error for empty password', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin')
    await page.click('button[type="submit"]')

    await expect(page.locator('.el-form-item__error, .error-message')).toContainText('密码')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'WrongPassword123!')
    await page.click('button[type="submit"]')

    await expect(page.locator('.el-message--error, .error-message')).toBeVisible()
    await expect(page.locator('.el-message--error, .error-message')).toContainText('用户名或密码错误')
  })

  test('should remember me functionality work', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')

    const rememberCheckbox = page.locator('input[type="checkbox"]').or(page.locator('.el-checkbox__input'))
    await rememberCheckbox.check()

    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard', { timeout: 5000 })

    // Verify checkbox is checked
    await expect(rememberCheckbox).toBeChecked()
  })

  test('should logout successfully', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    await page.waitForURL('/admin/dashboard', { timeout: 5000 })

    // Click logout button (may be in dropdown or direct button)
    const logoutButton = page.locator('.logout-button, button:has-text("退出"), .el-dropdown-menu-item:has-text("退出")').first()
    await logoutButton.click()

    // Should redirect to login page
    await page.waitForURL('/admin/login', { timeout: 5000 })
    await expect(page.locator('h1')).toContainText('登录')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/admin/dashboard')

    // Should redirect to login
    await page.waitForURL('/admin/login', { timeout: 5000 })
    await expect(page.locator('h1')).toContainText('登录')
  })
})

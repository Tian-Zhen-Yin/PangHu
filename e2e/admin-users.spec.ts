// e2e/admin-users.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('should navigate to users list', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await expect(page.locator('.page-title')).toHaveText('用户管理')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should search users by keyword', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await page.fill('input[placeholder="搜索用户名"]', 'test')
    await page.click('button:has-text("搜索")')
    
    await expect(page.locator('table')).toBeVisible()
  })

  test('should create new user', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await page.click('button:has-text("新建用户")')
    
    await expect(page.locator('.el-dialog__title')).toHaveText('新建用户')
    
    await page.fill('input[name="username"]', 'newtestuser')
    await page.fill('input[name="email"]', 'new@test.com')
    await page.click('button:has-text("保存")')
    
    await expect(page.locator('.el-message--success')).toBeVisible()
  })

  test('should edit user', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await page.click('.edit-button:first-child')
    
    await expect(page.locator('.el-dialog__title')).toHaveText('编辑用户')
    
    await page.fill('input[name="username"]', 'updateduser')
    await page.click('button:has-text("保存")')
    
    await expect(page.locator('.el-message--success')).toBeVisible()
  })

  test('should delete user', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await page.click('.delete-button:first-child')
    
    await page.click('button:has-text("确定删除")')
    
    await expect(page.locator('.el-message--success')).toBeVisible()
  })

  test('should batch delete users', async ({ page }) => {
    await page.click('text=用户管理')
    await page.waitForURL('/admin/users')
    
    await page.check('input[type="checkbox"]:first-child')
    await page.check('input[type="checkbox"]:nth-child(3)')
    
    await page.click('button:has-text("批量删除")')
    await page.click('button:has-text("确定删除")')
    
    await expect(page.locator('.el-message--success')).toBeVisible()
  })
})

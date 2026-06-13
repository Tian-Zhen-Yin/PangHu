// e2e/admin-permissions.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Permissions E2E', () => {
  test('E2E-018: editor should not access system settings', async ({ page }) => {
    // editor 登录
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'editor')
    await page.fill('input[name="password"]', 'Editor@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // 尝试直接访问系统配置
    await page.goto('/admin/system/settings')

    // 应显示 403 或跳转
    const has403 = await page.locator('text=403').isVisible().catch(() => false)
    const hasNoPermission = await page.locator('text=无权限').isVisible().catch(() => false)
    const isRedirected = !page.url().includes('/admin/system/settings')

    expect(has403 || hasNoPermission || isRedirected).toBe(true)
  })

  test('E2E-019: delete button should be hidden for editor', async ({ page }) => {
    // editor 登录
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'editor')
    await page.fill('input[name="password"]', 'Editor@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // 访问用户列表
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    // 等待表格加载
    await page.waitForTimeout(1000)

    // 验证没有"批量删除"按钮
    const batchDeleteButton = page.locator('button:has-text("批量删除")')
    const hasBatchDelete = await batchDeleteButton.isVisible().catch(() => false)

    expect(hasBatchDelete).toBe(false)
  })

  test('E2E-020: admin should access statistics', async ({ page }) => {
    // admin 登录
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // 访问数据统计
    await page.goto('/admin/statistics')
    await page.waitForLoadState('networkidle')

    // 应正常显示
    await expect(page.locator('.page-title')).toBeVisible()
  })

  test('E2E-021: route guard should intercept unauthorized access', async ({ page }) => {
    // editor 登录
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'editor')
    await page.fill('input[name="password"]', 'Editor@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // 直接访问需要 admin 权限的页面
    await page.goto('/admin/users')

    // 应被拦截（跳转到 dashboard 或显示无权限）
    await page.waitForTimeout(1000)
    const currentUrl = page.url()
    const isDashboard = currentUrl.includes('/dashboard')
    const hasNoPermission = await page.locator('text=无权限').isVisible().catch(() => false)

    expect(isDashboard || hasNoPermission).toBe(true)
  })

  test('E2E-022: sidebar menu should be filtered for editor', async ({ page }) => {
    // editor 登录
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'editor')
    await page.fill('input[name="password"]', 'Editor@123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')

    // 等待侧边栏加载
    await page.waitForTimeout(1000)

    // 系统设置菜单不应可见
    const settingsMenu = page.locator('text=系统设置').first()
    const isVisible = await settingsMenu.isVisible().catch(() => false)

    expect(isVisible).toBe(false)
  })
})

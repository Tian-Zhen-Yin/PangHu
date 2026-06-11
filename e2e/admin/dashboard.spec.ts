// e2e/admin/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard', { timeout: 5000 })
  })

  test('should display all stat cards', async ({ page }) => {
    // Check for 4 stat cards
    const statCards = page.locator('.stat-card, .el-statistic, .data-card')
    await expect(statCards).toHaveCount(4)

    // Verify each stat card has value and label
    await expect(page.locator('.stat-value, .el-statistic__content, .data-value').first()).toBeVisible()
    await expect(page.locator('.stat-label, .el-statistic__title, .data-label').first()).toBeVisible()
  })

  test('should display charts', async ({ page }) => {
    // Check for chart container
    const chartContainer = page.locator('.chart-container, .el-card:has(.chart), canvas')
    await expect(chartContainer.first()).toBeVisible()

    // Verify chart title exists
    await expect(page.locator('.chart-title, .el-card__header').first()).toBeVisible()
  })

  test('should display recent activity logs', async ({ page }) => {
    // Check for activity logs section
    const activitySection = page.locator('text=最近操作, .activity-log, .recent-activity, .log-list')
    await expect(activitySection.first()).toBeVisible()

    // Check for log entries
    const logEntries = page.locator('.log-item, .activity-item, .el-timeline-item')
    await expect(logEntries.first()).toBeVisible()
  })

  test('should display sidebar navigation', async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator('.sidebar, .el-aside, .nav-menu, .layout-aside')
    await expect(sidebar.first()).toBeVisible()

    // Verify main navigation items exist
    const navItems = ['数据概览', '用户管理', '权限管理', '系统设置']
    for (const item of navItems) {
      const navItem = page.locator(`text=${item}, .nav-item:has-text("${item}"), .el-menu-item:has-text("${item}")`)
      await expect(navItem.first()).toBeVisible()
    }
  })

  test('should display user dropdown menu', async ({ page }) => {
    // Look for user dropdown/avatar
    const userDropdown = page.locator('.user-dropdown, .user-avatar, .el-dropdown, [class*="user"]')
    await expect(userDropdown.first()).toBeVisible()

    // Click to open dropdown menu
    await userDropdown.first().click()

    // Verify dropdown menu items
    await expect(page.locator('.el-dropdown-menu, .dropdown-menu').first()).toBeVisible()

    // Check for logout option
    const logoutOption = page.locator('text=退出登录, text=退出, .el-dropdown-menu-item:has-text("退出")')
    await expect(logoutOption.first()).toBeVisible()
  })
})

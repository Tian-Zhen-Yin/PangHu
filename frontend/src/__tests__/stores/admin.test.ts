// frontend/src/__tests__/stores/admin.test.ts
// 2026-09 对齐实现:token 初始为 null(localStorage);API 响应需带 success 包裹;
// 权限判定走 hasPermission/isAdmin/isSuperAdmin(实现无 hasPermissionSync/isEditor)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAdminStore } from '../../stores/admin'

// vi.mock 工厂会被提升到文件顶部,共享数据须经 vi.hoisted 定义
const { adminPayload } = vi.hoisted(() => ({
  adminPayload: { id: '1', username: 'admin', role: 'admin' as const, permissions: ['user.read'] },
}))

// api/admin.ts 为 named exports(store 以 `import * as adminApi` 消费),mock 需同形状
vi.mock('../../api/admin', () => ({
  login: vi.fn().mockResolvedValue({
    success: true,
    data: { token: 'test-token', refreshToken: 'test-refresh', admin: adminPayload, permissions: ['user.read'] },
  }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  getMe: vi.fn().mockResolvedValue({
    success: true,
    data: { admin: adminPayload, permissions: ['user.read'] },
  }),
}))

describe('Admin Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('初始状态:token 为 null,已认证为 false', () => {
    const store = useAdminStore()

    expect(store.token).toBeNull()
    expect(store.userInfo).toBeNull()
    expect(store.permissions).toEqual([])
    expect(store.isAuthenticated).toBe(false)
  })

  it('login 成功后写入 token/userInfo/permissions 并持久化', async () => {
    const store = useAdminStore()

    await store.login({ username: 'admin', password: 'password' })

    expect(store.token).toBe('test-token')
    expect(store.userInfo?.username).toBe('admin')
    expect(store.userInfo?.role).toBe('admin')
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem('admin_token')).toBe('test-token')
  })

  it('logout 后清空状态与 localStorage', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })

    await store.logout()

    expect(store.token).toBeNull()
    expect(store.userInfo).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('admin_token')).toBeNull()
  })

  it('loadCurrentUser 拉取用户信息与权限', async () => {
    localStorage.setItem('admin_token', 'test-token')
    const store = useAdminStore()

    await store.loadCurrentUser()

    expect(store.userInfo?.username).toBe('admin')
    expect(store.permissions).toEqual(['user.read'])
  })

  it('hasPermission 支持单个与数组(任一命中)', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })

    expect(store.hasPermission('user.read')).toBe(true)
    expect(store.hasPermission('user.delete')).toBe(false)
    expect(store.hasPermission(['user.read', 'user.delete'])).toBe(true)
  })

  it('角色判定:admin 角色 isAdmin 为 true,isSuperAdmin 为 false', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })

    expect(store.isAdmin).toBe(true)
    expect(store.isSuperAdmin).toBe(false)
  })
})

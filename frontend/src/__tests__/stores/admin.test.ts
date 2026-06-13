// frontend/src/__tests__/stores/admin.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAdminStore } from '../../stores/admin'

vi.mock('../../api/admin', () => ({
  adminApi: {
    login: vi.fn().mockResolvedValue({ data: { token: 'test-token', admin: { id: '1', username: 'admin', role: 'admin', permissions: ['user.read'] } } }),
    logout: vi.fn().mockResolvedValue({}),
    getMe: vi.fn().mockResolvedValue({ data: { admin: { id: '1', username: 'admin', role: 'admin', permissions: ['user.read'] }, permissions: ['user.read'] } }),
  },
}))

describe('Admin Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should initialize with empty state', () => {
    const store = useAdminStore()
    
    expect(store.token).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.permissions).toEqual([])
    expect(store.isAuthenticated).toBe(false)
  })

  it('should set token and user info after login', async () => {
    const store = useAdminStore()
    
    await store.login({ username: 'admin', password: 'password' })
    
    expect(store.token).toBe('test-token')
    expect(store.userInfo?.username).toBe('admin')
    expect(store.userInfo?.role).toBe('admin')
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem('admin_token')).toBe('test-token')
  })

  it('should clear state after logout', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })
    
    await store.logout()
    
    expect(store.token).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('admin_token')).toBeNull()
  })

  it('should load user info on init', async () => {
    localStorage.setItem('admin_token', 'test-token')
    const store = useAdminStore()
    
    await store.loadCurrentUser()
    
    expect(store.userInfo?.username).toBe('admin')
    expect(store.permissions).toEqual(['user.read'])
  })

  it('should check permissions correctly', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })
    
    expect(store.hasPermissionSync('user.read')).toBe(true)
    expect(store.hasPermissionSync('user.delete')).toBe(false)
    expect(store.hasPermissionSync(['user.read', 'user.delete'])).toBe(true)
  })

  it('should check roles correctly', async () => {
    const store = useAdminStore()
    await store.login({ username: 'admin', password: 'password' })
    
    expect(store.isAdmin).toBe(true)
    expect(store.isSuperAdmin).toBe(false)
    expect(store.isEditor).toBe(true)
  })
})

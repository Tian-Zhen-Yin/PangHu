import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AdminInfo,
  LoginCredentials,
  UpdateProfileRequest,
  ChangePasswordRequest,
  Permission,
  DashboardStats,
  AdminLog
} from '../types/admin'
import * as adminApi from '../api/admin'

const TOKEN_KEY = 'admin_token'
const REFRESH_TOKEN_KEY = 'admin_refresh_token'
const USER_KEY = 'admin_user'

export const useAdminStore = defineStore('admin', () => {
  // State
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))
  const userInfo = ref<AdminInfo | null>(null)
  const permissions = ref<Permission[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!userInfo.value)

  const hasPermission = computed(() => (permission: Permission | Permission[]): boolean => {
    if (!permissions.value.length) return false
    if (Array.isArray(permission)) {
      return permission.some(p => permissions.value.includes(p))
    }
    return permissions.value.includes(permission)
  })

  const hasRole = computed(() => (roles: Array<'super' | 'admin'>): boolean => {
    return userInfo.value?.role ? roles.includes(userInfo.value.role) : false
  })

  const isSuperAdmin = computed(() => userInfo.value?.role === 'super')
  const isAdmin = computed(() =>
    userInfo.value?.role === 'admin' || userInfo.value?.role === 'super'
  )

  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await adminApi.login(credentials)

      if (response.success && response.data) {
        // Save tokens and user info from response.data
        token.value = response.data.token
        refreshToken.value = response.data.refreshToken
        userInfo.value = response.data.admin
        permissions.value = response.data.permissions as Permission[]

        // Persist to localStorage
        localStorage.setItem(TOKEN_KEY, response.data.token)
        localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken)
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.admin))

        return true
      } else {
        error.value = response.message || '登录失败'
        return false
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '登录失败'
      error.value = message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await adminApi.logout()
    } catch (err) {
      // Ignore logout API errors
    } finally {
      // Clear state
      token.value = null
      refreshToken.value = null
      userInfo.value = null
      permissions.value = []

      // Clear localStorage
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)

      isLoading.value = false
    }
  }

  async function loadCurrentUser(): Promise<boolean> {
    if (!token.value) return false

    isLoading.value = true
    error.value = null

    try {
      const response = await adminApi.getMe()

      if (response.success && response.data) {
        userInfo.value = response.data.admin
        permissions.value = response.data.permissions as Permission[]

        // Update localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.admin))

        return true
      } else {
        // Token invalid, clear state
        await logout()
        return false
      }
    } catch (err) {
      // Token invalid, clear state
      await logout()
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data: UpdateProfileRequest): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await adminApi.updateProfile(data)

      if (response.success && response.data) {
        userInfo.value = response.data.admin
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.admin))
        return true
      } else {
        error.value = response.message || '更新失败'
        return false
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '更新失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(data: ChangePasswordRequest): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await adminApi.changePassword(data)

      if (response.success) {
        return true
      } else {
        error.value = response.message || '密码修改失败'
        return false
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '密码修改失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Initialize from localStorage
  function initAdmin() {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)

    if (savedToken && savedUser) {
      token.value = savedToken
      userInfo.value = JSON.parse(savedUser)

      // Verify token is still valid
      loadCurrentUser().catch(() => {
        // Token invalid, state already cleared
      })
    }
  }

  return {
    // State
    token,
    refreshToken,
    userInfo,
    permissions,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isAdmin,

    // Actions
    login,
    logout,
    loadCurrentUser,
    updateProfile,
    changePassword,
    initAdmin
  }
})

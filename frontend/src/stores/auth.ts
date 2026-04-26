import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, RegisterData, LoginData } from '../api/auth.js'
import { register as registerApi, login as loginApi, logout, getCurrentUser, updateUsername as updateUsernameApi } from '../api/auth.js'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const username = computed(() => user.value?.username || '')

  // 初始化 - 从 localStorage 恢复登录状态
  function initAuth() {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
      // 异步验证 token 是否仍然有效
      fetchCurrentUser().catch(() => {
        // 如果验证失败，fetchCurrentUser 会自动调用 clearAuth()
      })
    }
  }

  // 保存到 localStorage
  function saveAuth(userData: User, authToken: string) {
    user.value = userData
    token.value = authToken
    localStorage.setItem(TOKEN_KEY, authToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }

  // 清除认证信息
  function clearAuth() {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  // 注册
  async function register(data: RegisterData): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await registerApi(data)
      if (response.success && response.data) {
        saveAuth(response.data.user, response.data.token)
        return true
      }
      error.value = response.message || '注册失败'
      return false
    } catch (err: any) {
      error.value = err.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 登录
  async function loginAction(data: LoginData): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await loginApi(data)
      if (response.success && response.data) {
        saveAuth(response.data.user, response.data.token)
        return true
      }
      error.value = response.message || '登录失败'
      return false
    } catch (err: any) {
      error.value = err.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 登出
  async function logoutAction() {
    loading.value = true
    try {
      await logout()
    } catch (err) {
      // 忽略登出 API 错误，仍然清除本地状态
    } finally {
      clearAuth()
      loading.value = false
    }
  }

  // 获取当前用户信息
  async function fetchCurrentUser(): Promise<boolean> {
    if (!token.value) return false

    loading.value = true
    try {
      const response = await getCurrentUser()
      if (response.success && response.data) {
        user.value = response.data
        localStorage.setItem(USER_KEY, JSON.stringify(response.data))
        return true
      }
      // token 无效，清除认证信息
      clearAuth()
      return false
    } catch (err) {
      clearAuth()
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新用户名
  async function updateUsernameAction(newUsername: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await updateUsernameApi(newUsername)
      if (response.success && response.data) {
        user.value = response.data
        localStorage.setItem(USER_KEY, JSON.stringify(response.data))
        return true
      }
      error.value = response.message || '更新用户名失败'
      return false
    } catch (err: any) {
      error.value = err.message || '更新用户名失败'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    username,
    initAuth,
    register,
    loginAction,
    logoutAction,
    fetchCurrentUser,
    updateUsernameAction
  }
})

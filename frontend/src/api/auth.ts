import api from './index'
import type { ApiResponse } from '../types/common'

export interface User {
  id: string
  email: string
  username: string
  memberType: string // 'free' | 'premium'
  memberExpiredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface LoginData {
  account: string  // 邮箱或用户名
  password: string
}

/**
 * 用户注册
 */
export function register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
  return api.post('/auth/register', data)
}

/**
 * 用户登录
 */
export function login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
  return api.post('/auth/login', data)
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): Promise<ApiResponse<User>> {
  return api.get('/auth/me')
}

/**
 * 更新用户名
 */
export function updateUsername(username: string): Promise<ApiResponse<User>> {
  return api.patch('/auth/username', { username })
}

/**
 * 登出
 */
export function logout(): Promise<ApiResponse<null>> {
  return api.post('/auth/logout')
}

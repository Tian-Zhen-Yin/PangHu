import axios from 'axios'
import type {
  LoginCredentials,
  LoginResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DashboardStats,
  AdminLog,
  AdminInfo
} from '../types/admin'
import type { ApiResponse } from '../types/common'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// TypeScript declaration for _retry property
interface InternalAxiosRequestConfig {
  _retry?: boolean
}

// Create axios instance for admin API
const adminApi = axios.create({
  baseURL: `${API_BASE}/admin`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('admin_refresh_token')
      if (refreshToken) {
        try {
          // Try to refresh token
          const response = await axios.post(`${API_BASE}/admin/refresh`, {
            refreshToken
          })

          // Add proper error handling for response structure
          if (!response.data?.success || !response.data?.data?.token) {
            throw new Error('Token refresh failed')
          }

          const { token } = response.data.data
          localStorage.setItem('admin_token', token)

          // Retry original request
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${token}`
          return adminApi(originalRequest)
        } catch {
          // Refresh failed, return rejection with metadata
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_refresh_token')
          return Promise.reject({ type: 'AUTH_EXPIRED', redirect: '/admin/login', originalError: error })
        }
      } else {
        // No refresh token, return rejection with metadata
        localStorage.removeItem('admin_token')
        return Promise.reject({ type: 'AUTH_EXPIRED', redirect: '/admin/login', originalError: error })
      }
    }

    return Promise.reject(error)
  }
)

// Auth APIs
export async function login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
  const response = await adminApi.post<ApiResponse<LoginResponse>>('/login', credentials)
  return response.data
}

export async function logout(): Promise<ApiResponse<null>> {
  const response = await adminApi.post<ApiResponse<null>>('/logout')
  return response.data
}

export async function getMe(): Promise<ApiResponse<{ admin: AdminInfo; permissions: string[] }>> {
  const response = await adminApi.get<ApiResponse<{ admin: AdminInfo; permissions: string[] }>>('/me')
  return response.data
}

export async function updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<{ admin: AdminInfo }>> {
  const response = await adminApi.put<ApiResponse<{ admin: AdminInfo }>>('/me', data)
  return response.data
}

export async function changePassword(data: ChangePasswordRequest): Promise<ApiResponse<null>> {
  const response = await adminApi.put<ApiResponse<null>>('/me/password', data)
  return response.data
}

// Dashboard APIs
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const response = await adminApi.get<ApiResponse<DashboardStats>>('/dashboard/stats')
  return response.data
}

export async function getRecentLogs(limit: number = 5): Promise<ApiResponse<AdminLog[]>> {
  const response = await adminApi.get<ApiResponse<AdminLog[]>>('/dashboard/logs', {
    params: { limit }
  })
  return response.data
}

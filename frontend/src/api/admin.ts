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

// Guide Management APIs
export interface GuideListParams {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
}

export interface Guide {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  coverImage?: string
  categoryId: string
  category: {
    id: string
    name: string
    slug: string
  }
  tags?: string[]
  viewCount: number
  createdAt: string
  updatedAt: string
  _count?: {
    chunks: number
  }
}

export interface GuideCategory {
  id: string
  name: string
  slug: string
  icon?: string
  description?: string
  order: number
  _count?: {
    guides: number
  }
}

export interface PaginatedGuides {
  items: Guide[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export async function getGuides(params: GuideListParams): Promise<ApiResponse<PaginatedGuides>> {
  const response = await adminApi.get<ApiResponse<PaginatedGuides>>('/guides', { params })
  return response.data
}

export async function getGuideById(id: string): Promise<ApiResponse<Guide>> {
  const response = await adminApi.get<ApiResponse<Guide>>(`/guides/${id}`)
  return response.data
}

export async function createGuide(data: Partial<Guide>): Promise<ApiResponse<Guide>> {
  const response = await adminApi.post<ApiResponse<Guide>>('/guides', data)
  return response.data
}

export async function updateGuide(id: string, data: Partial<Guide>): Promise<ApiResponse<Guide>> {
  const response = await adminApi.put<ApiResponse<Guide>>(`/guides/${id}`, data)
  return response.data
}

export async function deleteGuide(id: string): Promise<ApiResponse<null>> {
  const response = await adminApi.delete<ApiResponse<null>>(`/guides/${id}`)
  return response.data
}

export async function getGuideCategories(): Promise<ApiResponse<GuideCategory[]>> {
  const response = await adminApi.get<ApiResponse<GuideCategory[]>>('/guides/categories')
  return response.data
}

export async function ingestGuide(id: string): Promise<ApiResponse<{ guideId: string }>> {
  const response = await adminApi.post<ApiResponse<{ guideId: string }>>(`/guides/${id}/ingest`)
  return response.data
}

export async function ingestAllGuides(): Promise<ApiResponse<{ count: number }>> {
  const response = await adminApi.post<ApiResponse<{ count: number }>>('/guides/ingest-all')
  return response.data
}

// Template Management APIs
export interface TemplateListParams {
  page?: number
  pageSize?: number
  category?: string
  keyword?: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  stageId?: string | null
  content: any
  createdAt: string
  updatedAt: string
}

export interface TemplateCategory {
  name: string
  count: number
}

export interface TemplateStage {
  id: string
  name: string
  ageRange: string
  order: number
}

export interface PaginatedTemplates {
  items: Template[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export async function getTemplates(params: TemplateListParams): Promise<ApiResponse<PaginatedTemplates>> {
  const response = await adminApi.get<ApiResponse<PaginatedTemplates>>('/templates', { params })
  return response.data
}

export async function getTemplateById(id: string): Promise<ApiResponse<Template>> {
  const response = await adminApi.get<ApiResponse<Template>>(`/templates/${id}`)
  return response.data
}

export async function createTemplate(data: Partial<Template>): Promise<ApiResponse<Template>> {
  const response = await adminApi.post<ApiResponse<Template>>('/templates', data)
  return response.data
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<ApiResponse<Template>> {
  const response = await adminApi.put<ApiResponse<Template>>(`/templates/${id}`, data)
  return response.data
}

export async function deleteTemplate(id: string): Promise<ApiResponse<null>> {
  const response = await adminApi.delete<ApiResponse<null>>(`/templates/${id}`)
  return response.data
}

export async function getTemplateCategories(): Promise<ApiResponse<TemplateCategory[]>> {
  const response = await adminApi.get<ApiResponse<TemplateCategory[]>>('/templates/categories')
  return response.data
}

export async function getTemplateStages(): Promise<ApiResponse<TemplateStage[]>> {
  const response = await adminApi.get<ApiResponse<TemplateStage[]>>('/templates/stages')
  return response.data
}

// User Management APIs
export interface UserListParams {
  page?: number
  pageSize?: number
  keyword?: string
  memberType?: string
  status?: string
}

export interface User {
  id: string
  username: string
  email: string
  memberType: string
  memberExpiredAt?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    cats: number
    plans: number
    conversations: number
  }
}

export interface UserStats {
  totalUsers: number
  freeUsers: number
  premiumUsers: number
  newUsersThisMonth: number
  activeUsers: number
  premiumRate: string
}

export interface PaginatedUsers {
  items: User[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export async function getUsers(params: UserListParams): Promise<ApiResponse<PaginatedUsers>> {
  const response = await adminApi.get<ApiResponse<PaginatedUsers>>('/users', { params })
  return response.data
}

export async function getUserById(id: string): Promise<ApiResponse<User>> {
  const response = await adminApi.get<ApiResponse<User>>(`/users/${id}`)
  return response.data
}

export async function updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
  const response = await adminApi.put<ApiResponse<User>>(`/users/${id}`, data)
  return response.data
}

export async function deleteUser(id: string): Promise<ApiResponse<null>> {
  const response = await adminApi.delete<ApiResponse<null>>(`/users/${id}`)
  return response.data
}

export async function resetUserPassword(id: string): Promise<ApiResponse<{ tempPassword: string }>> {
  const response = await adminApi.post<ApiResponse<{ tempPassword: string }>>(`/users/${id}/reset-password`)
  return response.data
}

export async function toggleUserStatus(id: string, data: { memberType: string }): Promise<ApiResponse<User>> {
  const response = await adminApi.post<ApiResponse<User>>(`/users/${id}/toggle-status`, data)
  return response.data
}

export async function getUserStats(): Promise<ApiResponse<UserStats>> {
  const response = await adminApi.get<ApiResponse<UserStats>>('/users/stats')
  return response.data
}

export async function exportUsers(format: 'json' | 'csv' = 'json'): Promise<any> {
  const response = await adminApi.get('/users/export', {
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json',
  })
  return response.data
}

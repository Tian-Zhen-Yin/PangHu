// Admin info
export interface AdminInfo {
  id: string
  username: string
  email?: string
  name?: string
  role: 'super' | 'admin'
  avatar?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

// Permissions
export type Permission =
  | 'user.read' | 'user.create' | 'user.update' | 'user.delete' | 'user.toggle' | 'user.export'
  | 'cat.read' | 'cat.update' | 'cat.delete'
  | 'guide.read' | 'guide.create' | 'guide.update' | 'guide.delete' | 'guide.sync'
  | 'template.read' | 'template.create' | 'template.update' | 'template.delete'
  | 'statistics.view'
  | 'config.read' | 'config.update' | 'log.read' | 'log.delete'

// Login credentials
export interface LoginCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

// Login response
export interface LoginResponse {
  token: string
  refreshToken: string
  admin: AdminInfo
  permissions: Permission[]
}

// Update profile request
export interface UpdateProfileRequest {
  name?: string
  email?: string
}

// Change password request
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number
  totalCats: number
  totalGuides: number
  todayChats: number
  userGrowth: number[]
  catBreeds: CatBreedDistribution[]
}

export interface CatBreedDistribution {
  name: string
  value: number
}

// Admin log
export interface AdminLog {
  id: string
  adminId?: string
  admin?: {
    username: string
    name?: string
  }
  action: string
  module: string
  targetId?: string
  detail?: string
  ip?: string
  userAgent?: string
  createdAt: string
}

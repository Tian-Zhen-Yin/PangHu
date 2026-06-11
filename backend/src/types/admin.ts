import { Admin, AdminLog } from '@prisma/client'

// Admin types
export interface AdminInfo {
  id: string
  username: string
  email: string | null
  name: string | null
  role: 'super' | 'admin'
  avatar: string | null
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type AdminResponse = Omit<AdminInfo, 'password'>

export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  token: string
  refreshToken: string
  admin: AdminResponse
  permissions: Permission[]
}

export interface UpdateAdminRequest {
  name?: string
  email?: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

// AdminLog types
export interface AdminLogInfo {
  id: string
  adminId: string | null
  action: string
  module: string
  targetId: string | null
  detail: string | null
  ip: string | null
  userAgent: string | null
  createdAt: Date
}

export type AdminLogResponse = AdminLogInfo

export interface CreateAdminLogRequest {
  action: string
  module: string
  targetId?: string
  detail?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

// Dashboard types
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

// Permissions
export type Permission =
  // User management
  | 'user.read' | 'user.create' | 'user.update' | 'user.delete' | 'user.toggle' | 'user.export'
  // Cat management
  | 'cat.read' | 'cat.update' | 'cat.delete'
  // Guide management
  | 'guide.read' | 'guide.create' | 'guide.update' | 'guide.delete' | 'guide.sync'
  // Template management
  | 'template.read' | 'template.create' | 'template.update' | 'template.delete'
  // Statistics
  | 'statistics.view'
  // System config
  | 'config.read' | 'config.update' | 'log.read' | 'log.delete'

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super: [
    // All permissions
    'user.read', 'user.create', 'user.update', 'user.delete', 'user.toggle', 'user.export',
    'cat.read', 'cat.update', 'cat.delete',
    'guide.read', 'guide.create', 'guide.update', 'guide.delete', 'guide.sync',
    'template.read', 'template.create', 'template.update', 'template.delete',
    'statistics.view',
    'config.read', 'config.update', 'log.read', 'log.delete'
  ],
  admin: [
    // All except system config modification
    'user.read', 'user.create', 'user.update', 'user.delete', 'user.toggle', 'user.export',
    'cat.read', 'cat.update', 'cat.delete',
    'guide.read', 'guide.create', 'guide.update', 'guide.delete', 'guide.sync',
    'template.read', 'template.create', 'template.update', 'template.delete',
    'statistics.view',
    'config.read', 'log.read'
  ]
}

// JWT payload for admin
export interface AdminJwtPayload {
  adminId: string
  username: string
  role: string
  type: 'access' | 'refresh'
}

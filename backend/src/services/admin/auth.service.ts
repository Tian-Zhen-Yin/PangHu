import prisma from '../../config/database'
import { comparePassword, hashPassword } from '../../utils/password'
import { generateAdminAccessToken, generateAdminRefreshToken } from '../../utils/adminJwt'
import type { LoginRequest, LoginResponse, AdminResponse } from '../../types/admin'
import { ROLE_PERMISSIONS } from '../../types/admin'

/**
 * Map Prisma Admin to AdminResponse (excluding password)
 */
function toAdminResponse(admin: any): AdminResponse {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    name: admin.name,
    role: admin.role as 'super' | 'admin',
    avatar: admin.avatar,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  }
}

/**
 * Validate admin credentials
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<AdminResponse | null> {
  const admin = await prisma.admin.findUnique({
    where: { username }
  })

  if (!admin) {
    // Still perform password comparison to prevent timing attacks
    await comparePassword(password, '$2b$10$dummyHashForTimingAttackPrevention')
    return null
  }
  if (!admin.isActive) return null

  const isValid = await comparePassword(password, admin.password)
  if (!isValid) return null

  return toAdminResponse(admin)
}

/**
 * Login admin and generate tokens
 */
export async function loginAdmin(
  data: LoginRequest,
  ip: string,
  userAgent: string
): Promise<LoginResponse> {
  // Validate credentials
  const admin = await validateCredentials(data.username, data.password)
  if (!admin) {
    throw new Error('INVALID_CREDENTIALS')
  }

  // Update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() }
  })

  // Generate tokens
  const token = generateAdminAccessToken({
    adminId: admin.id,
    username: admin.username,
    role: admin.role
  })

  const refreshToken = generateAdminRefreshToken({
    adminId: admin.id,
    username: admin.username,
    role: admin.role
  })

  // Get permissions
  const permissions = ROLE_PERMISSIONS[admin.role] || []

  // Create login log
  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: 'login',
      module: 'auth',
      ip,
      userAgent
    }
  })

  return {
    token,
    refreshToken,
    admin,
    permissions
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(adminId: string): Promise<AdminResponse | null> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  if (!admin) return null

  return toAdminResponse(admin)
}

/**
 * Update admin profile
 */
export async function updateAdmin(
  adminId: string,
  data: { name?: string; email?: string }
): Promise<AdminResponse> {
  const admin = await prisma.admin.update({
    where: { id: adminId },
    data
  })

  return toAdminResponse(admin)
}

/**
 * Change admin password
 */
export async function changePassword(
  adminId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  if (!admin) throw new Error('ADMIN_NOT_FOUND')

  const isValid = await comparePassword(oldPassword, admin.password)
  if (!isValid) throw new Error('INVALID_PASSWORD')

  // Hash the new password before storing
  const hashedPassword = await hashPassword(newPassword)

  await prisma.admin.update({
    where: { id: adminId },
    data: { password: hashedPassword }
  })
}

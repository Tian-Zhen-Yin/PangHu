/**
 * 格式化体重数据，保留两位小数
 * @param weight 体重值（kg）
 * @returns 格式化后的体重字符串，如 "3.50kg"
 */
export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) {
    return '未知'
  }
  return `${weight.toFixed(2)}kg`
}

/**
 * 格式化体重为纯数字字符串，保留两位小数
 * @param weight 体重值（kg）
 * @returns 格式化后的体重字符串，如 "3.50"
 */
export function formatWeightValue(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) {
    return '0.00'
  }
  return weight.toFixed(2)
}

/**
 * 构建猫咪头像URL，使用相对路径以通过Vite代理（避免CORP跨域问题）
 */
export function getAvatarUrl(cat: { avatarData?: string | null; avatar?: string | null }): string {
  if (cat.avatarData) return cat.avatarData
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  if (cat.avatar.startsWith('/')) return cat.avatar
  return `/${cat.avatar}`
}

/**
 * 构建通用图片URL（用于照片、记录图片等）
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (path.startsWith('data:')) return path
  if (path.startsWith('/')) return path
  return `/${path}`
}

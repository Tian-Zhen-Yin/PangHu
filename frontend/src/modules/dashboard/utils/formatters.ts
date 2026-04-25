import type { Cat } from '@/types/cat'

export function formatWeight(value?: number | string): string {
  if (value === undefined || value === null) return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return String(value)
  return String(parseFloat(num.toFixed(2)))
}

export function getWeightValue(record: { weight?: number; title: string }): string {
  if (record.weight !== undefined && record.weight !== null) {
    return formatWeight(record.weight)
  }
  if (record.title.includes(':')) {
    const parts = record.title.split(':')
    if (parts.length > 1) {
      const value = parts[1].trim().replace('kg', '').trim()
      return formatWeight(value)
    }
  }
  return record.title
}

export function getAgeText(cat: Cat): string {
  if (!cat.birthDate) return '年龄未知'
  const birth = new Date(cat.birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return '新生'
  if (months < 12) return `${months} 个月`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} 岁`
  return `${years} 岁 ${remainingMonths} 个月`
}

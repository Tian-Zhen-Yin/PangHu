import type { Cat } from '../../../types/cat'

export interface DashboardReminder {
  id: string
  type: 'vaccine' | 'weight' | 'general'
  title: string
  description: string
  icon: string
  urgency: 'high' | 'medium' | 'low'
}

export interface DashboardCatCard {
  cat: Cat
  ageText: string
  lastRecord?: {
    type: string
    date: string
  }
}

export interface DashboardQuickAction {
  id: string
  label: string
  icon: string
  path: string
  color: string
}

export interface DashboardRecentRecord {
  id: string
  catId: string
  catName: string
  type: string              // 视觉类型（用于 CSS 样式）
  originalType?: string     // 原始 API 类型
  title: string
  date: string
  rawDate?: string          // 原始日期（用于时间分组）
  icon: string
  weight?: number           // 体重值
  weightChange?: {          // 体重变化
    value: number
    direction: 'up' | 'down' | 'stable'
  }
  notes?: string            // 日记备注
  photos?: string[]         // 照片数组
  isAdoptionDay?: boolean   // 是否为领养日/纪念日
}

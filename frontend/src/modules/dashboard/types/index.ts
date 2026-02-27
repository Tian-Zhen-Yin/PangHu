import type { Cat } from '@/types/cat'

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
  type: string
  title: string
  date: string
  icon: string
}

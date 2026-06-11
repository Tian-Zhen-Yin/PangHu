import type { DashboardStats } from '../../types/admin'

/**
 * Get dashboard statistics (mock data for Phase 1)
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: Replace with real queries in Phase 3
  return {
    totalUsers: 1234,
    totalCats: 856,
    totalGuides: 42,
    todayChats: 128,
    userGrowth: [10, 15, 22, 18, 25, 30], // Last 6 months
    catBreeds: [
      { name: '英短', value: 335 },
      { name: '美短', value: 234 },
      { name: '田园', value: 154 },
      { name: '布偶', value: 98 },
      { name: '其他', value: 35 }
    ]
  }
}

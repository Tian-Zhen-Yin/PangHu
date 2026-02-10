// 知识指南相关类型定义

/**
 * 指南分类
 */
export interface GuideCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  order: number
}

/**
 * 知识指南
 */
export interface Guide {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  coverImage: string | null
  viewCount: number
  categoryId: string
  category?: GuideCategory
  tags?: string[]
}

import prisma from '../config/database'

/**
 * 知识指南摘要
 */
export interface GuideSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  category: {
    id: string
    name: string
    slug: string
  }
}

/**
 * 知识检索结果
 */
export interface KnowledgeResult {
  guides: GuideSummary[]
  context: string
}

/**
 * 关键词提取
 * 从用户问题中提取关键词用于检索
 */
function extractKeywords(query: string): string[] {
  // 移除常见的无意义词
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']

  // 分词（简单按空格和常见标点分割）
  const words = query
    .replace(/[，。！？、；：""''（）【】《》\s]/g, ' ')
    .split(' ')
    .filter(word => word.length > 1 && !stopWords.includes(word))

  // 如果没有提取到关键词，返回整个查询
  if (words.length === 0) {
    return [query]
  }

  return words
}

/**
 * 搜索相关知识指南
 * @param query 用户查询
 * @param limit 返回结果数量限制
 */
export async function searchGuides(query: string, limit = 5): Promise<GuideSummary[]> {
  const keywords = extractKeywords(query)

  // 使用 Prisma 的 contains 进行模糊搜索
  // SQLite 支持中文的 contains 查询
  const guides = await prisma.guide.findMany({
    where: {
      OR: keywords.map(keyword => ({
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } }
        ]
      }))
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    take: limit
  })

  return guides.map(guide => ({
    id: guide.id,
    title: guide.title,
    slug: guide.slug,
    excerpt: guide.excerpt || guide.content.substring(0, 200) + '...',
    category: guide.category
  }))
}

/**
 * 获取相关知识并构建上下文
 * @param query 用户查询
 */
export async function getKnowledgeContext(query: string): Promise<KnowledgeResult> {
  const guides = await searchGuides(query, 3)

  // 构建知识上下文
  const contextParts: string[] = []

  if (guides.length > 0) {
    contextParts.push('## 参考知识库\n')

    guides.forEach((guide, index) => {
      contextParts.push(`### ${index + 1}. ${guide.title}`)
      contextParts.push(`分类: ${guide.category.name}`)
      contextParts.push(`> ${guide.excerpt}`)
      contextParts.push('')
    })

    contextParts.push('\n请基于以上知识库内容回答问题，并在回复时标注参考来源。')
  } else {
    contextParts.push('未找到相关知识库条目，请基于你的专业知识回答。')
  }

  return {
    guides,
    context: contextParts.join('\n')
  }
}

/**
 * 根据分类获取指南
 */
export async function getGuidesByCategory(categorySlug: string, limit = 10): Promise<GuideSummary[]> {
  const guides = await prisma.guide.findMany({
    where: {
      category: {
        slug: categorySlug
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    take: limit,
    orderBy: {
      viewCount: 'desc'
    }
  })

  return guides.map(guide => ({
    id: guide.id,
    title: guide.title,
    slug: guide.slug,
    excerpt: guide.excerpt || guide.content.substring(0, 200) + '...',
    category: guide.category
  }))
}

/**
 * 获取热门指南
 */
export async function getPopularGuides(limit = 10): Promise<GuideSummary[]> {
  const guides = await prisma.guide.findMany({
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    take: limit,
    orderBy: {
      viewCount: 'desc'
    }
  })

  return guides.map(guide => ({
    id: guide.id,
    title: guide.title,
    slug: guide.slug,
    excerpt: guide.excerpt || guide.content.substring(0, 200) + '...',
    category: guide.category
  }))
}

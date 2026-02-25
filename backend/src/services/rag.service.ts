/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 负责知识库的构建、索引和检索
 */

import { PrismaClient } from '@prisma/client'
import { chunkMarkdown, extractGuideMetadata, type Chunk } from './chunker.service'
import { getEmbeddings, findMostSimilar, deserializeVector, serializeVector, cosineSimilarity } from './embedding.service'

const prisma = new PrismaClient()

export interface RetrievedChunk {
  id: string
  guideId: string
  content: string
  score: number
  metadata: {
    title?: string
    category: string
    ageStage?: string
    headings: string[]
  }
}

export interface Citation {
  guideId: string
  title: string
  similarity: number
  chunkId?: string
}

/**
 * 知识入库：将指南文档切分并向量化后存储
 */
export async function ingestGuide(
  guideId: string,
  apiKey: string,
  options?: { maxChunkSize?: number; overlap?: number }
): Promise<{ chunks: number; error?: string }> {
  try {
    // 1. 获取指南文档
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: { category: true }
    })

    if (!guide) {
      return { chunks: 0, error: '指南不存在' }
    }

    // 2. 删除旧的 chunks
    await prisma.guideChunk.deleteMany({
      where: { guideId }
    })

    // 3. 切分文档
    const chunks = chunkMarkdown(guide.content, options)

    if (chunks.length === 0) {
      return { chunks: 0, error: '文档切分失败，未生成任何块' }
    }

    // 4. 提取元数据
    const metadata = extractGuideMetadata(guide.content)

    // 5. 批量向量化
    const texts = chunks.map(c => c.content)
    const embeddings = await getEmbeddings(texts, apiKey)

    // 6. 存储到数据库
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      await prisma.guideChunk.create({
        data: {
          guideId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          category: metadata.category,
          ageStage: metadata.ageStage,
          headings: JSON.stringify(chunk.headings),
          embedding: serializeVector(embedding)
        }
      })
    }

    return { chunks: chunks.length }
  } catch (error: any) {
    console.error('Knowledge ingestion error:', error)
    return { chunks: 0, error: error.message }
  }
}

/**
 * 批量知识入库：处理所有指南
 */
export async function ingestAllGuides(apiKey: string): Promise<{
  success: number
  failed: number
  errors: Array<{ guideId: string; title: string; error: string }>
}> {
  const guides = await prisma.guide.findMany({
    include: { category: true }
  })

  const errors: Array<{ guideId: string; title: string; error: string }> = []
  let success = 0
  let failed = 0

  for (const guide of guides) {
    try {
      console.log(`Processing guide: ${guide.title}`)
      const result = await ingestGuide(guide.id, apiKey)

      if (result.error) {
        errors.push({ guideId: guide.id, title: guide.title, error: result.error })
        failed++
      } else {
        console.log(`  - Created ${result.chunks} chunks`)
        success++
      }
    } catch (error: any) {
      errors.push({ guideId: guide.id, title: guide.title, error: error.message })
      failed++
    }
  }

  return { success, failed, errors }
}

/**
 * 知识检索：根据查询返回最相关的知识块
 */
export async function retrieveKnowledge(
  query: string,
  apiKey: string,
  options?: {
    topK?: number
    category?: string
    ageStage?: string
    minScore?: number
  }
): Promise<{ chunks: RetrievedChunk[]; citations: Citation[] }> {
  const {
    topK = 3,
    category,
    ageStage,
    minScore = 0.6
  } = options || {}

  try {
    // 1. 向量化查询
    const queryEmbedding = await getEmbeddings([query], apiKey)
    const queryVector = queryEmbedding[0]

    // 2. 从数据库获取所有 chunks（带过滤条件）
    const where: any = {}
    if (category) where.category = category
    if (ageStage) where.ageStage = ageStage

    const chunks = await prisma.guideChunk.findMany({
      where,
      include: { guide: true }
    })

    if (chunks.length === 0) {
      return { chunks: [], citations: [] }
    }

    // 3. 计算相似度
    const scored = chunks.map(chunk => {
      const embedding = chunk.embedding ? deserializeVector(chunk.embedding) : []
      const score = embedding.length > 0 ? cosineSimilarity(queryVector, embedding) : 0

      return {
        id: chunk.id,
        guideId: chunk.guideId,
        content: chunk.content,
        score,
        metadata: {
          title: chunk.guide.title,
          category: chunk.category,
          ageStage: chunk.ageStage || undefined,
          headings: chunk.headings ? JSON.parse(chunk.headings) : []
        }
      } as RetrievedChunk
    })

    // 4. 排序并取 Top-K
    const topChunks = scored
      .filter(c => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    // 5. 生成引用列表（去重，按 guideId 聚合）
    const citationMap = new Map<string, Citation>()

    for (const chunk of topChunks) {
      if (!citationMap.has(chunk.guideId) || citationMap.get(chunk.guideId)!.similarity < chunk.score) {
        citationMap.set(chunk.guideId, {
          guideId: chunk.guideId,
          title: chunk.metadata.title || '未知指南',
          similarity: chunk.score,
          chunkId: chunk.id
        })
      }
    }

    const citations = Array.from(citationMap.values())
      .sort((a, b) => b.similarity - a.similarity)

    return { chunks: topChunks, citations }
  } catch (error: any) {
    console.error('Knowledge retrieval error:', error)
    return { chunks: [], citations: [] }
  }
}

/**
 * 构建增强后的 Prompt
 */
export function buildRAGPrompt(
  userQuery: string,
  retrievedChunks: RetrievedChunk[],
  chatHistory: Array<{ role: string; content: string }> = []
): string {
  // 系统人设
  const systemPrompt = `你是一位专业的猫咪医疗顾问和养护专家，名叫"喵喵医生"。

## 你的角色
- 专业、耐心、友好的猫咪医师
- 拥有丰富的猫咪医疗、行为、营养知识
- 基于科学证据给出建议，不传播谣言
- 遇到严重问题建议及时就医

## 回答原则
1. 优先使用提供的专业知识库内容
2. 结构化回答，使用列表和标题
3. 健康问题务必提示"建议就医"
4. 引用知识库来源
5. 语气温和，使用"您"称呼

## 紧急情况处理
以下症状立即建议就医：
- 呼吸困难、无法排尿
- 持续呕吐/腹泻超过24小时
- 体温异常、持续不食超过24小时

---

以下是相关的知识库内容：

`

  // 添加检索到的知识
  const knowledgeContext = retrievedChunks
    .map((chunk, i) => {
      const source = chunk.metadata.title
      const headings = chunk.metadata.headings.length > 0
        ? ` [${chunk.metadata.headings.join(' > ')}]`
        : ''
      return `【参考资料 ${i + 1}】${source}${headings}\n${chunk.content}`
    })
    .join('\n\n')

  // 对话历史上下文
  const historyContext = chatHistory
    .slice(-4) // 只保留最近4轮对话
    .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
    .join('\n')

  // 组装完整 prompt
  const fullPrompt = `${systemPrompt}${knowledgeContext}

---

${historyContext ? `## 历史对话\n${historyContext}\n\n` : ''}## 当前问题
用户：${userQuery}

请根据以上知识库内容回答用户的问题。如果知识库中没有相关信息，请基于你的专业知识给出建议，但务必说明这是基于一般经验的建议。`

  return fullPrompt
}

/**
 * 检查知识库状态
 */
export async function getKnowledgeStatus(): Promise<{
  totalGuides: number
  totalChunks: number
  chunkedGuides: number
  categories: Array<{ category: string; count: number }>
}> {
  const [totalGuides, totalChunks, chunkedGuides, categoryStats] = await Promise.all([
    prisma.guide.count(),
    prisma.guideChunk.count(),
    prisma.guideChunk.groupBy({ by: ['guideId'], _count: true }).then(r => r.length),
    prisma.guideChunk.groupBy({
      by: ['category'],
      _count: true
    }).then(results => results.map(r => ({ category: r.category, count: r._count })))
  ])

  return {
    totalGuides,
    totalChunks,
    chunkedGuides,
    categories: categoryStats
  }
}

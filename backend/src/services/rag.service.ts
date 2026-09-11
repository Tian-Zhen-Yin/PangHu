/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 负责知识库的构建、索引和检索
 */

import prisma from '../config/database'
import { Prisma } from '@prisma/client'
import { chunkMarkdown, extractGuideMetadata, type Chunk } from './chunker.service'
import { getEmbeddings, findMostSimilar, deserializeVector, serializeVector, cosineSimilarity } from './embedding.service'
import crypto from 'crypto'


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

    // 5.1 检测零向量：getEmbeddings 在批次失败时会返回全零向量（见 embedding.service.ts:130-136）
    //     若大量失败则中止入库，避免污染向量数据库（污染后只能整库重建）
    const validCount = embeddings.filter(v => v.some(x => x !== 0)).length
    if (validCount < embeddings.length) {
      const failed = embeddings.length - validCount
      console.warn(`[ingestGuide] ${guideId}: ${failed}/${embeddings.length} 个 chunk 向量化失败`)
      // 阈值：超过 20% 失败则整体放弃，避免写入坏数据
      if (validCount < embeddings.length * 0.8) {
        return {
          chunks: 0,
          error: `向量化失败率过高 (${failed}/${embeddings.length})，已中止入库以保护数据完整性`
        }
      }
    }

    // 6. 存储到数据库（使用原始 SQL 插入向量）
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      // 5.2 跳过零向量条目，宁可少存也不存坏数据
      if (!embedding.some(x => x !== 0)) {
        console.warn(`[ingestGuide] 跳过 chunk #${i}（零向量）: "${chunk.content.slice(0, 30)}..."`)
        continue
      }

      const vectorString = `[${embedding.join(',')}]`

      await prisma.$queryRaw`
        INSERT INTO "GuideChunk" (
          id,
          "guideId",
          content,
          "chunkIndex",
          category,
          "ageStage",
          headings,
          embedding
        ) VALUES (
          ${crypto.randomUUID()},
          ${guideId},
          ${chunk.content},
          ${chunk.chunkIndex},
          ${metadata.category},
          ${metadata.ageStage},
          ${JSON.stringify(chunk.headings)},
          ${vectorString}::vector
        )
      `
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
): Promise<{ chunks: RetrievedChunk[]; citations: Citation[]; error?: string }> {
  const { topK = 3, category, ageStage, minScore = 0.6 } = options || {}

  try {
    const queryEmbedding = await getEmbeddings([query], apiKey)
    const queryVector = queryEmbedding[0]

    // 检测查询向量是否为零向量（getEmbeddings 失败 fallback）
    // 零向量做 cosine 排序结果毫无意义，直接走空结果而不是返回噪声
    if (!queryVector || !queryVector.some(x => x !== 0)) {
      console.warn('[retrieveKnowledge] 查询向量化失败（返回零向量），跳过检索')
      return {
        chunks: [],
        citations: [],
        error: '查询向量化失败，知识检索暂不可用'
      }
    }

    const vectorString = `[${queryVector.join(',')}]`

    // ✅ 条件过滤：用 Prisma.sql 拼接，安全且灵活
    const categoryFilter = category
      ? Prisma.sql`AND ch.category = ${category}`
      : Prisma.sql``

    const ageStageFilter = ageStage
      ? Prisma.sql`AND ch."ageStage" = ${ageStage}`
      : Prisma.sql``

    const rows = await prisma.$queryRaw<Array<{
      id: string
      guideId: string
      content: string
      score: number
      title: string
      category: string
      ageStage: string | null
      headings: string
    }>>`
      SELECT
        ch.id,
        ch."guideId",
        ch.content,
        1 - (ch.embedding <=> ${vectorString}::vector) AS score,
        g.title,
        ch.category,
        ch."ageStage",
        ch.headings
      FROM "GuideChunk" ch
      JOIN "Guide" g ON ch."guideId" = g.id
      WHERE ch.embedding IS NOT NULL
        ${categoryFilter}
        ${ageStageFilter}
      ORDER BY ch.embedding <=> ${vectorString}::vector
      LIMIT ${topK}
    `

    const topChunks: RetrievedChunk[] = rows
      .filter(row => Number(row.score) >= minScore)
      .map(row => {
        let headings: string[] = []
        if (row.headings) {
          try {
            headings = JSON.parse(row.headings)
          } catch (error) {
            console.warn(`Failed to parse headings for chunk ${row.id}:`, error)
            headings = []
          }
        }
        return {
          id: row.id,
          guideId: row.guideId,
          content: row.content,
          score: Number(row.score),
          metadata: {
            title: row.title,
            category: row.category,
            ageStage: row.ageStage ?? undefined,
            headings
          }
        }
      })

    const citationMap = new Map<string, Citation>()
    for (const chunk of topChunks) {
      if (!citationMap.has(chunk.guideId) ||
          citationMap.get(chunk.guideId)!.similarity < chunk.score) {
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

    return { chunks: topChunks, citations, error: undefined }

  } catch (error: any) {
    console.error('Knowledge retrieval error:', error)
    return { chunks: [], citations: [], error: error.message }
  }
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

/**
 * 向量嵌入服务
 * 使用智谱 AI 的 Embedding API 将文本转化为向量
 */

import axios from 'axios'
import https from 'https'

// 创建忽略证书验证的 https agent（仅用于开发环境）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
})

const EMBEDDING_API_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings'
const EMBEDDING_MODEL = 'embedding-3'

export interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

/**
 * 生成 JWT Token 用于智谱 AI API 认证
 */
function generateToken(apiKey: string): string {
  const [id, secret] = apiKey.split('.')

  const now = Date.now()
  const payload = {
    api_key: id,
    exp: now + 3600000,
    timestamp: now
  }

  // 简单的 Base64 编码实现
  const header = {
    alg: 'HS256',
    sign_type: 'SIGN'
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const hmac = require('crypto').createHmac('sha256', secret)
  hmac.update(signatureInput)
  const signature = hmac.digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * 获取单个文本的向量
 */
export async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const token = generateToken(apiKey)

    const response = await axios.post<EmbeddingResponse>(
      EMBEDDING_API_URL,
      {
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    )

    return response.data.data[0].embedding
  } catch (error: any) {
    console.error('Embedding API error:', error.response?.data || error.message)
    throw new Error(`向量化失败: ${error.message}`)
  }
}

/**
 * 批量获取多个文本的向量
 */
export async function getEmbeddings(
  texts: string[],
  apiKey: string,
  batchSize: number = 10
): Promise<number[][]> {
  const results: number[][] = []

  // 分批处理以避免超出 API 限制
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    try {
      const token = generateToken(apiKey)

      const response = await axios.post<EmbeddingResponse>(
        EMBEDDING_API_URL,
        {
          model: EMBEDDING_MODEL,
          input: batch,
          encoding_format: 'float'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent
        }
      )

      // 按索引排序确保顺序正确
      const sorted = response.data.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding)

      results.push(...sorted)
    } catch (error: any) {
      console.error(`Batch embedding error (batch ${i / batchSize}):`, error.response?.data || error.message)
      // 失败的批次返回空向量
      for (let j = 0; j < batch.length; j++) {
        results.push(new Array(2048).fill(0)) // embedding-3 输出 2048 维
      }
    }
  }

  return results
}

/**
 * 计算余弦相似度
 *
 * 性能优化（2026-06）：
 *   智谱 embedding-3 返回的向量已 L2 归一化（L2 范数 ≈ 1），
 *   此时 cosine(a, b) ≡ dot(a, b)，可省去两次平方和 + 两次 sqrt。
 *   单次调用从 3 次循环（dot + normA + normB）压到 1 次循环。
 *
 *   保留通用回退路径以兼容未归一化的向量（其他来源 / 测试数据）。
 *   触发条件：检测到任一向量 |L2 - 1| > 1e-3 时切回通用算法。
 *
 * 外部 API 完全不变。
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }

  // === 快路径：一次循环同时累计 dot / normA / normB ===
  let dotProduct = 0
  let normASq = 0
  let normBSq = 0

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]
    const bi = b[i]
    dotProduct += ai * bi
    normASq += ai * ai
    normBSq += bi * bi
  }

  if (normASq === 0 || normBSq === 0) {
    return 0
  }

  // 若两向量都是单位向量，dot 即 cosine（避免 sqrt × 2 + 一次除法）
  const NORM_EPS = 1e-3
  if (Math.abs(normASq - 1) < NORM_EPS && Math.abs(normBSq - 1) < NORM_EPS) {
    return dotProduct
  }

  return dotProduct / (Math.sqrt(normASq) * Math.sqrt(normBSq))
}

/**
 * 计算欧氏距离
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2
  }

  return Math.sqrt(sum)
}

/**
 * 找到最相似的向量
 */
export function findMostSimilar(
  query: number[],
  candidates: Array<{ embedding: number[]; metadata?: any }>,
  metric: 'cosine' | 'euclidean' = 'cosine'
): Array<{ embedding: number[]; metadata?: any; score: number }> {
  const scored = candidates.map(candidate => ({
    ...candidate,
    score: metric === 'cosine'
      ? cosineSimilarity(query, candidate.embedding)
      : 1 / (1 + euclideanDistance(query, candidate.embedding)) // 距离越小，分数越高
  }))

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * 向量序列化/反序列化（用于存储到数据库）
 */
export function serializeVector(vector: number[]): string {
  return JSON.stringify(vector)
}

export function deserializeVector(json: string): number[] {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

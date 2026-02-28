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
        results.push(new Array(1024).fill(0)) // embedding-3 输出 1024 维
      }
    }
  }

  return results
}

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
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

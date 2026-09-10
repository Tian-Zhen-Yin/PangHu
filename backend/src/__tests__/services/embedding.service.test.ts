/**
 * embedding.service 单元测试
 *
 * 覆盖：
 *  - getEmbedding：成功路径 / API 错误抛出
 *  - getEmbeddings：批量分批 / 部分失败时的全零向量 fallback / 顺序保证
 *  - cosineSimilarity / euclideanDistance：数学正确性 + 维度校验
 *  - findMostSimilar：cosine & euclidean 双 metric
 *  - serializeVector / deserializeVector：往返 + 异常恢复
 *
 * 注意：所有 axios 调用都被 mock，不会真实请求智谱 API。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ✅ 先 mock axios，再 import 被测模块
vi.mock('axios', () => {
  const post = vi.fn()
  return {
    default: { post },
    post,
  }
})

import axios from 'axios'
import {
  getEmbedding,
  getEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  findMostSimilar,
  serializeVector,
  deserializeVector,
} from '../../services/embedding.service'

const mockedPost = axios.post as unknown as ReturnType<typeof vi.fn>

const FAKE_KEY = 'fake_id.fake_secret'

function makeVec(seed: number, dim = 2048): number[] {
  // 生成确定性的伪随机向量
  const v: number[] = new Array(dim)
  for (let i = 0; i < dim; i++) v[i] = Math.sin(seed * (i + 1)) * 0.01
  return v
}

function mockResponse(vectors: number[][]) {
  return {
    data: {
      object: 'list',
      data: vectors.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index,
      })),
      model: 'embedding-3',
      usage: { prompt_tokens: 10, total_tokens: 10 },
    },
  }
}

beforeEach(() => {
  mockedPost.mockReset()
})

describe('embedding.service · getEmbedding', () => {
  it('成功返回 2048 维向量', async () => {
    const v = makeVec(1)
    mockedPost.mockResolvedValueOnce(mockResponse([v]))

    const result = await getEmbedding('猫咪打喷嚏', FAKE_KEY)
    expect(result).toEqual(v)
    expect(result.length).toBe(2048)
    expect(mockedPost).toHaveBeenCalledTimes(1)
  })

  it('API 报错时抛出明确异常', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network error'))
    await expect(getEmbedding('foo', FAKE_KEY)).rejects.toThrow(/向量化失败/)
  })
})

describe('embedding.service · getEmbeddings (batch)', () => {
  it('按 batchSize 分批，并保证返回顺序', async () => {
    const v1 = makeVec(1)
    const v2 = makeVec(2)
    const v3 = makeVec(3)
    const v4 = makeVec(4)
    const v5 = makeVec(5)

    // 注意：embedding API 可能以乱序返回，需要按 index 排序
    mockedPost
      .mockResolvedValueOnce({
        data: {
          data: [
            { embedding: v2, index: 1, object: 'embedding' },
            { embedding: v1, index: 0, object: 'embedding' },
            { embedding: v3, index: 2, object: 'embedding' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { embedding: v5, index: 1, object: 'embedding' },
            { embedding: v4, index: 0, object: 'embedding' },
          ],
        },
      })

    const results = await getEmbeddings(['a', 'b', 'c', 'd', 'e'], FAKE_KEY, 3)
    expect(results).toHaveLength(5)
    expect(results[0]).toEqual(v1)
    expect(results[1]).toEqual(v2)
    expect(results[2]).toEqual(v3)
    expect(results[3]).toEqual(v4)
    expect(results[4]).toEqual(v5)
    expect(mockedPost).toHaveBeenCalledTimes(2)
  })

  it('某批失败时，该批返回全零向量（不抛错）', async () => {
    const v1 = makeVec(1)
    const v2 = makeVec(2)

    mockedPost
      .mockResolvedValueOnce(mockResponse([v1, v2])) // 第一批成功
      .mockRejectedValueOnce(new Error('rate limited')) // 第二批失败

    const results = await getEmbeddings(['a', 'b', 'c', 'd'], FAKE_KEY, 2)
    expect(results).toHaveLength(4)
    expect(results[0]).toEqual(v1)
    expect(results[1]).toEqual(v2)
    expect(results[2].length).toBe(2048)
    expect(results[2].every((x) => x === 0)).toBe(true)
    expect(results[3].every((x) => x === 0)).toBe(true)
  })

  it('支持 batchSize 默认值（10）', async () => {
    const vs = Array.from({ length: 15 }, (_, i) => makeVec(i + 1))
    mockedPost
      .mockResolvedValueOnce(mockResponse(vs.slice(0, 10)))
      .mockResolvedValueOnce(mockResponse(vs.slice(10)))

    const inputs = vs.map((_, i) => `text-${i}`)
    const results = await getEmbeddings(inputs, FAKE_KEY)
    expect(results).toHaveLength(15)
    expect(mockedPost).toHaveBeenCalledTimes(2)
  })
})

describe('embedding.service · cosineSimilarity', () => {
  it('完全相同的向量相似度 = 1', () => {
    const v = makeVec(7)
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6)
  })

  it('正交向量相似度 = 0', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6)
  })

  it('反向向量相似度 = -1', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6)
  })

  it('全零向量返回 0（不会 NaN）', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0)
  })

  it('维度不匹配抛错', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/维度不匹配/)
  })

  it('快路径：L2 归一化向量相似度 = dot（与通用路径一致）', () => {
    // 构造两个 L2 归一化向量
    const a = [0.6, 0.8] // ‖a‖ = 1
    const b = [0.8, 0.6] // ‖b‖ = 1
    const expected = 0.6 * 0.8 + 0.8 * 0.6 // = 0.96
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 8)
  })

  it('非归一化向量结果仍然正确（走通用路径）', () => {
    // 同方向但不同模长：cosine 应为 1
    expect(cosineSimilarity([2, 0, 0], [10, 0, 0])).toBeCloseTo(1, 8)
  })

  it('快路径与通用路径数值一致', () => {
    // 模拟智谱 embedding-3 风格的归一化向量
    const dim = 128
    const raw1 = Array.from({ length: dim }, (_, i) => Math.sin(i + 1))
    const raw2 = Array.from({ length: dim }, (_, i) => Math.cos(i + 1))
    const norm1 = Math.sqrt(raw1.reduce((s, x) => s + x * x, 0))
    const norm2 = Math.sqrt(raw2.reduce((s, x) => s + x * x, 0))
    const v1 = raw1.map((x) => x / norm1)
    const v2 = raw2.map((x) => x / norm2)
    // 两种路径都应返回 dot
    const dot = v1.reduce((s, x, i) => s + x * v2[i], 0)
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(dot, 8)
  })
})

describe('embedding.service · euclideanDistance', () => {
  it('相同向量距离 = 0', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })

  it('经典 3-4-5 直角三角形', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
  })

  it('维度不匹配抛错', () => {
    expect(() => euclideanDistance([1], [1, 2])).toThrow(/维度不匹配/)
  })
})

describe('embedding.service · findMostSimilar', () => {
  const candidates = [
    { embedding: [1, 0, 0], metadata: { id: 'a' } },
    { embedding: [0.9, 0.1, 0], metadata: { id: 'b' } },
    { embedding: [0, 1, 0], metadata: { id: 'c' } },
    { embedding: [0, 0, 1], metadata: { id: 'd' } },
  ]

  it('cosine：按相似度从高到低排序', () => {
    const ranked = findMostSimilar([1, 0, 0], candidates, 'cosine')
    expect(ranked.map((r) => (r.metadata as any).id)).toEqual(['a', 'b', 'c', 'd'])
    expect(ranked[0].score).toBeCloseTo(1, 6)
  })

  it('euclidean：距离最小的得分最高', () => {
    const ranked = findMostSimilar([1, 0, 0], candidates, 'euclidean')
    expect((ranked[0].metadata as any).id).toBe('a')
    // a 距离 0 → score = 1
    expect(ranked[0].score).toBeCloseTo(1, 6)
  })
})

describe('embedding.service · serializeVector / deserializeVector', () => {
  it('正常往返', () => {
    const v = [0.1, -0.2, 0.3, 1.5e-7]
    const round = deserializeVector(serializeVector(v))
    expect(round).toEqual(v)
  })

  it('反序列化损坏 JSON 时返回空数组（不抛错）', () => {
    expect(deserializeVector('not-json-{{')).toEqual([])
  })

  it('反序列化空字符串返回空数组', () => {
    expect(deserializeVector('')).toEqual([])
  })
})

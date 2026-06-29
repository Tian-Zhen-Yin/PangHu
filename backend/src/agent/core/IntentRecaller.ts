/**
 * IntentRecaller — 基于 Sentence Embedding 的意图召回 fast-path
 *
 * 设计理念：
 * - 启动时预计算所有 anchor 句的 embedding（一次性成本）
 * - 运行时把用户消息 embed 后做余弦相似度匹配
 * - top-1 相似度 ≥ THRESHOLD_HIGH（默认 0.75）→ 直接返回工具，跳过 LLM
 * - top-1 相似度 ≥ THRESHOLD_LOW（默认 0.60）→ 返回工具 + 低置信标记
 * - 否则未命中 → 走 LLM AgentLoop
 *
 * 性能：
 * - 14 工具 × ~8 anchor = ~112 个 anchor 向量，常驻内存
 * - 单次召回 = 1 次 API embed (~50ms) + 112 次 cos_sim (<1ms)
 * - 配合 LRU 缓存，常见问题第二次几乎零延迟
 */

import { getEmbedding, getEmbeddings, cosineSimilarity } from '../../services/embedding.service'
import { INTENT_ANCHORS } from './intentAnchors'

/** 高置信阈值：相似度 ≥ 此值直接信任 fast-path 结果 */
const THRESHOLD_HIGH = Number(process.env.INTENT_RECALL_THRESHOLD_HIGH || 0.75)
/** 低置信阈值：相似度介于 LOW~HIGH 之间，返回但标记 lowConfidence */
const THRESHOLD_LOW = Number(process.env.INTENT_RECALL_THRESHOLD_LOW || 0.60)
/** LRU 缓存容量（用户消息 embedding 缓存） */
const CACHE_CAPACITY = Number(process.env.INTENT_RECALL_CACHE_SIZE || 1000)

/**
 * 简易 TF-IDF 文本相似度（本地，零 API 成本）。
 * 作为 embedding 不可用时的 fallback。
 */
class TfidfMatcher {
  private idf = new Map<string, number>()
  private docVectors: Array<{ toolName: string; anchor: string; vec: Map<string, number> }> = []

  constructor(anchors: Array<{ toolName: string; anchor: string }>) {
    const docs = anchors.map((a) => this.tokenize(a.anchor))
    const totalDocs = docs.length

    for (const doc of docs) {
      const seen = new Set<string>()
      for (const term of doc) {
        if (!seen.has(term)) {
          this.idf.set(term, (this.idf.get(term) || 0) + 1)
          seen.add(term)
        }
      }
    }

    for (const term of this.idf.keys()) {
      this.idf.set(term, Math.log((totalDocs + 1) / (this.idf.get(term)! + 1)) + 1)
    }

    this.docVectors = docs.map((doc, i) => ({
      toolName: anchors[i].toolName,
      anchor: anchors[i].anchor,
      vec: this.toTfidfVec(doc),
    }))
  }

  private tokenize(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    const tokens: string[] = []
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        tokens.push(ch)
        if (i + 1 < cleaned.length && /[\u4e00-\u9fa5]/.test(cleaned[i + 1])) {
          tokens.push(ch + cleaned[i + 1])
        }
      } else if (/\w/.test(ch)) {
        tokens.push(ch)
      }
    }
    return tokens.filter((t) => t.trim().length > 0)
  }

  private toTfidfVec(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>()
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1)
    }
    const vec = new Map<string, number>()
    for (const [t, count] of tf) {
      const idf = this.idf.get(t) || 0
      vec.set(t, (count / tokens.length) * idf)
    }
    return vec
  }

  /** 计算 user 消息与所有 anchor 的 TF-IDF 余弦相似度 */
  match(userText: string): { toolName: string; anchor: string; similarity: number } {
    const tokens = this.tokenize(userText)
    const userVec = this.toTfidfVec(tokens)

    let topToolName = ''
    let topAnchor = ''
    let topSim = -1

    for (const doc of this.docVectors) {
      let dot = 0
      let normA = 0
      let normB = 0
      for (const [k, v] of userVec) {
        dot += v * (doc.vec.get(k) || 0)
        normA += v * v
      }
      for (const v of doc.vec.values()) {
        normB += v * v
      }
      const sim = normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
      if (sim > topSim) {
        topSim = sim
        topToolName = doc.toolName
        topAnchor = doc.anchor
      }
    }
    return { toolName: topToolName, anchor: topAnchor, similarity: topSim * 0.85 /** TF-IDF 分数天然偏高,缩放到可比范围 */ }
  }
}

interface AnchorEntry {
  toolName: string
  anchor: string
  embedding: number[]
}

export interface RecallResult {
  toolName: string
  similarity: number
  matchedAnchor: string
  /** 是否高置信 (similarity >= THRESHOLD_HIGH) */
  highConfidence: boolean
  /** 召回总耗时(ms) */
  durationMs: number
  /** 是否命中缓存 */
  cacheHit: boolean
}

/**
 * 简易 LRU 缓存（Map 维持插入顺序 + 容量上限）
 */
class LRUCache<K, V> {
  private readonly map = new Map<K, V>()
  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const v = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, v)
    return v
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) this.map.delete(oldestKey)
    }
    this.map.set(key, value)
  }

  size(): number { return this.map.size }
}

export class IntentRecaller {
  private anchors: AnchorEntry[] = []
  private tfidf: TfidfMatcher | null = null
  private readonly cache = new LRUCache<string, number[]>(CACHE_CAPACITY)
  private initialized = false
  private initPromise: Promise<void> | null = null
  private embeddingReady = false

  /**
   * 启动时预计算 anchor embeddings + TF-IDF 本地索引。
   * TF-IDF 总是成功（本地计算），embedding 可能失败（API 余额不足）。
   * 幂等：重复调用只会初始化一次。
   */
  async initialize(apiKey: string): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const startedAt = Date.now()
      const flatAnchors: Array<{ toolName: string; anchor: string }> = []
      for (const entry of INTENT_ANCHORS) {
        for (const a of entry.anchors) {
          flatAnchors.push({ toolName: entry.toolName, anchor: a })
        }
      }

      console.log(`[IntentRecaller] 预计算 ${flatAnchors.length} 个 anchor...`)

      // 1) 总是构建本地 TF-IDF 索引（零成本）
      this.tfidf = new TfidfMatcher(flatAnchors)
      // TF-IDF 已就绪，立即可用（避免 embedding API 异步调用期间 isReady() 返回 false，导致冷启动窗口期 fast-path 失效）
      this.initialized = true

      // 2) 尝试 embedding API（可能余额不足）
      try {
        const texts = flatAnchors.map((a) => a.anchor)
        const embeddings = await getEmbeddings(texts, apiKey, 20)
        // getEmbeddings 失败时会返回全零向量(不 throw),需要主动检测
        const validCount = embeddings.filter((v) => v.some((x) => x !== 0)).length
        if (validCount < embeddings.length * 0.8) {
          throw new Error(`embedding API 返回大量零向量 (${validCount}/${embeddings.length} 有效)`)
        }
        this.anchors = flatAnchors.map((a, i) => ({
          toolName: a.toolName,
          anchor: a.anchor,
          embedding: embeddings[i],
        }))
        this.embeddingReady = true
      } catch (err: any) {
        console.warn(`[IntentRecaller] embedding API 不可用(${err?.message || 'unknown'}),仅使用 TF-IDF 本地匹配`)
        this.embeddingReady = false
      }

      this.initialized = true
      const dur = Date.now() - startedAt
      console.log(`[IntentRecaller] ✅ 初始化完成: ${flatAnchors.length} 个 anchor, ` +
        `mode=${this.embeddingReady ? 'embedding+tfidf' : 'tfidf_only'}, 耗时 ${dur}ms`)
    })()

    return this.initPromise
  }

  /**
   * 当前是否已就绪（TF-IDF 本地匹配总是可用）
   */
  isReady(): boolean {
    return this.initialized && this.tfidf !== null
  }

  /**
   * 对用户消息做意图召回。
   *
   * 路由策略：
   * - embedding 就绪 → 用 API embed + 余弦相似度（语义更强）
   * - embedding 不可用 → 用本地 TF-IDF + 余弦（纯本地，零延迟）
   * - cache 命中 → 直接使用缓存的向量
   *
   * 返回 null 时上层走 LLM 路由。
   */
  async recall(userMessage: string, apiKey: string): Promise<RecallResult | null> {
    if (!this.isReady()) return null

    const startedAt = Date.now()
    let topToolName = ''
    let topAnchor = ''
    let topSim = -1
    let cacheHit = false
    const useEmbedding = this.embeddingReady && apiKey

    if (useEmbedding) {
      // === Embedding 路径（语义匹配）===
      const key = userMessage.trim().toLowerCase()
      let queryVec = this.cache.get(key)
      cacheHit = !!queryVec

      if (!queryVec) {
        try {
          queryVec = await getEmbedding(userMessage, apiKey)
          this.cache.set(key, queryVec)
        } catch {
          console.warn('[IntentRecaller] embedding 调用失败,降级到本地 TF-IDF')
          return this.recallLocal(userMessage, startedAt)
        }
      }

      for (const a of this.anchors) {
        const sim = cosineSimilarity(queryVec, a.embedding)
        if (sim > topSim) {
          topSim = sim
          topToolName = a.toolName
          topAnchor = a.anchor
        }
      }
    } else {
      // === 本地 TF-IDF 路径（零 API 成本）===
      const result = this.tfidf!.match(userMessage)
      topToolName = result.toolName
      topAnchor = result.anchor
      topSim = result.similarity
    }

    const durationMs = Date.now() - startedAt

    if (topSim < THRESHOLD_LOW) return null

    return {
      toolName: topToolName,
      similarity: topSim,
      matchedAnchor: topAnchor,
      highConfidence: topSim >= THRESHOLD_HIGH,
      durationMs,
      cacheHit,
    }
  }

  /** TF-IDF 纯本地路径（不在嵌入 fallback 里做二次 log） */
  private async recallLocal(userMessage: string, startedAt: number): Promise<RecallResult | null> {
    const result = this.tfidf!.match(userMessage)
    const durationMs = Date.now() - startedAt
    if (result.similarity < THRESHOLD_LOW) return null
    return {
      toolName: result.toolName,
      similarity: result.similarity,
      matchedAnchor: result.anchor,
      highConfidence: result.similarity >= THRESHOLD_HIGH,
      durationMs,
      cacheHit: false,
    }
  }

  /**
   * 暴露给监控/测试用的内部状态
   */
  getStats() {
    return {
      initialized: this.initialized,
      anchorCount: this.anchors.length,
      embeddingReady: this.embeddingReady,
      cacheSize: this.cache.size(),
      cacheCapacity: CACHE_CAPACITY,
      thresholdHigh: THRESHOLD_HIGH,
      thresholdLow: THRESHOLD_LOW,
    }
  }
}

/**
 * 单例：全局共享一个 IntentRecaller 实例
 */
let _singleton: IntentRecaller | null = null

export function getIntentRecaller(): IntentRecaller {
  if (!_singleton) _singleton = new IntentRecaller()
  return _singleton
}
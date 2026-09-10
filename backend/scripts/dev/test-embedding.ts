/**
 * Embedding 服务连通性 + 正确性测试
 * 测试覆盖：
 *  1. 单条文本 embedding（维度 / 范数 / 耗时）
 *  2. 批量 embedding（顺序 / 数量 / 维度一致性）
 *  3. 余弦相似度（语义近 vs 语义远）
 *  4. 边界场景（空字符串、长文本）
 */

import 'dotenv/config'
import {
  getEmbedding,
  getEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  findMostSimilar
} from '../../src/services/embedding.service'

const EXPECTED_DIM = 2048
const apiKey = process.env.ZHIPUAI_API_KEY

function fmt(n: number, digits = 4): string {
  return Number.isFinite(n) ? n.toFixed(digits) : String(n)
}

function l2norm(v: number[]): number {
  let s = 0
  for (const x of v) s += x * x
  return Math.sqrt(s)
}

function header(title: string) {
  console.log('\n' + '═'.repeat(64))
  console.log(`  ${title}`)
  console.log('═'.repeat(64))
}

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✅ ${msg}`)
  } else {
    console.log(`  ❌ ${msg}`)
    process.exitCode = 1
  }
}

async function testSingle() {
  header('Test 1 / 单条文本 embedding')
  const text = '我家的猫咪一直在打喷嚏，可能是感冒了吗？'
  console.log(`  输入: "${text}"`)

  const t0 = Date.now()
  const vec = await getEmbedding(text, apiKey!)
  const dt = Date.now() - t0

  console.log(`  返回维度: ${vec.length}`)
  console.log(`  L2 范数 : ${fmt(l2norm(vec))}`)
  console.log(`  前 5 维 : [${vec.slice(0, 5).map((x) => fmt(x)).join(', ')}]`)
  console.log(`  耗时    : ${dt}ms`)

  assert(vec.length === EXPECTED_DIM, `维度 == ${EXPECTED_DIM}`)
  assert(vec.some((x) => x !== 0), '非全零向量')
  assert(l2norm(vec) > 0.5 && l2norm(vec) < 50, 'L2 范数在合理区间')
  return vec
}

async function testBatch() {
  header('Test 2 / 批量 embedding')
  const texts = [
    '猫咪打疫苗的时间表',
    '小猫的体重增长曲线',
    '猫咪挑食怎么办',
    '春季猫咪掉毛严重',
    '今天天气真好，去公园散步吧'
  ]
  console.log(`  批量数量: ${texts.length}`)

  const t0 = Date.now()
  const vecs = await getEmbeddings(texts, apiKey!, 5)
  const dt = Date.now() - t0

  console.log(`  耗时    : ${dt}ms  (avg ${Math.round(dt / texts.length)}ms/条)`)
  vecs.forEach((v, i) =>
    console.log(`  [${i}] dim=${v.length} | L2=${fmt(l2norm(v))} | "${texts[i].slice(0, 20)}..."`)
  )

  assert(vecs.length === texts.length, `数量 == ${texts.length}`)
  assert(
    vecs.every((v) => v.length === EXPECTED_DIM),
    '所有向量维度一致'
  )
  assert(
    vecs.every((v) => v.some((x) => x !== 0)),
    '无全零向量'
  )
  return { texts, vecs }
}

async function testSimilarity(batch: { texts: string[]; vecs: number[][] }) {
  header('Test 3 / 语义相似度')

  // 查询：与第 0/1/2/3 句应当较近，与第 4 句（天气）应当较远
  const queryText = '猫咪生病了该怎么办，需要看医生吗'
  console.log(`  查询: "${queryText}"`)
  const q = await getEmbedding(queryText, apiKey!)

  const ranked = findMostSimilar(
    q,
    batch.vecs.map((embedding, i) => ({ embedding, metadata: { text: batch.texts[i], idx: i } })),
    'cosine'
  )

  console.log('\n  按余弦相似度排序：')
  ranked.forEach((r, rank) => {
    const idx = (r.metadata as any).idx as number
    const text = (r.metadata as any).text as string
    const ed = euclideanDistance(q, batch.vecs[idx])
    console.log(`   #${rank + 1}  cos=${fmt(r.score)}  L2=${fmt(ed)}  | "${text}"`)
  })

  // 最弱的应该是天气句（idx=4）
  const weakest = ranked[ranked.length - 1].metadata as any
  assert(weakest.idx === 4, '语义最远 = "天气真好" 句')

  // top-1 应该来自猫相关 (0/1/2/3)
  const top1 = ranked[0].metadata as any
  assert([0, 1, 2, 3].includes(top1.idx), 'top-1 命中猫咪相关语料')

  // top-1 余弦应明显大于最末
  const gap = ranked[0].score - ranked[ranked.length - 1].score
  console.log(`\n  top-1 与末位 cos gap = ${fmt(gap)}`)
  assert(gap > 0.05, '语义区分度 (gap > 0.05)')
}

async function testEdgeCases() {
  header('Test 4 / 边界场景')

  // 长文本
  const longText = '哈吉咪'.repeat(500) + '猫咪健康'
  console.log(`  长文本 (${longText.length} 字符)`)
  const v = await getEmbedding(longText, apiKey!)
  assert(v.length === EXPECTED_DIM, `长文本维度仍为 ${EXPECTED_DIM}`)
  assert(v.some((x) => x !== 0), '长文本返回非零向量')
}

async function main() {
  console.log('🔬 Embedding 服务测试')
  console.log(`   端点: open.bigmodel.cn / embedding-3`)
  console.log(`   预期维度: ${EXPECTED_DIM}`)
  console.log(`   API Key: ${apiKey ? apiKey.slice(0, 8) + '***' + apiKey.slice(-4) : '(missing)'}`)

  if (!apiKey) {
    console.error('\n❌ ZHIPUAI_API_KEY 未配置，请在 backend/.env 中设置')
    process.exit(1)
  }

  const overallT0 = Date.now()
  try {
    await testSingle()
    const batch = await testBatch()
    await testSimilarity(batch)
    await testEdgeCases()
  } catch (err: any) {
    console.error('\n💥 测试运行中抛出异常:', err?.message || err)
    process.exitCode = 1
  }

  const totalSec = ((Date.now() - overallT0) / 1000).toFixed(2)
  console.log('\n' + '═'.repeat(64))
  if (process.exitCode === 1) {
    console.log(`  ❌ 测试结束（含失败项）  总耗时 ${totalSec}s`)
  } else {
    console.log(`  ✅ 全部测试通过！  总耗时 ${totalSec}s`)
  }
  console.log('═'.repeat(64) + '\n')
}

main()

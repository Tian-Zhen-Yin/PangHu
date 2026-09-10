/**
 * 余弦相似度性能基准测试（不进 CI，仅本地手动跑）
 * 用途：验证 L2 归一化快路径在真实 2048 维向量上的加速比
 */

import 'dotenv/config'
import { cosineSimilarity } from '../../src/services/embedding.service'

const DIM = 2048
const N = 200_000

function makeNormalized(seed: number): number[] {
  const raw: number[] = new Array(DIM)
  let s = 0
  for (let i = 0; i < DIM; i++) {
    raw[i] = Math.sin(seed * (i + 1) * 0.001)
    s += raw[i] * raw[i]
  }
  const norm = Math.sqrt(s)
  for (let i = 0; i < DIM; i++) raw[i] /= norm
  return raw
}

function makeNonNormalized(seed: number): number[] {
  const v: number[] = new Array(DIM)
  for (let i = 0; i < DIM; i++) v[i] = Math.sin(seed * (i + 1) * 0.001) * 5.3
  return v
}

async function main() {
  console.log(`🏎  cosineSimilarity 基准测试`)
  console.log(`   维度: ${DIM}，迭代: ${N.toLocaleString()} 次\n`)

  const a = makeNormalized(1)
  const b = makeNormalized(2)
  const c = makeNonNormalized(1)
  const d = makeNonNormalized(2)

  // 预热
  for (let i = 0; i < 1000; i++) cosineSimilarity(a, b)
  for (let i = 0; i < 1000; i++) cosineSimilarity(c, d)

  // 归一化路径
  const t1 = process.hrtime.bigint()
  let acc1 = 0
  for (let i = 0; i < N; i++) acc1 += cosineSimilarity(a, b)
  const t2 = process.hrtime.bigint()

  // 通用路径
  let acc2 = 0
  for (let i = 0; i < N; i++) acc2 += cosineSimilarity(c, d)
  const t3 = process.hrtime.bigint()

  const fastMs = Number(t2 - t1) / 1e6
  const slowMs = Number(t3 - t2) / 1e6

  console.log(`  归一化快路径: ${fastMs.toFixed(1)}ms  (avg ${(fastMs / N * 1000).toFixed(2)}µs/op)`)
  console.log(`  通用慢路径  : ${slowMs.toFixed(1)}ms  (avg ${(slowMs / N * 1000).toFixed(2)}µs/op)`)
  console.log(`  加速比      : ${(slowMs / fastMs).toFixed(2)}x`)
  console.log(`\n  累计校验（防止编译器消除循环）: ${acc1.toFixed(4)} / ${acc2.toFixed(4)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

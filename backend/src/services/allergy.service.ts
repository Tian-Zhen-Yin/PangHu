import { PrismaClient, AllergySeverity } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 过敏记录查询结果
 */
export interface AllergyRecordRow {
  id: string
  allergen: string
  symptoms: string
  severity: AllergySeverity
  occurrenceDate: Date
  treatment: string | null
  notes: string | null
  source: string
}

/**
 * 过敏模式分析结果
 */
export interface AllergyPatternAnalysis {
  uniqueAllergens: string[]
  topAllergens: string[]
  seasonalPattern?: string
  recentCount: number
}

/**
 * 获取猫咪的过敏记录
 * 仅返回属于该用户名下猫咪的记录（权限校验）
 */
export async function getAllergyRecords(
  userId: string,
  catId: string,
  options?: { limit?: number; days?: number },
): Promise<{ records: AllergyRecordRow[]; catName: string | null }> {
  // 权限校验：确保猫属于该用户
  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId },
    select: { id: true, name: true },
  })
  if (!cat) {
    return { records: [], catName: null }
  }

  const where: Record<string, unknown> = { catId }
  if (options?.days) {
    const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000)
    where.occurrenceDate = { gte: since }
  }

  const rows = await prisma.allergyRecord.findMany({
    where: where as any,
    orderBy: { occurrenceDate: 'desc' },
    take: options?.limit ?? 50,
  })

  return {
    records: rows.map((r) => ({
      id: r.id,
      allergen: r.allergen,
      symptoms: r.symptoms,
      severity: r.severity,
      occurrenceDate: r.occurrenceDate,
      treatment: r.treatment,
      notes: r.notes,
      source: r.source,
    })),
    catName: cat.name,
  }
}

/**
 * 分析过敏记录的模式
 * - 统计唯一过敏原
 * - 找出高频过敏原（topAllergens）
 * - 检测季节性模式
 * - 统计近30天发作次数
 */
export function analyzeAllergyPatterns(records: AllergyRecordRow[]): AllergyPatternAnalysis {
  if (records.length === 0) {
    return {
      uniqueAllergens: [],
      topAllergens: [],
      recentCount: 0,
    }
  }

  // 按过敏原分组统计
  const allergenCount: Record<string, number> = {}
  for (const r of records) {
    allergenCount[r.allergen] = (allergenCount[r.allergen] || 0) + 1
  }

  const uniqueAllergens = Object.keys(allergenCount)
  const topAllergens = Object.entries(allergenCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)

  // 近30天发作次数
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentCount = records.filter((r) => r.occurrenceDate.getTime() >= thirtyDaysAgo).length

  // 季节性模式检测：按月份统计
  const monthCount: Record<number, number> = {}
  for (const r of records) {
    const month = r.occurrenceDate.getMonth() + 1
    monthCount[month] = (monthCount[month] || 0) + 1
  }
  const peakMonths = Object.entries(monthCount)
    .filter(([, count]) => count >= 2)
    .map(([m]) => Number(m))
    .sort((a, b) => a - b)

  let seasonalPattern: string | undefined
  if (peakMonths.length > 0) {
    const seasonNames: Record<number, string> = {
      3: '春季', 4: '春季', 5: '春季',
      6: '夏季', 7: '夏季', 8: '夏季',
      9: '秋季', 10: '秋季', 11: '秋季',
      12: '冬季', 1: '冬季', 2: '冬季',
    }
    const seasons = new Set(peakMonths.map((m) => seasonNames[m]))
    if (seasons.size > 0) {
      seasonalPattern = `${Array.from(seasons).join('、')}高发`
    }
  }

  return {
    uniqueAllergens,
    topAllergens,
    seasonalPattern,
    recentCount,
  }
}

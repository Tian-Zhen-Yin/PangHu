/**
 * 健康周报服务
 *
 * 聚合多维度数据（体重、健康评估、疫苗、过敏）生成结构化周报。
 * 评分引擎采用动态权重：activityData 缺失时自动调整其他维度权重（方案 A）。
 *
 * P2 阶段不含 activity 维度（数据源未就绪）。
 * suggestions 和 toDoList 留到 P4 实现。
 */

import prisma from '../config/database'
import { getCatWeightHistory, getCatsByUser } from './cat.service'
import { analyzeWeight } from './weightStandard.service'
import { getVaccinesByCat } from './vaccine.service'
import { getAllergyRecords, analyzeAllergyPatterns } from './allergy.service'

// ==================== 类型定义 ====================

export interface WeightTrendData {
  currentWeight: number
  previousWeight: number | null
  changePercent: number | null
  trend: 'up' | 'down' | 'stable'
  dailyRecords: Array<{ date: string; weight: number }>
  standardRange: { min: number; max: number } | null
  unit: string
}

export interface HealthScoreData {
  total: number
  level: 'excellent' | 'good' | 'fair' | 'poor'
  breakdown: {
    weight?: { score: number; maxScore: number }
    vaccine?: { score: number; maxScore: number }
    allergy?: { score: number; maxScore: number }
  }
  weightingMode: 'full' | 'without_activity'
}

export interface VaccineStatusData {
  upToDate: boolean
  totalVaccines: number
  recentVaccinations: Array<{ name: string; date: string }>
  nextDueDate: string | null
  nextDueVaccine: string | null
}

export interface AllergySummaryData {
  totalRecords: number
  recentOccurrences: number
  topAllergens: string[]
  alert: string | null
}

export interface HighlightItem {
  type: 'positive' | 'neutral' | 'warning'
  title: string
  detail: string
}

// ---- P4 新增类型 ----

export interface SuggestionItem {
  priority: 'high' | 'medium' | 'low'
  category: 'diet' | 'exercise' | 'vaccine' | 'allergy' | 'general'
  title: string
  detail: string
}

export interface ToDoItem {
  id: string
  text: string
  completed: boolean
  category: 'vaccine' | 'checkup' | 'diet' | 'allergy' | 'general'
}

export interface HealthReportData {
  reportType: 'weekly'
  timeRange: { startDate: string; endDate: string; durationDays: number }
  catInfo: {
    id: string
    name: string
    breed: string | null
    age: string
    gender: string
  }
  weightTrend: WeightTrendData | null
  healthScore: HealthScoreData
  vaccineStatus: VaccineStatusData | null
  allergySummary: AllergySummaryData
  activityLevel: null  // P2 阶段无数据源
  highlights: HighlightItem[]
  suggestions: SuggestionItem[]
  toDoList: ToDoItem[]
}

// ==================== 评分引擎 ====================

/**
 * 计算体重维度评分（0-35 分，无 activity 模式）
 * - 正常：满分
 * - 偏胖/偏瘦：根据偏差占比扣分
 */
function calculateWeightScore(
  status: 'thin' | 'normal' | 'overweight' | null,
  deviation: number,
  standardRange: { min: number; max: number } | null,
): { score: number; maxScore: number } {
  const MAX = 35
  if (!status) return { score: 0, maxScore: MAX }
  if (status === 'normal') return { score: MAX, maxScore: MAX }

  // 偏差占比：deviation / 标准范围中值
  const mid = standardRange ? (standardRange.min + standardRange.max) / 2 : 4.5
  const ratio = Math.min(Math.abs(deviation) / mid, 1)
  // 偏差越大扣分越多（最少得 15 分）
  const score = Math.round(MAX * (1 - ratio * 0.7))
  return { score: Math.max(score, 15), maxScore: MAX }
}

/**
 * 计算疫苗维度评分（0-30 分）
 * - 无逾期：满分
 * - 每个逾期疫苗扣 15 分
 */
function calculateVaccineScore(
  overdueCount: number,
): { score: number; maxScore: number } {
  const MAX = 30
  const score = Math.max(MAX - overdueCount * 15, 0)
  return { score, maxScore: MAX }
}

/**
 * 计算过敏维度评分（0-35 分）
 * - 0 条记录：满分
 * - 近30天发作次数越多扣分越多
 */
function calculateAllergyScore(
  recentCount: number,
  totalRecords: number,
): { score: number; maxScore: number } {
  const MAX = 35
  if (totalRecords === 0) return { score: MAX, maxScore: MAX }
  // 近30天每次发作扣 7 分，最低 10 分
  const score = Math.max(MAX - recentCount * 7, 10)
  return { score, maxScore: MAX }
}

/**
 * 综合健康评分（动态权重）
 */
function calculateHealthScore(params: {
  weightStatus: 'thin' | 'normal' | 'overweight' | null
  weightDeviation: number
  weightStandardRange: { min: number; max: number } | null
  vaccineOverdueCount: number
  allergyRecentCount: number
  allergyTotalRecords: number
}): HealthScoreData {
  // P2 阶段始终使用 without_activity 模式（方案 A）
  const weightScore = calculateWeightScore(
    params.weightStatus,
    params.weightDeviation,
    params.weightStandardRange,
  )
  const vaccineScore = calculateVaccineScore(params.vaccineOverdueCount)
  const allergyScore = calculateAllergyScore(
    params.allergyRecentCount,
    params.allergyTotalRecords,
  )

  const breakdown = {
    weight: weightScore,
    vaccine: vaccineScore,
    allergy: allergyScore,
  }

  const total = weightScore.score + vaccineScore.score + allergyScore.score

  const level: HealthScoreData['level'] =
    total >= 90 ? 'excellent' : total >= 75 ? 'good' : total >= 60 ? 'fair' : 'poor'

  return { total, level, breakdown, weightingMode: 'without_activity' }
}

// ==================== 建议引擎 & 待办生成（P4） ====================

/**
 * 基于周报数据生成优先级排序的健康建议
 */
export function generateHealthSuggestions(report: Omit<HealthReportData, 'suggestions' | 'toDoList'>): SuggestionItem[] {
  const suggestions: SuggestionItem[] = []

  // 体重相关建议
  if (report.weightTrend) {
    if (report.weightTrend.trend === 'up') {
      suggestions.push({
        priority: 'high',
        category: 'diet',
        title: '控制体重增长',
        detail: `本周体重增加 ${Math.abs(report.weightTrend.changePercent || 0).toFixed(1)}%，建议调整饮食结构，减少零食投喂。`,
      })
    } else if (report.weightTrend.trend === 'down') {
      suggestions.push({
        priority: 'high',
        category: 'diet',
        title: '关注体重下降',
        detail: `本周体重下降 ${Math.abs(report.weightTrend.changePercent || 0).toFixed(1)}%，建议增加喂食量并观察食欲变化。`,
      })
    }

    if (!report.weightTrend.standardRange) {
      suggestions.push({
        priority: 'medium',
        category: 'general',
        title: '完善体重标准',
        detail: '缺少该品种的体重标准范围，无法精确评估体重是否正常，建议咨询兽医。',
      })
    }
  }

  // 疫苗相关建议
  if (report.vaccineStatus) {
    if (!report.vaccineStatus.upToDate) {
      suggestions.push({
        priority: 'high',
        category: 'vaccine',
        title: '疫苗需要补接种',
        detail: `存在逾期疫苗，请尽快联系兽医安排补接种，避免免疫保护缺失。`,
      })
    }
    if (report.vaccineStatus.nextDueDate) {
      suggestions.push({
        priority: 'low',
        category: 'vaccine',
        title: '疫苗即将到期',
        detail: `下次疫苗接种预计在 ${report.vaccineStatus.nextDueDate}（${report.vaccineStatus.nextDueVaccine}），请提前安排。`,
      })
    }
  }

  // 过敏相关建议
  if (report.allergySummary.totalRecords > 0) {
    if (report.allergySummary.recentOccurrences >= 2) {
      suggestions.push({
        priority: 'high',
        category: 'allergy',
        title: '过敏症状需关注',
        detail: `本周过敏发作 ${report.allergySummary.recentOccurrences} 次，主要过敏原：${report.allergySummary.topAllergens.join('、')}。建议排查饮食和环境。`,
      })
    } else if (report.allergySummary.recentOccurrences === 1) {
      suggestions.push({
        priority: 'medium',
        category: 'allergy',
        title: '近期有过敏记录',
        detail: `本周发生 1 次过敏，过敏原为 ${report.allergySummary.topAllergens.join('、')}，建议持续观察。`,
      })
    }
  }

  // 评分较低时给通用建议
  if (report.healthScore.total < 75) {
    suggestions.push({
      priority: 'medium',
      category: 'general',
      title: '整体健康需关注',
      detail: `综合健康评分为 ${report.healthScore.total}/100，建议增加体检频次，全面排查潜在问题。`,
    })
  }

  return suggestions
}

/**
 * 基于周报数据生成待办事项列表
 */
export function generateToDoList(report: Omit<HealthReportData, 'suggestions' | 'toDoList'>): ToDoItem[] {
  const list: ToDoItem[] = []
  let idCounter = 0
  const nextId = () => `todo-${Date.now()}-${++idCounter}`

  // 体重异常 → 饮食调整
  if (report.weightTrend && report.weightTrend.trend !== 'stable') {
    list.push({
      id: nextId(),
      text: report.weightTrend.trend === 'up'
        ? '调整饮食结构，减少零食投喂'
        : '增加喂食量，观察食欲变化',
      completed: false,
      category: 'diet',
    })
  }

  // 疫苗逾期 → 预约接种
  if (report.vaccineStatus && !report.vaccineStatus.upToDate) {
    list.push({
      id: nextId(),
      text: '联系兽医预约疫苗补接种',
      completed: false,
      category: 'vaccine',
    })
  }

  // 下次疫苗到期 → 提醒预约
  if (report.vaccineStatus?.nextDueDate) {
    list.push({
      id: nextId(),
      text: `安排 ${report.vaccineStatus.nextDueVaccine} 疫苗接种（预计 ${report.vaccineStatus.nextDueDate}）`,
      completed: false,
      category: 'vaccine',
    })
  }

  // 过敏频发 → 排查
  if (report.allergySummary.recentOccurrences >= 2) {
    list.push({
      id: nextId(),
      text: `排查过敏原（${report.allergySummary.topAllergens.join('、')}），必要时就医`,
      completed: false,
      category: 'allergy',
    })
  }

  // 每周例行
  if (report.weightTrend) {
    list.push({
      id: nextId(),
      text: '本周记得按时记录猫咪体重',
      completed: false,
      category: 'checkup',
    })
  }

  return list
}

// ==================== 数据聚合 ====================

/**
 * 生成健康周报
 */
export async function generateHealthReport(
  userId: string,
  catId: string,
  days: number = 7,
): Promise<HealthReportData | null> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId },
  })
  if (!cat) return null

  // 并行获取数据，单个失败不影响整体
  const [weightHistoryR, weightAnalysisR, vaccinesR, allergyR] = await Promise.allSettled([
    getCatWeightHistory(catId, userId),
    analyzeWeight(catId, userId),
    getVaccinesByCat(catId, userId),
    getAllergyRecords(userId, catId, { days: 30 }),
  ])

  const unwrap = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null

  const weightHistory = unwrap(weightHistoryR)
  const weightAnalysis = unwrap(weightAnalysisR)
  const vaccines = unwrap(vaccinesR)
  const allergy = unwrap(allergyR)

  // ---- 体重趋势 ----
  let weightTrend: WeightTrendData | null = null
  if (weightHistory && weightHistory.length > 0) {
    const recent = weightHistory.slice(-10)
    const currentWeight = Number(recent[recent.length - 1].weight)
    const previousWeight = recent.length > 1 ? Number(recent[0].weight) : null
    const changePercent =
      previousWeight !== null && previousWeight > 0
        ? Number((((currentWeight - previousWeight) / previousWeight) * 100).toFixed(2))
        : null
    const trend: WeightTrendData['trend'] =
      changePercent === null ? 'stable' : changePercent > 3 ? 'up' : changePercent < -3 ? 'down' : 'stable'

    weightTrend = {
      currentWeight,
      previousWeight,
      changePercent,
      trend,
      dailyRecords: recent.map((r) => ({ date: r.date, weight: Number(r.weight) })),
      standardRange: weightAnalysis
        ? { min: Number(weightAnalysis.min.toFixed(2)), max: Number(weightAnalysis.max.toFixed(2)) }
        : null,
      unit: 'kg',
    }
  }

  // ---- 疫苗状态 ----
  let vaccineStatus: VaccineStatusData | null = null
  let vaccineOverdueCount = 0
  if (vaccines && vaccines.length > 0) {
    const now = Date.now()
    let nextDue: { date: Date; name: string } | null = null
    const recent: Array<{ name: string; date: string }> = []

    for (const v of vaccines) {
      const vaccinatedAt = new Date(v.vaccinatedAt)
      if (vaccinatedAt >= startDate) {
        recent.push({
          name: v.vaccineName,
          date: vaccinatedAt.toLocaleDateString('zh-CN'),
        })
      }
      const nextDueDate = (v as any).nextDueDate
      if (nextDueDate) {
        const due = new Date(nextDueDate)
        if (due.getTime() < now) vaccineOverdueCount++
        if (!nextDue || due < nextDue.date) {
          nextDue = { date: due, name: v.vaccineName }
        }
      }
    }

    vaccineStatus = {
      upToDate: vaccineOverdueCount === 0,
      totalVaccines: vaccines.length,
      recentVaccinations: recent,
      nextDueDate: nextDue ? nextDue.date.toLocaleDateString('zh-CN') : null,
      nextDueVaccine: nextDue ? nextDue.name : null,
    }
  }

  // ---- 过敏摘要 ----
  const allergyRecords = allergy?.records || []
  const allergyPattern = analyzeAllergyPatterns(allergyRecords)
  const allergySummary: AllergySummaryData = {
    totalRecords: allergyRecords.length,
    recentOccurrences: allergyPattern.recentCount,
    topAllergens: allergyPattern.topAllergens,
    alert:
      allergyPattern.recentCount >= 2
        ? '近期过敏频次有所增加'
        : null,
  }

  // ---- 评分 ----
  const healthScore = calculateHealthScore({
    weightStatus: weightAnalysis?.status || null,
    weightDeviation: weightAnalysis?.deviation || 0,
    weightStandardRange: weightAnalysis
      ? { min: weightAnalysis.min, max: weightAnalysis.max }
      : null,
    vaccineOverdueCount,
    allergyRecentCount: allergyPattern.recentCount,
    allergyTotalRecords: allergyRecords.length,
  })

  // ---- 亮点 ----
  const highlights: HighlightItem[] = []

  if (weightTrend) {
    if (weightTrend.trend === 'stable') {
      highlights.push({
        type: 'positive',
        title: '体重保持稳定',
        detail: `本周体重波动在正常范围内（${weightTrend.previousWeight}kg → ${weightTrend.currentWeight}kg）`,
      })
    } else if (weightTrend.trend === 'up') {
      highlights.push({
        type: 'warning',
        title: '体重有所上升',
        detail: `本周体重增加 ${Math.abs(weightTrend.changePercent || 0).toFixed(2)}%，建议关注饮食`,
      })
    } else {
      highlights.push({
        type: 'neutral',
        title: '体重有所下降',
        detail: `本周体重减少 ${Math.abs(weightTrend.changePercent || 0).toFixed(2)}%`,
      })
    }
  }

  if (vaccineStatus) {
    if (vaccineStatus.upToDate) {
      highlights.push({
        type: 'positive',
        title: '疫苗状态完整',
        detail: vaccineStatus.nextDueDate
          ? `所有疫苗均在有效期内，下一次接种在 ${vaccineStatus.nextDueDate}`
          : '所有疫苗均在有效期内',
      })
    } else {
      highlights.push({
        type: 'warning',
        title: '疫苗需要关注',
        detail: `有 ${vaccineOverdueCount} 项疫苗已逾期，建议尽快补接种`,
      })
    }
  }

  if (allergySummary.totalRecords > 0) {
    if (allergySummary.recentOccurrences >= 2) {
      highlights.push({
        type: 'warning',
        title: '过敏频次增加',
        detail: `本周发作 ${allergySummary.recentOccurrences} 次，主要过敏原：${allergySummary.topAllergens.join('、')}`,
      })
    } else {
      highlights.push({
        type: 'neutral',
        title: '过敏记录',
        detail: `共有 ${allergySummary.totalRecords} 条过敏记录，近期无频发`,
      })
    }
  }

  return {
    reportType: 'weekly',
    timeRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      durationDays: days,
    },
    catInfo: {
      id: cat.id,
      name: cat.name,
      breed: cat.breed,
      age: `${cat.birthDate}`,
      gender: cat.gender === 'male' ? '公猫' : cat.gender === 'female' ? '母猫' : '未知',
    },
    weightTrend,
    healthScore,
    vaccineStatus,
    allergySummary,
    activityLevel: null,
    highlights,
    suggestions: generateHealthSuggestions({
      reportType: 'weekly',
      timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), durationDays: days },
      catInfo: { id: cat.id, name: cat.name, breed: cat.breed, age: `${cat.birthDate}`, gender: cat.gender === 'male' ? '公猫' : cat.gender === 'female' ? '母猫' : '未知' },
      weightTrend, healthScore, vaccineStatus, allergySummary,
      activityLevel: null, highlights,
    }),
    toDoList: generateToDoList({
      reportType: 'weekly',
      timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), durationDays: days },
      catInfo: { id: cat.id, name: cat.name, breed: cat.breed, age: `${cat.birthDate}`, gender: cat.gender === 'male' ? '公猫' : cat.gender === 'female' ? '母猫' : '未知' },
      weightTrend, healthScore, vaccineStatus, allergySummary,
      activityLevel: null, highlights,
    }),
  }
}

/**
 * 辅助：获取用户的猫咪（供工具层使用）
 */
export async function resolveCat(userId: string, catName?: string) {
  const cats = await getCatsByUser(userId)
  if (!cats || cats.length === 0) return null
  if (!catName?.trim()) return cats[0]
  const matched = cats.find(
    (c) => c.name === catName || c.name.includes(catName) || catName.includes(c.name),
  )
  return matched || cats[0]
}

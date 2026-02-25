/**
 * 体重健康标准服务
 *
 * 提供体重分析、标准查询、健康评估功能
 */

import prisma from '../config/database'
import { getWeightStandard } from '../seed/weightStandards'

/**
 * 体重分析结果接口
 */
export interface WeightAnalysis {
  status: 'thin' | 'normal' | 'overweight'
  message: string
  current: number
  min: number
  max: number
  percentage: number  // 0-100, 50为理想中心
  deviation: number   // 与理想体重的偏差（负数表示偏轻）
}

/**
 * 体重标准记录接口
 */
export interface WeightStandardInfo {
  breed: string
  ageMonth: number
  gender: 'male' | 'female' | 'all'
  neutered: boolean
  minWeight: number
  maxWeight: number
}

/**
 * 计算猫咪的月龄
 */
export function calculateAgeMonth(birthDate: Date): number {
  const now = new Date()
  const months = (now.getFullYear() - birthDate.getFullYear()) * 12 +
                 (now.getMonth() - birthDate.getMonth())
  return Math.max(1, months) // 最小为1个月
}

/**
 * 分析猫咪体重健康状况
 *
 * @param catId 猫咪ID
 * @param userId 用户ID
 * @returns 体重分析结果，如果无法分析则返回 null
 */
export async function analyzeWeight(
  catId: string,
  userId: string
): Promise<WeightAnalysis | null> {
  // 获取猫咪档案
  const cat = await prisma.cat.findFirst({
    where: {
      id: catId,
      userId,
      isActive: true,
    },
  })

  if (!cat || !cat.weight) {
    return null
  }

  // 计算月龄
  const ageMonth = calculateAgeMonth(cat.birthDate)

  // 获取体重标准
  const standard = await getWeightStandard(
    cat.breed,
    ageMonth,
    cat.gender as 'male' | 'female' | 'unknown',
    cat.isNeutered
  )

  if (!standard) {
    // 无法找到标准
    return {
      status: 'normal',
      message: '暂无该品种的体重标准数据',
      current: cat.weight,
      min: cat.weight * 0.9,
      max: cat.weight * 1.1,
      percentage: 50,
      deviation: 0,
    }
  }

  // 计算体重百分比位置
  const range = standard.maxWeight - standard.minWeight
  const percentage = range > 0
    ? ((cat.weight - standard.minWeight) / range) * 100
    : 50

  // 计算偏差（相对于标准中心）
  const idealWeight = (standard.minWeight + standard.maxWeight) / 2
  const deviation = cat.weight - idealWeight

  // 判断健康状态
  let status: 'thin' | 'normal' | 'overweight'
  let message: string

  // 定义健康区间（标准范围的 85%-115% 视为正常）
  const lowerBound = standard.minWeight * 0.85
  const upperBound = standard.maxWeight * 1.15

  if (cat.weight < lowerBound) {
    status = 'thin'
    const deficit = ((lowerBound - cat.weight) / lowerBound * 100).toFixed(1)
    message = `体重轻微偏瘦，低于标准约 ${deficit}%，建议增加营养摄入`
  } else if (cat.weight > upperBound) {
    status = 'overweight'
    const excess = ((cat.weight - upperBound) / upperBound * 100).toFixed(1)
    message = `体重轻微超重，超过标准约 ${excess}%，建议控制饮食并增加运动`
  } else {
    status = 'normal'
    if (percentage < 30) {
      message = '体重在标准范围内偏下限，可适当增加营养'
    } else if (percentage > 70) {
      message = '体重在标准范围内偏上限，注意控制饮食'
    } else {
      message = '体重正常，继续保持当前喂养方式'
    }
  }

  return {
    status,
    message,
    current: cat.weight,
    min: standard.minWeight,
    max: standard.maxWeight,
    percentage: Math.round(percentage),
    deviation: Math.round(deviation * 100) / 100,
  }
}

/**
 * 获取猫咪的体重历史及各时期的标准范围
 *
 * @param catId 猫咪ID
 * @param userId 用户ID
 * @returns 包含体重历史和对应标准范围的数组
 */
export async function getWeightHistoryWithStandards(
  catId: string,
  userId: string
): Promise<Array<{
  date: string
  weight: number
  notes?: string
  minWeight?: number
  maxWeight?: number
  status?: 'thin' | 'normal' | 'overweight'
}> | null> {
  // 获取猫咪档案
  const cat = await prisma.cat.findFirst({
    where: {
      id: catId,
      userId,
      isActive: true,
    },
  })

  if (!cat) {
    return null
  }

  // 获取体重历史（使用现有的 cat service 方法）
  const { getCatWeightHistory } = require('./cat.service')
  const history = await getCatWeightHistory(catId, userId)

  if (!history || history.length === 0) {
    return []
  }

  // 为每条记录计算标准范围
  const result = await Promise.all(
    history.map(async (record: any) => {
      const recordDate = new Date(record.date)
      const birthDate = cat.birthDate
      const ageMonth = Math.max(1,
        (recordDate.getFullYear() - birthDate.getFullYear()) * 12 +
        (recordDate.getMonth() - birthDate.getMonth())
      )

      const standard = await getWeightStandard(
        cat.breed,
        ageMonth,
        cat.gender as 'male' | 'female' | 'unknown',
        cat.isNeutered
      )

      // 判断状态
      let status: 'thin' | 'normal' | 'overweight' | undefined
      if (standard) {
        const lowerBound = standard.minWeight * 0.85
        const upperBound = standard.maxWeight * 1.15
        if (record.weight < lowerBound) status = 'thin'
        else if (record.weight > upperBound) status = 'overweight'
        else status = 'normal'
      }

      return {
        date: record.date,
        weight: record.weight,
        notes: record.notes,
        minWeight: standard?.minWeight,
        maxWeight: standard?.maxWeight,
        status,
      }
    })
  )

  return result
}

/**
 * 获取支持的品种列表
 */
export async function getSupportedBreeds(): Promise<string[]> {
  const standards = await prisma.weightStandard.findMany({
    distinct: ['breed'],
    select: { breed: true },
  })
  return standards.map((s: { breed: string }) => s.breed).sort()
}

/**
 * 批量获取多只猫咪的体重分析结果
 */
export async function analyzeMultipleCats(
  catIds: string[],
  userId: string
): Promise<Map<string, WeightAnalysis>> {
  const results = new Map<string, WeightAnalysis>()

  for (const catId of catIds) {
    const analysis = await analyzeWeight(catId, userId)
    if (analysis) {
      results.set(catId, analysis)
    }
  }

  return results
}

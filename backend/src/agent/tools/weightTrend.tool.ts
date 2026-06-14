import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getCatWeightHistory, getCatsByUser } from '../../services/cat.service'

interface WeightRecord {
  date: string
  weight: number
  notes?: string | null
  daysSinceStart?: number
}

interface TrendAnalysis {
  totalRecords: number
  startWeight: number | null
  endWeight: number | null
  change: number | null
  changePercent: number | null
  averageWeight: number | null
  maxWeight: number | null
  minWeight: number | null
  trend: '上升' | '下降' | '稳定' | '数据不足'
  daysCovered: number
  recent30DaysChange: number | null
}

interface WeightTrendOutput {
  success: boolean
  message?: string
  catName?: string
  records?: WeightRecord[]
  analysis?: TrendAnalysis
}

export const WeightTrendTool: Tool<z.infer<typeof weightTrendSchema>, WeightTrendOutput> = {
  name: 'get_weight_trend',
  description: '分析猫咪的体重变化趋势，包括历史记录、平均体重、增减幅度等。当用户询问猫咪的体重、最近的变化、体重趋势、是否变胖/变瘦时使用。',
  schema: z.object({
    catName: z
      .string()
      .optional()
      .describe('猫咪名字。留空则选择默认猫咪。'),
    days: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('分析多少天内的数据。留空则分析所有记录。'),
  }),
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const cats = await getCatsByUser(ctx.userId)

      if (!cats || cats.length === 0) {
        return {
          success: false,
          message: '您还没有登记任何猫咪档案。',
        }
      }

      let selectedCat = cats[0]
      if (input.catName && input.catName.trim()) {
        const matched = cats.find(
          (c) => c.name === input.catName || c.name.includes(input.catName) || input.catName!.includes(c.name)
        )
        if (matched) {
          selectedCat = matched
        }
      }

      const rawRecords = await getCatWeightHistory(selectedCat.id, ctx.userId)

      if (!rawRecords || rawRecords.length === 0) {
        return {
          success: false,
          message: `${selectedCat.name} 还没有任何体重记录。建议先去添加成长记录。`,
        }
      }

      const records: WeightRecord[] = rawRecords.map((r, index) => ({
        date: r.date,
        weight: Number(r.weight),
        notes: r.notes || null,
        daysSinceStart: index,
      }))

      const startRecord = records[0]
      const endRecord = records[records.length - 1]
      const startWeight = startRecord ? startRecord.weight : null
      const endWeight = endRecord ? endRecord.weight : null
      const change = startWeight !== null && endWeight !== null ? Number((endWeight - startWeight).toFixed(2)) : null
      const changePercent = startWeight !== null && endWeight !== null && startWeight > 0
        ? Number((((endWeight - startWeight) / startWeight) * 100).toFixed(1))
        : null

      const weights = records.map((r) => r.weight)
      const averageWeight = weights.length > 0 ? Number((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2)) : null
      const maxWeight = weights.length > 0 ? Number(Math.max(...weights).toFixed(2)) : null
      const minWeight = weights.length > 0 ? Number(Math.min(...weights).toFixed(2)) : null

      let trend: TrendAnalysis['trend'] = '数据不足'
      if (changePercent !== null) {
        if (changePercent > 3) trend = '上升'
        else if (changePercent < -3) trend = '下降'
        else trend = '稳定'
      }

      const startDate = new Date(startRecord!.date)
      const endDate = new Date(endRecord!.date)
      const daysCovered = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      let recent30DaysChange: number | null = null
      if (records.length >= 2) {
        const now = Date.now()
        const recent30Days = records.filter((r) => now - new Date(r.date).getTime() < 30 * 24 * 60 * 60 * 1000)
        if (recent30Days.length >= 2) {
          const first30 = recent30Days[0].weight
          const last30 = recent30Days[recent30Days.length - 1].weight
          recent30DaysChange = Number(((last30 - first30) / first30 * 100).toFixed(1))
        }
      }

      const analysis: TrendAnalysis = {
        totalRecords: records.length,
        startWeight,
        endWeight,
        change,
        changePercent,
        averageWeight,
        maxWeight,
        minWeight,
        trend,
        daysCovered,
        recent30DaysChange,
      }

      return {
        success: true,
        catName: selectedCat.name,
        records: records.slice(-10),
        analysis,
      }
    } catch (error: any) {
      ctx.logger.error(`[get_weight_trend] Error: ${error.message}`)
      return {
        success: false,
        message: '分析体重趋势时出错，请稍后重试。',
      }
    }
  },
}

export const weightTrendSchema = z.object({
  catName: z.string().optional().describe('猫咪名字。留空则选择默认猫咪。'),
  days: z.number().int().positive().optional().describe('分析多少天内的数据。留空则分析所有记录。'),
})

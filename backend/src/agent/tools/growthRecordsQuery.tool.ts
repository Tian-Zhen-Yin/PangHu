import { z } from 'zod'
import prisma from '../../config/database'
import type { Tool, AgentContext } from '../types/agent'

interface GrowthRecordItem {
  id: string
  type: string
  notes: string
  photos: string[]
  weight: number | null
  isAdoptionDay: boolean
  recordDate: string
}

interface GrowthRecordsOutput {
  success: boolean
  message?: string
  total: number
  records: GrowthRecordItem[]
}

export const growthRecordsQuerySchema = z.object({
  catId: z.string().optional().describe('猫咪 ID，留空则用当前选中猫咪'),
  type: z.string().optional().describe('按类型筛选：daily/vaccine/deworm/healthCheck/free'),
  limit: z.number().optional().describe('返回条数，默认 10，最多 30'),
})

/**
 * get_growth_records 工具（只读）
 *
 * 查询猫咪的成长记录历史。
 */
export const GrowthRecordsQueryTool: Tool<z.infer<typeof growthRecordsQuerySchema>, GrowthRecordsOutput> = {
  name: 'get_growth_records',
  description:
    '查询猫咪的成长记录历史（成长日记列表）。当用户说"看看成长记录/最近记了什么/历史记录/成长日记"时使用。',
  schema: growthRecordsQuerySchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const catId = input.catId || ctx.selectedCatId
      const limit = Math.min(input.limit || 10, 30)

      const where: Record<string, unknown> = { userId: ctx.userId }
      if (catId) where.catId = catId
      if (input.type) where.type = input.type

      const records = await prisma.petRecord.findMany({
        where,
        orderBy: { recordDate: 'desc' },
        take: limit,
      })

      const items: GrowthRecordItem[] = records.map((r) => {
        let photos: string[] = []
        try {
          photos = JSON.parse(r.photos || '[]')
        } catch {
          photos = []
        }
        return {
          id: r.id,
          type: r.type,
          notes: r.notes || '',
          photos,
          weight: r.weight || null,
          isAdoptionDay: r.isAdoptionDay,
          recordDate: r.recordDate.toISOString(),
        }
      })

      return {
        success: true,
        total: items.length,
        records: items,
      }
    } catch (error: any) {
      ctx.logger.error(`[get_growth_records] Error: ${error.message}`)
      return {
        success: false,
        message: '查询成长记录时出错，请稍后重试。',
        total: 0,
        records: [],
      }
    }
  },
}

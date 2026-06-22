import { z } from 'zod'
import prisma from '../../config/database'
import type { Tool, AgentContext } from '../types/agent'

interface WeightRecordOutput {
  success: boolean
  message?: string
  recordId?: string
  record?: {
    id: string
    petName: string
    weight: number
    recordDate: string
  }
}

export const weightRecordSchema = z.object({
  catId: z.string().optional().describe('猫咪 ID，留空则用当前选中猫咪'),
  weight: z.number().describe('体重（kg）'),
  notes: z.string().optional().describe('额外备注'),
  recordDate: z.string().optional().describe('记录日期（ISO 格式），留空则用当前时间'),
})

/**
 * ADD_weight_record 工具
 *
 * 体重记录写入工具。体重记录复用 PetRecord 表（type=daily + weight 字段）。
 */
export const WeightRecordTool: Tool<z.infer<typeof weightRecordSchema>, WeightRecordOutput> = {
  name: 'ADD_weight_record',
  description:
    '为猫咪登记一条体重数据,写入体重曲线供后续趋势分析。\n' +
    '【何时调用】用户陈述具体体重数值想录入时,涵盖各种单位表达:"今天体重 4.2 公斤"、"刚称了 8 斤"、"今天 3.6 kg"、"猫现在 5 斤"、"今天体重是 4 公斤"。\n' +
    '注意:"斤"和"公斤"都是体重单位,看到具体数字+任一单位都应触发本工具(不要走 ADD_growth_record)。\n' +
    '【何时不要调用】用户询问体重趋势/胖瘦评估(用 weight_trend / check_health) / 没有具体数值仅描述事件(用 ADD_growth_record)。\n' +
    '【数据要求】weight 单位 kg,合理范围 0.1~30。\n' +
    '⚠️ 重要换算:1 斤 = 0.5 kg。如用户说"8 斤"应填 weight=4.0;说"4.2 公斤"应填 weight=4.2。\n' +
    '【写入操作】需要用户在弹出的卡片上点击确认后才会真正保存。',
  schema: weightRecordSchema,
  permissions: ['write'],
  call: async (input, ctx: AgentContext) => {
    try {
      if (!ctx.confirmationToken?.verified) {
        return { success: false, message: '写入操作需用户确认后方可执行' }
      }

      if (!input.weight || input.weight <= 0 || input.weight > 30) {
        return { success: false, message: '体重数值不合理，请确认后重试' }
      }

      const catId = input.catId || ctx.selectedCatId
      let petName = '猫咪'
      let resolvedCatId: string | null = null

      if (catId) {
        const cat = await prisma.cat.findFirst({
          where: { id: catId, userId: ctx.userId },
          select: { id: true, name: true },
        })
        if (!cat) {
          return { success: false, message: '无权访问该猫咪信息' }
        }
        resolvedCatId = cat.id
        petName = cat.name
      }

      const record = await prisma.petRecord.create({
        data: {
          userId: ctx.userId,
          catId: resolvedCatId,
          petName,
          photoUrl: '',
          photos: '[]',
          type: 'daily',
          ageWeeks: 0,
          ageMonths: 0,
          weight: input.weight,
          notes: input.notes || `体重记录：${input.weight}kg`,
          recordDate: input.recordDate ? new Date(input.recordDate) : new Date(),
        },
      })

      if (resolvedCatId) {
        await prisma.cat.update({
          where: { id: resolvedCatId },
          data: { weight: input.weight },
        })
      }

      return {
        success: true,
        message: `已为 ${petName} 记录体重 ${input.weight}kg`,
        recordId: record.id,
        record: {
          id: record.id,
          petName: record.petName,
          weight: record.weight,
          recordDate: record.recordDate.toISOString(),
        },
      }
    } catch (error: any) {
      ctx.logger.error(`[ADD_weight_record] Error: ${error.message}`)
      return { success: false, message: '记录体重时出错，请稍后重试。' }
    }
  },
}

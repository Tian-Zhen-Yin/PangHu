import { z } from 'zod'
import prisma from '../../config/database'
import type { Tool, AgentContext } from '../types/agent'

interface AllergyRecordOutput {
  success: boolean
  message?: string
  recordId?: string
  record?: {
    id: string
    allergen: string
    symptoms: string
    severity: string
    occurrenceDate: string
    source: string
  }
}

export const allergyRecordSchema = z.object({
  catId: z.string().describe('猫咪 ID'),
  allergen: z.string().describe('过敏原（如：鸡肝、鱼粮、跳蚤、花粉）'),
  symptoms: z.string().describe('症状描述（如：皮肤红斑、呕吐、抓挠）'),
  severity: z.enum(['mild', 'moderate', 'severe']).describe('严重程度'),
  occurrenceDate: z.string().optional().describe('发作日期（ISO 格式），留空则用当前时间'),
  treatment: z.string().optional().describe('处理方式/用药'),
  notes: z.string().optional().describe('额外备注'),
})

/**
 * ADD_allergy_record 工具
 *
 * 系统首个写入权限工具。安全要求：
 * 1. permissions: ['write'] → Executor 必须先检查 confirmationToken
 * 2. 写入前必须校验猫归属（cat.userId === ctx.userId）
 * 3. 所有写入操作必须带审计字段（createdBy / source / confirmedAt）
 *
 * 此工具通常不在 Agent 流程中直接执行，而是通过 POST /api/chat/confirm 确认后调用。
 */
export const AllergyRecordTool: Tool<z.infer<typeof allergyRecordSchema>, AllergyRecordOutput> = {
  name: 'ADD_allergy_record',
  description:
    '记录新的过敏事件，完善猫咪健康档案。需要用户确认后方可执行（写入操作）。',
  schema: allergyRecordSchema,
  permissions: ['write'],
  call: async (input, ctx: AgentContext) => {
    try {
      // 1. 确认令牌校验（双重保险）
      if (!ctx.confirmationToken?.verified) {
        return {
          success: false,
          message: '写入操作需用户确认后方可执行',
        }
      }

      // 2. 所有权校验
      const cat = await prisma.cat.findFirst({
        where: { id: input.catId, userId: ctx.userId },
        select: { id: true, name: true },
      })
      if (!cat) {
        return { success: false, message: '无权访问该猫咪信息' }
      }

      // 3. 创建记录（含审计字段）
      const record = await prisma.allergyRecord.create({
        data: {
          catId: input.catId,
          allergen: input.allergen,
          symptoms: input.symptoms,
          severity: input.severity,
          occurrenceDate: input.occurrenceDate ? new Date(input.occurrenceDate) : new Date(),
          treatment: input.treatment || null,
          notes: input.notes || null,
          createdBy: ctx.userId,
          source: 'agent',
          confirmedAt: ctx.confirmationToken.confirmedAt,
        },
      })

      return {
        success: true,
        message: `已为 ${cat.name} 记录过敏事件`,
        recordId: record.id,
        record: {
          id: record.id,
          allergen: record.allergen,
          symptoms: record.symptoms,
          severity: record.severity,
          occurrenceDate: record.occurrenceDate.toISOString(),
          source: record.source,
        },
      }
    } catch (error: any) {
      ctx.logger.error(`[ADD_allergy_record] Error: ${error.message}`)
      return {
        success: false,
        message: '记录过敏事件时出错，请稍后重试。',
      }
    }
  },
}

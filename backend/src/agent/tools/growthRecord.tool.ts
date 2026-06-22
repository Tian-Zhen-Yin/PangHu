import { z } from 'zod'
import prisma from '../../config/database'
import type { Tool, AgentContext } from '../types/agent'

interface GrowthRecordOutput {
  success: boolean
  message?: string
  recordId?: string
  record?: {
    id: string
    petName: string
    type: string
    notes: string
    photos: string[]
    weight: number | null
    recordDate: string
  }
}

export const growthRecordSchema = z.object({
  catId: z.string().optional().describe('猫咪 ID，留空则用当前选中猫咪'),
  type: z
    .enum(['daily', 'free', 'healthCheck', 'deworm'])
    .optional()
    .describe('记录类型：daily 日常、free 自由、healthCheck 体检、deworm 驱虫，默认 daily'),
  notes: z.string().describe('成长记录的文字描述/备注'),
  photos: z.array(z.string()).optional().describe('图片 URL 数组（由对话框上传后传入）'),
  weight: z.number().optional().describe('记录时的体重（kg），可选'),
  isAdoptionDay: z.boolean().optional().describe('是否为领养纪念日'),
  recordDate: z.string().optional().describe('记录日期（ISO 格式），留空则用当前时间'),
})

/**
 * ADD_growth_record 工具
 *
 * 成长记录写入工具。安全要求与 ADD_allergy_record 一致：
 * 1. permissions: ['write'] → Executor 在未确认时拦截
 * 2. 写入前校验猫归属（cat.userId === ctx.userId）
 * 3. 通过 POST /api/chat/confirm 确认后调用
 */
export const GrowthRecordTool: Tool<z.infer<typeof growthRecordSchema>, GrowthRecordOutput> = {
  name: 'ADD_growth_record',
  description:
    '创建一条猫咪成长日记/成长记录,用于保存今天发生的事、照片日记或体检/驱虫记录。\n' +
    '【何时调用】用户表达想"记录/记一下/记一笔/写日记/添加成长记录/保存今天的事"等意图,尤其是携带文字描述但没有明确的体重数值或疫苗名时。\n' +
    '【何时不要调用】用户只想查询过往记录(用 get_growth_records) / 仅记录具体体重数值(用 ADD_weight_record) / 仅记录疫苗接种(用 ADD_vaccine_record)。\n' +
    '【写入操作】需要用户在弹出的卡片上点击确认后才会真正保存。',
  schema: growthRecordSchema,
  permissions: ['write'],
  call: async (input, ctx: AgentContext) => {
    try {
      if (!ctx.confirmationToken?.verified) {
        return {
          success: false,
          message: '写入操作需用户确认后方可执行',
        }
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

      const photos = input.photos || []

      const record = await prisma.petRecord.create({
        data: {
          userId: ctx.userId,
          catId: resolvedCatId,
          petName,
          photoUrl: photos[0] || '',
          photos: JSON.stringify(photos),
          type: input.type || 'daily',
          isAdoptionDay: input.isAdoptionDay || false,
          ageWeeks: 0,
          ageMonths: 0,
          weight: input.weight ?? 0,
          notes: input.notes,
          recordDate: input.recordDate ? new Date(input.recordDate) : new Date(),
        },
      })

      return {
        success: true,
        message: `已为 ${petName} 创建一条成长记录`,
        recordId: record.id,
        record: {
          id: record.id,
          petName: record.petName,
          type: record.type,
          notes: record.notes || '',
          photos,
          weight: record.weight || null,
          recordDate: record.recordDate.toISOString(),
        },
      }
    } catch (error: any) {
      ctx.logger.error(`[ADD_growth_record] Error: ${error.message}`)
      return {
        success: false,
        message: '创建成长记录时出错，请稍后重试。',
      }
    }
  },
}

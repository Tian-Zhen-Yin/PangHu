import { z } from 'zod'
import prisma from '../../config/database'
import type { Tool, AgentContext } from '../types/agent'

interface VaccineRecordOutput {
  success: boolean
  message?: string
  recordId?: string
  record?: {
    id: string
    vaccineName: string
    vaccineType: string
    vaccinatedAt: string
    nextDueDate: string | null
  }
}

export const vaccineRecordSchema = z.object({
  catId: z.string().optional().describe('猫咪 ID，留空则用当前选中猫咪'),
  vaccineName: z.string().describe('疫苗名称（如：妙三多、狂犬疫苗）'),
  vaccineType: z.string().optional().describe('疫苗类型，默认"综合疫苗"'),
  vaccinatedAt: z.string().optional().describe('接种日期（ISO 格式），留空则用当前时间'),
  nextDueDate: z.string().optional().describe('下次接种日期（ISO 格式）'),
  manufacturer: z.string().optional().describe('生产厂商'),
  veterinarian: z.string().optional().describe('接种兽医'),
  clinic: z.string().optional().describe('接种医院/诊所'),
  notes: z.string().optional().describe('额外备注'),
})

/**
 * ADD_vaccine_record 工具
 *
 * 疫苗记录写入工具。安全要求与 ADD_allergy_record 一致。
 */
export const VaccineRecordTool: Tool<z.infer<typeof vaccineRecordSchema>, VaccineRecordOutput> = {
  name: 'ADD_vaccine_record',
  description:
    '为猫咪登记一条疫苗接种或驱虫记录,写入健康档案并自动计算下次到期时间。\n' +
    '【何时调用】用户陈述"刚完成/已经完成/今天打/已经做了"接种或驱虫,如"打了妙三多"、"刚做了体内驱虫"、"今天打的狂犬"、"昨天接种了猫三联"。\n' +
    '【严禁调用】用户询问"下次什么时候打/疫苗到期没/该打什么疫苗了/距离上次打了多久"——这是查询意图,必须用 check_vaccine,绝不可走本工具!\n' +
    '判断要点:含"下次/什么时候/到期/该打/还要多久"等未来时间副词的属于查询;含"今天/刚才/昨天/已经/刚刚"等过去时副词的才是录入。\n' +
    '【数据要求】vaccineName 应包含具体疫苗名(妙三多/猫三联/狂犬/驱虫等);date 缺省时默认今天。\n' +
    '【写入操作】需要用户在弹出的卡片上点击确认后才会真正保存。',
  schema: vaccineRecordSchema,
  permissions: ['write'],
  call: async (input, ctx: AgentContext) => {
    try {
      if (!ctx.confirmationToken?.verified) {
        return { success: false, message: '写入操作需用户确认后方可执行' }
      }

      const catId = input.catId || ctx.selectedCatId
      if (!catId) {
        return { success: false, message: '缺少猫咪信息，无法登记疫苗' }
      }

      const cat = await prisma.cat.findFirst({
        where: { id: catId, userId: ctx.userId },
        select: { id: true, name: true },
      })
      if (!cat) {
        return { success: false, message: '无权访问该猫咪信息' }
      }

      const record = await prisma.vaccineRecord.create({
        data: {
          catId: cat.id,
          vaccineName: input.vaccineName,
          vaccineType: input.vaccineType || '综合疫苗',
          manufacturer: input.manufacturer || null,
          vaccinatedAt: input.vaccinatedAt ? new Date(input.vaccinatedAt) : new Date(),
          nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : null,
          veterinarian: input.veterinarian || null,
          clinic: input.clinic || null,
          notes: input.notes || null,
        },
      })

      return {
        success: true,
        message: `已为 ${cat.name} 登记疫苗记录：${record.vaccineName}`,
        recordId: record.id,
        record: {
          id: record.id,
          vaccineName: record.vaccineName,
          vaccineType: record.vaccineType,
          vaccinatedAt: record.vaccinatedAt.toISOString(),
          nextDueDate: record.nextDueDate ? record.nextDueDate.toISOString() : null,
        },
      }
    } catch (error: any) {
      ctx.logger.error(`[ADD_vaccine_record] Error: ${error.message}`)
      return { success: false, message: '登记疫苗记录时出错，请稍后重试。' }
    }
  },
}

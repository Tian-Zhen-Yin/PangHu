import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getCatsByUser } from '../../services/cat.service'
import { getVaccinesByCat } from '../../services/vaccine.service'

interface VaccineRecord {
  name: string
  date: string
  nextDueDate: string | null
  clinic: string | null
  daysUntilDue: number | null
}

interface VaccineCheckOutput {
  success: boolean
  message?: string
  catName?: string
  vaccines?: VaccineRecord[]
  needsAttention?: Array<{ name: string; message: string; priority: 'high' | 'medium' | 'low' }>
  count?: number
}

export const VaccineCheckTool: Tool<z.infer<typeof vaccineCheckSchema>, VaccineCheckOutput> = {
  name: 'check_vaccine',
  description: '检查猫咪的疫苗接种状态和下次到期时间。当用户询问疫苗、驱虫、免疫、打针时间时使用。返回已接种记录、下次接种提醒、以及需要关注的项目。',
  schema: z.object({
    catName: z.string().optional().describe('猫咪名字。留空则选择默认猫咪。'),
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

      const vaccines = await getVaccinesByCat(selectedCat.id, ctx.userId)

      if (!vaccines || vaccines.length === 0) {
        return {
          success: false,
          message: `${selectedCat.name} 还没有任何疫苗接种记录。建议按以下免疫程序接种：幼猫 8 周龄开始首次免疫，每间隔 3-4 周加强一次，共 3 针；成年猫每年加强一次。`,
        }
      }

      const now = new Date()
      const formatted: VaccineRecord[] = vaccines.map((v) => {
        const vaccinatedAt = new Date(v.vaccinatedAt)
        let nextDueDate: string | null = null
        let daysUntilDue: number | null = null

        if ((v as any).nextDueDate) {
          const nextDate = new Date((v as any).nextDueDate)
          nextDueDate = nextDate.toLocaleDateString('zh-CN')
          daysUntilDue = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          name: v.vaccineName,
          date: vaccinatedAt.toLocaleDateString('zh-CN'),
          nextDueDate,
          clinic: (v as any).clinic || null,
          daysUntilDue,
        }
      })

      const needsAttention: VaccineCheckOutput['needsAttention'] = []
      for (const v of formatted) {
        if (v.daysUntilDue !== null) {
          if (v.daysUntilDue < 0) {
            needsAttention.push({
              name: v.name,
              message: `已逾期 ${Math.abs(v.daysUntilDue)} 天未接种，建议尽快联系宠物医院补接种。`,
              priority: 'high',
            })
          } else if (v.daysUntilDue <= 7) {
            needsAttention.push({
              name: v.name,
              message: `还有 ${v.daysUntilDue} 天到期，请尽快预约接种。`,
              priority: 'high',
            })
          } else if (v.daysUntilDue <= 30) {
            needsAttention.push({
              name: v.name,
              message: `还有 ${v.daysUntilDue} 天到期，建议开始预约。`,
              priority: 'medium',
            })
          }
        }
      }

      return {
        success: true,
        catName: selectedCat.name,
        vaccines: formatted.slice(0, 5),
        needsAttention,
        count: formatted.length,
      }
    } catch (error: any) {
      ctx.logger.error(`[check_vaccine] Error: ${error.message}`)
      return {
        success: false,
        message: '疫苗状态检查时出错，请稍后重试。',
      }
    }
  },
}

export const vaccineCheckSchema = z.object({
  catName: z.string().optional().describe('猫咪名字。留空则选择默认猫咪。'),
})

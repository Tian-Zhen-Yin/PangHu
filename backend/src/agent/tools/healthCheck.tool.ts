import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getCatsByUser } from '../../services/cat.service'
import { analyzeWeight } from '../../services/weightStandard.service'

interface HealthCheckOutput {
  success: boolean
  message?: string
  catName?: string
  weightAnalysis?: {
    status: string
    message: string
    currentWeight: string
    standardRange?: string
    deviation: string
  }
  generalAdvice?: string[]
}

export const HealthCheckTool: Tool<z.infer<typeof healthCheckSchema>, HealthCheckOutput> = {
  name: 'check_health',
  description: '基于品种标准和体重数据分析猫咪的健康状况。当用户询问猫咪是否健康、是否偏胖/偏瘦、饮食建议时使用。返回健康状态评估、与品种标准的对比、以及专业建议。',
  schema: z.object({
    catName: z
      .string()
      .optional()
      .describe('猫咪名字。留空则选择默认猫咪。'),
    aspect: z
      .enum(['weight', 'general', 'diet', 'exercise'])
      .optional()
      .describe('检查的具体方面：weight=体重评估，general=整体健康，diet=饮食建议，exercise=运动建议。默认为 weight。'),
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

      const analysis = await analyzeWeight(selectedCat.id, ctx.userId)

      if (!analysis) {
        return {
          success: false,
          message: `${selectedCat.name} 没有体重记录，无法进行健康评估。请先添加体重记录。`,
        }
      }

      const statusLabel = analysis.status === 'overweight' ? '超重' : analysis.status === 'thin' ? '偏瘦' : '正常'

      const generalAdvice: string[] = []

      if (analysis.status === 'overweight') {
        generalAdvice.push(
          '建议适当减少每日饲喂量 10-15%，选择低卡路里配方的猫粮',
          '增加互动游戏和运动时间，每日至少 15-20 分钟',
          '避免喂食过多零食和人类食物',
          '每 2 周记录一次体重，观察变化趋势',
          '如持续减重效果不佳，请咨询兽医排除甲状腺问题'
        )
      } else if (analysis.status === 'thin') {
        generalAdvice.push(
          '建议增加营养密度较高的食物，如优质罐头',
          '检查是否存在寄生虫感染（特别是幼猫）',
          '如猫咪食欲正常但体重持续下降，建议就医检查',
          '确保饮水充足，避免脱水',
          '可以考虑添加营养补充剂，但请先咨询兽医'
        )
      } else {
        generalAdvice.push(
          '体重正常，请继续保持当前的喂养方式',
          '定期（每月 1 次）监测体重变化',
          '确保提供充足的淡水和适当的运动',
          '按照免疫程序定期接种疫苗和驱虫'
        )
      }

      return {
        success: true,
        catName: selectedCat.name,
        weightAnalysis: {
          status: statusLabel,
          message: analysis.message,
          currentWeight: `${Number(analysis.current).toFixed(2)} kg`,
          standardRange: analysis.min && analysis.max ? `${Number(analysis.min).toFixed(2)} - ${Number(analysis.max).toFixed(2)} kg` : undefined,
          deviation: analysis.deviation > 0 ? `+${Number(analysis.deviation).toFixed(2)} kg` : `${Number(analysis.deviation).toFixed(2)} kg`,
        },
        generalAdvice,
      }
    } catch (error: any) {
      ctx.logger.error(`[check_health] Error: ${error.message}`)
      return {
        success: false,
        message: '健康状态评估时出错，请稍后重试。',
      }
    }
  },
}

export const healthCheckSchema = z.object({
  catName: z.string().optional().describe('猫咪名字。留空则选择默认猫咪。'),
  aspect: z
    .enum(['weight', 'general', 'diet', 'exercise'])
    .optional()
    .describe('检查的具体方面：weight=体重评估，general=整体健康，diet=饮食建议，exercise=运动建议。默认为 weight。'),
})

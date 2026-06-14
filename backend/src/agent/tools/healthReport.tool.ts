import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { generateHealthReport, resolveCat, type HealthReportData } from '../../services/healthReport.service'

interface HealthReportOutput {
  success: boolean
  message?: string
  report?: HealthReportData
}

export const healthReportSchema = z.object({
  catName: z
    .string()
    .optional()
    .describe('猫咪名字。留空则选择默认猫咪。'),
  days: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('周报覆盖的天数，默认 7 天。'),
})

export const HealthReportTool: Tool<z.infer<typeof healthReportSchema>, HealthReportOutput> = {
  name: 'GENERATE_health_report',
  description:
    '生成宠物健康周报，整合体重趋势、健康评分、疫苗状态、过敏记录、健康建议和待办事项等多维度数据，返回结构化数据供前端渲染图表和卡片。当用户请求健康状况总结、健康周报、本周健康概况时使用。',
  schema: healthReportSchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const cat = await resolveCat(ctx.userId, input.catName)
      if (!cat) {
        return {
          success: false,
          message: '您还没有登记任何猫咪档案。',
        }
      }

      const report = await generateHealthReport(ctx.userId, cat.id, input.days || 7)
      if (!report) {
        return {
          success: false,
          message: `无法为 ${cat.name} 生成健康周报，请确认档案数据是否完整。`,
        }
      }

      return {
        success: true,
        report,
      }
    } catch (error: any) {
      ctx.logger.error(`[GENERATE_health_report] Error: ${error.message}`)
      return {
        success: false,
        message: '生成健康周报时出错，请稍后重试。',
      }
    }
  },
}

import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getCatsByUser } from '../../services/cat.service'
import { getAllergyRecords, analyzeAllergyPatterns } from '../../services/allergy.service'

interface AllergyQueryOutput {
  success: boolean
  message?: string
  catId?: string
  catName?: string
  totalRecords: number
  records: Array<{
    id: string
    allergen: string
    symptoms: string
    severity: string
    occurrenceDate: string
    treatment?: string | null
    notes?: string | null
  }>
  allergens: string[]
  patternAnalysis: {
    uniqueAllergens: string[]
    topAllergens: string[]
    seasonalPattern?: string
    recentCount: number
  }
  lastOccurrence: string | null
}

export const allergyQuerySchema = z.object({
  catName: z
    .string()
    .optional()
    .describe('猫咪名字。留空则选择默认猫咪。'),
  limit: z
    .number()
    .optional()
    .describe('返回的最大记录数，默认 20。'),
})

export const AllergyQueryTool: Tool<z.infer<typeof allergyQuerySchema>, AllergyQueryOutput> = {
  name: 'GET_allergy_records',
  description:
    '获取猫咪的过敏信息记录，包括过敏原、症状、发作时间、处理方式等。当用户询问猫咪的过敏史、过敏原、过敏记录时使用。返回结构化的过敏数据及模式分析（高频过敏原、季节性规律、近期发作次数）。',
  schema: allergyQuerySchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const cats = await getCatsByUser(ctx.userId)

      if (!cats || cats.length === 0) {
        return {
          success: false,
          message: '您还没有登记任何猫咪档案。',
          totalRecords: 0,
          records: [],
          allergens: [],
          patternAnalysis: { uniqueAllergens: [], topAllergens: [], recentCount: 0 },
          lastOccurrence: null,
        }
      }

      // 解析目标猫咪（与 catInfo.tool.ts 一致的匹配逻辑）
      let selectedCat = cats[0]
      if (input.catName && input.catName.trim()) {
        const matched = cats.find(
          (c) =>
            c.name === input.catName ||
            c.name.includes(input.catName!) ||
            input.catName!.includes(c.name),
        )
        if (matched) selectedCat = matched
      }

      const { records, catName } = await getAllergyRecords(ctx.userId, selectedCat.id, {
        limit: input.limit || 20,
      })

      if (records.length === 0) {
        return {
          success: false,
          message: `${catName || selectedCat.name} 暂无过敏记录。`,
          catId: selectedCat.id,
          catName: catName || selectedCat.name,
          totalRecords: 0,
          records: [],
          allergens: [],
          patternAnalysis: { uniqueAllergens: [], topAllergens: [], recentCount: 0 },
          lastOccurrence: null,
        }
      }

      const patternAnalysis = analyzeAllergyPatterns(records)

      return {
        success: true,
        catId: selectedCat.id,
        catName: catName || selectedCat.name,
        totalRecords: records.length,
        records: records.map((r) => ({
          id: r.id,
          allergen: r.allergen,
          symptoms: r.symptoms,
          severity: r.severity,
          occurrenceDate: r.occurrenceDate.toISOString(),
          treatment: r.treatment,
          notes: r.notes,
        })),
        allergens: patternAnalysis.uniqueAllergens,
        patternAnalysis,
        lastOccurrence: records[0]?.occurrenceDate.toISOString() || null,
      }
    } catch (error: any) {
      ctx.logger.error(`[GET_allergy_records] Error: ${error.message}`)
      return {
        success: false,
        message: '获取过敏记录时出错，请稍后重试。',
        totalRecords: 0,
        records: [],
        allergens: [],
        patternAnalysis: { uniqueAllergens: [], topAllergens: [], recentCount: 0 },
        lastOccurrence: null,
      }
    }
  },
}

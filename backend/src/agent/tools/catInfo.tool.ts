import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getCatsByUser, getCatById, calculateAgeInMonths, formatAge } from '../../services/cat.service'

interface CatInfoOutput {
  success: boolean
  message?: string
  cat?: {
    id: string
    name: string
    breed: string | null
    gender: string
    age: string
    weight: string | null
    isNeutered: boolean
    allergies: string | null
    diseases: string | null
    lastVaccine: string | null
    lastRecordDate: string | null
    avatar: string | null
  }
  userCats?: Array<{ id: string; name: string }>
}

export const CatInfoTool: Tool<z.infer<typeof catInfoSchema>, CatInfoOutput> = {
  name: 'get_cat_info',
  description: '获取指定猫咪的基础档案信息，包括名字、品种、性别、年龄、当前体重、绝育状态、过敏史、疾病史、最近疫苗接种记录等。当用户询问某只猫的基本情况时使用。',
  schema: z.object({
    catName: z
      .string()
      .optional()
      .describe('猫咪名字。如果用户没有明确指定猫咪名字，但系统中有默认猫咪，可以留空。'),
  }),
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const cats = await getCatsByUser(ctx.userId)

      if (!cats || cats.length === 0) {
        return {
          success: false,
          message: '您还没有登记任何猫咪档案。请先去"我的猫咪"添加一只猫咪吧。',
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

      const detail = await getCatById(selectedCat.id, ctx.userId)

      const ageMonths = calculateAgeInMonths(selectedCat.birthDate)
      const ageStr = selectedCat.birthDateEstimated ? `约${formatAge(ageMonths)}` : formatAge(ageMonths)

      const lastVaccine = detail?.vaccines && detail.vaccines.length > 0 ? `${detail.vaccines[0].vaccineName} (${new Date(detail.vaccines[0].vaccinatedAt).toLocaleDateString('zh-CN')})` : null

      const lastRecord = detail?.records && detail.records.length > 0 ? new Date(detail.records[0].recordDate).toLocaleDateString('zh-CN') : null

      return {
        success: true,
        cat: {
          id: selectedCat.id,
          name: selectedCat.name,
          breed: selectedCat.breed || null,
          gender: selectedCat.gender === 'male' ? '公猫' : selectedCat.gender === 'female' ? '母猫' : '未知',
          age: ageStr,
          weight: selectedCat.weight ? `${Number(selectedCat.weight).toFixed(2)} kg` : null,
          isNeutered: selectedCat.isNeutered || false,
          allergies: selectedCat.allergies || null,
          diseases: selectedCat.diseases || null,
          lastVaccine,
          lastRecordDate: lastRecord,
          avatar: selectedCat.avatar || null,
        },
        userCats: cats.map((c) => ({ id: c.id, name: c.name })),
      }
    } catch (error: any) {
      ctx.logger.error(`[get_cat_info] Error: ${error.message}`)
      return {
        success: false,
        message: '获取猫咪信息时出错，请稍后重试。',
      }
    }
  },
}

export const catInfoSchema = z.object({
  catName: z
    .string()
    .optional()
    .describe('猫咪名字。如果用户没有明确指定猫咪名字，可以留空，系统会选择默认猫咪。'),
})

/**
 * 体重健康标准库种子数据
 *
 * 数据来源：宠物临床通用数据 + 权威机构参考值
 * 单位：千克 (kg)
 *
 * 说明：
 * - 品种为 "通用" 表示家猫通用标准
 * - ageMonth 为月龄，从出生开始计算
 * - gender 为 "all" 表示该标准适用于所有性别
 * - neutered 为 false 表示未绝育，true 表示已绝育
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface WeightStandardData {
  breed: string
  ageMonth: number
  gender: 'male' | 'female' | 'all'
  neutered: boolean
  minWeight: number
  maxWeight: number
}

/**
 * 家猫通用标准（混合品种/未知品种）
 * 数据来源：国际宠物健康标准
 */
const domesticCatStandards: WeightStandardData[] = [
  // 幼猫期 (0-12个月)
  // 性别差异在幼猫期不明显，使用 all
  { breed: '通用', ageMonth: 1, gender: 'all', neutered: false, minWeight: 0.3, maxWeight: 0.6 },
  { breed: '通用', ageMonth: 2, gender: 'all', neutered: false, minWeight: 0.5, maxWeight: 0.9 },
  { breed: '通用', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.8, maxWeight: 1.3 },
  { breed: '通用', ageMonth: 4, gender: 'all', neutered: false, minWeight: 1.1, maxWeight: 1.8 },
  { breed: '通用', ageMonth: 5, gender: 'all', neutered: false, minWeight: 1.4, maxWeight: 2.3 },
  { breed: '通用', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.7, maxWeight: 2.8 },
  { breed: '通用', ageMonth: 7, gender: 'all', neutered: false, minWeight: 2.0, maxWeight: 3.2 },
  { breed: '通用', ageMonth: 8, gender: 'all', neutered: false, minWeight: 2.2, maxWeight: 3.5 },
  { breed: '通用', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.4, maxWeight: 3.8 },
  { breed: '通用', ageMonth: 10, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.0 },
  { breed: '通用', ageMonth: 11, gender: 'all', neutered: false, minWeight: 2.6, maxWeight: 4.2 },
  { breed: '通用', ageMonth: 12, gender: 'all', neutered: false, minWeight: 2.7, maxWeight: 4.5 },

  // 成年期 (12个月以上) - 未绝育
  { breed: '通用', ageMonth: 18, gender: 'male', neutered: false, minWeight: 3.5, maxWeight: 5.5 },
  { breed: '通用', ageMonth: 18, gender: 'female', neutered: false, minWeight: 2.8, maxWeight: 4.5 },
  { breed: '通用', ageMonth: 24, gender: 'male', neutered: false, minWeight: 3.5, maxWeight: 6.0 },
  { breed: '通用', ageMonth: 24, gender: 'female', neutered: false, minWeight: 2.8, maxWeight: 5.0 },
  { breed: '通用', ageMonth: 36, gender: 'male', neutered: false, minWeight: 3.5, maxWeight: 6.5 },
  { breed: '通用', ageMonth: 36, gender: 'female', neutered: false, minWeight: 2.8, maxWeight: 5.2 },
  { breed: '通用', ageMonth: 60, gender: 'all', neutered: false, minWeight: 3.0, maxWeight: 6.0 },

  // 成年期 (12个月以上) - 已绝育
  // 绝育后体重通常会增加 10-20%
  { breed: '通用', ageMonth: 18, gender: 'male', neutered: true, minWeight: 3.8, maxWeight: 6.5 },
  { breed: '通用', ageMonth: 18, gender: 'female', neutered: true, minWeight: 3.0, maxWeight: 5.5 },
  { breed: '通用', ageMonth: 24, gender: 'male', neutered: true, minWeight: 4.0, maxWeight: 7.0 },
  { breed: '通用', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.2, maxWeight: 6.0 },
  { breed: '通用', ageMonth: 36, gender: 'male', neutered: true, minWeight: 4.0, maxWeight: 7.5 },
  { breed: '通用', ageMonth: 36, gender: 'female', neutered: true, minWeight: 3.2, maxWeight: 6.2 },
  { breed: '通用', ageMonth: 60, gender: 'all', neutered: true, minWeight: 3.5, maxWeight: 7.0 },
]

/**
 * 英短 (British Shorthair)
 * 特点：体型中等偏大，肌肉发达
 */
const britishShorthairStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '英短', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.9, maxWeight: 1.5 },
  { breed: '英短', ageMonth: 6, gender: 'all', neutered: false, minWeight: 2.0, maxWeight: 3.2 },
  { breed: '英短', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.8, maxWeight: 4.2 },
  { breed: '英短', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.2, maxWeight: 5.0 },

  // 成年期 - 未绝育
  { breed: '英短', ageMonth: 24, gender: 'male', neutered: false, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '英短', ageMonth: 24, gender: 'female', neutered: false, minWeight: 3.5, maxWeight: 6.0 },
  { breed: '英短', ageMonth: 36, gender: 'male', neutered: false, minWeight: 5.5, maxWeight: 9.0 },
  { breed: '英短', ageMonth: 36, gender: 'female', neutered: false, minWeight: 4.0, maxWeight: 6.5 },
  { breed: '英短', ageMonth: 60, gender: 'all', neutered: false, minWeight: 4.0, maxWeight: 8.5 },

  // 成年期 - 已绝育
  { breed: '英短', ageMonth: 24, gender: 'male', neutered: true, minWeight: 5.5, maxWeight: 9.0 },
  { breed: '英短', ageMonth: 24, gender: 'female', neutered: true, minWeight: 4.0, maxWeight: 7.0 },
  { breed: '英短', ageMonth: 36, gender: 'male', neutered: true, minWeight: 6.0, maxWeight: 10.0 },
  { breed: '英短', ageMonth: 36, gender: 'female', neutered: true, minWeight: 4.5, maxWeight: 7.5 },
]

/**
 * 美短 (American Shorthair)
 * 特点：体型中等，肌肉结实
 */
const americanShorthairStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '美短', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.8, maxWeight: 1.4 },
  { breed: '美短', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.8, maxWeight: 3.0 },
  { breed: '美短', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.0 },
  { breed: '美短', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.0, maxWeight: 4.8 },

  // 成年期 - 未绝育
  { breed: '美短', ageMonth: 24, gender: 'male', neutered: false, minWeight: 4.5, maxWeight: 7.0 },
  { breed: '美短', ageMonth: 24, gender: 'female', neutered: false, minWeight: 3.0, maxWeight: 5.5 },
  { breed: '美短', ageMonth: 36, gender: 'male', neutered: false, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '美短', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.5, maxWeight: 6.0 },

  // 成年期 - 已绝育
  { breed: '美短', ageMonth: 24, gender: 'male', neutered: true, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '美短', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.5, maxWeight: 6.5 },
]

/**
 * 布偶猫 (Ragdoll)
 * 特点：大型猫，体型长而强壮
 */
const ragdollStandards: WeightStandardData[] = [
  // 幼猫期（布偶猫成熟较慢）
  { breed: '布偶', ageMonth: 3, gender: 'all', neutered: false, minWeight: 1.0, maxWeight: 1.8 },
  { breed: '布偶', ageMonth: 6, gender: 'all', neutered: false, minWeight: 2.2, maxWeight: 3.8 },
  { breed: '布偶', ageMonth: 9, gender: 'all', neutered: false, minWeight: 3.0, maxWeight: 5.0 },
  { breed: '布偶', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.5, maxWeight: 6.0 },
  { breed: '布偶', ageMonth: 18, gender: 'all', neutered: false, minWeight: 4.0, maxWeight: 7.0 },

  // 成年期 - 未绝育
  { breed: '布偶', ageMonth: 24, gender: 'male', neutered: false, minWeight: 6.0, maxWeight: 9.0 },
  { breed: '布偶', ageMonth: 24, gender: 'female', neutered: false, minWeight: 4.0, maxWeight: 6.5 },
  { breed: '布偶', ageMonth: 36, gender: 'male', neutered: false, minWeight: 7.0, maxWeight: 10.0 },
  { breed: '布偶', ageMonth: 36, gender: 'female', neutered: false, minWeight: 4.5, maxWeight: 7.5 },
  { breed: '布偶', ageMonth: 60, gender: 'all', neutered: false, minWeight: 5.0, maxWeight: 10.0 },

  // 成年期 - 已绝育
  { breed: '布偶', ageMonth: 24, gender: 'male', neutered: true, minWeight: 7.0, maxWeight: 10.5 },
  { breed: '布偶', ageMonth: 24, gender: 'female', neutered: true, minWeight: 4.5, maxWeight: 7.5 },
  { breed: '布偶', ageMonth: 36, gender: 'male', neutered: true, minWeight: 8.0, maxWeight: 12.0 },
  { breed: '布偶', ageMonth: 36, gender: 'female', neutered: true, minWeight: 5.0, maxWeight: 8.5 },
]

/**
 * 暹罗猫 (Siamese)
 * 特点：中型猫，身材修长
 */
const siameseStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '暹罗', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.7, maxWeight: 1.2 },
  { breed: '暹罗', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.5, maxWeight: 2.5 },
  { breed: '暹罗', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.0, maxWeight: 3.5 },
  { breed: '暹罗', ageMonth: 12, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.0 },

  // 成年期 - 未绝育
  { breed: '暹罗', ageMonth: 24, gender: 'male', neutered: false, minWeight: 3.5, maxWeight: 5.5 },
  { breed: '暹罗', ageMonth: 24, gender: 'female', neutered: false, minWeight: 2.5, maxWeight: 4.0 },
  { breed: '暹罗', ageMonth: 36, gender: 'male', neutered: false, minWeight: 4.0, maxWeight: 6.0 },
  { breed: '暹罗', ageMonth: 36, gender: 'female', neutered: false, minWeight: 2.8, maxWeight: 4.5 },
  { breed: '暹罗', ageMonth: 60, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 5.5 },

  // 成年期 - 已绝育
  { breed: '暹罗', ageMonth: 24, gender: 'male', neutered: true, minWeight: 4.0, maxWeight: 6.5 },
  { breed: '暹罗', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.0, maxWeight: 5.0 },
]

/**
 * 橘猫 (Orange Tabby / 中国狸花猫)
 * 特点：体型中等偏大，容易发胖
 */
const orangeCatStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '橘猫', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.8, maxWeight: 1.5 },
  { breed: '橘猫', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.8, maxWeight: 3.2 },
  { breed: '橘猫', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.2 },
  { breed: '橘猫', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.0, maxWeight: 5.0 },

  // 成年期 - 未绝育
  { breed: '橘猫', ageMonth: 24, gender: 'male', neutered: false, minWeight: 4.5, maxWeight: 7.0 },
  { breed: '橘猫', ageMonth: 24, gender: 'female', neutered: false, minWeight: 3.0, maxWeight: 5.5 },
  { breed: '橘猫', ageMonth: 36, gender: 'male', neutered: false, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '橘猫', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.5, maxWeight: 6.0 },

  // 成年期 - 已绝育（橘猫绝育后更容易发胖）
  { breed: '橘猫', ageMonth: 24, gender: 'male', neutered: true, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '橘猫', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.5, maxWeight: 6.5 },
]

/**
 * 加菲猫 (Exotic Shorthair / Persian)
 * 特点：中型偏大，身体圆胖
 */
const persianStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '加菲', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.9, maxWeight: 1.6 },
  { breed: '加菲', ageMonth: 6, gender: 'all', neutered: false, minWeight: 2.0, maxWeight: 3.5 },
  { breed: '加菲', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.8, maxWeight: 4.5 },
  { breed: '加菲', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.2, maxWeight: 5.2 },

  // 成年期 - 未绝育
  { breed: '加菲', ageMonth: 24, gender: 'male', neutered: false, minWeight: 4.5, maxWeight: 7.0 },
  { breed: '加菲', ageMonth: 24, gender: 'female', neutered: false, minWeight: 3.2, maxWeight: 5.5 },
  { breed: '加菲', ageMonth: 36, gender: 'male', neutered: false, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '加菲', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.5, maxWeight: 6.0 },

  // 成年期 - 已绝育
  { breed: '加菲', ageMonth: 24, gender: 'male', neutered: true, minWeight: 5.0, maxWeight: 8.5 },
  { breed: '加菲', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.8, maxWeight: 6.5 },
]

/**
 * 斯芬克斯/无毛猫 (Sphynx)
 * 特点：中型，皮肤紧致
 */
const sphynxStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '无毛猫', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.8, maxWeight: 1.4 },
  { breed: '无毛猫', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.6, maxWeight: 2.8 },
  { breed: '无毛猫', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.2, maxWeight: 3.8 },
  { breed: '无毛猫', ageMonth: 12, gender: 'all', neutered: false, minWeight: 2.8, maxWeight: 4.5 },

  // 成年期 - 未绝育
  { breed: '无毛猫', ageMonth: 24, gender: 'male', neutered: false, minWeight: 3.5, maxWeight: 6.0 },
  { breed: '无毛猫', ageMonth: 24, gender: 'female', neutered: false, minWeight: 2.5, maxWeight: 4.5 },
  { breed: '无毛猫', ageMonth: 36, gender: 'male', neutered: false, minWeight: 4.0, maxWeight: 7.0 },
  { breed: '无毛猫', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.0, maxWeight: 5.0 },

  // 成年期 - 已绝育
  { breed: '无毛猫', ageMonth: 24, gender: 'male', neutered: true, minWeight: 4.0, maxWeight: 7.0 },
  { breed: '无毛猫', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.0, maxWeight: 5.5 },
]

/**
 * 孟加拉豹猫 (Bengal)
 * 特点：中型偏大，肌肉发达
 */
const bengalStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '豹猫', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.9, maxWeight: 1.6 },
  { breed: '豹猫', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.9, maxWeight: 3.2 },
  { breed: '豹猫', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.6, maxWeight: 4.2 },
  { breed: '豹猫', ageMonth: 12, gender: 'all', neutered: false, minWeight: 3.0, maxWeight: 5.0 },

  // 成年期 - 未绝育
  { breed: '豹猫', ageMonth: 24, gender: 'male', neutered: false, minWeight: 4.5, maxWeight: 7.0 },
  { breed: '豹猫', ageMonth: 24, gender: 'female', neutered: false, minWeight: 3.0, maxWeight: 5.5 },
  { breed: '豹猫', ageMonth: 36, gender: 'male', neutered: false, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '豹猫', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.5, maxWeight: 6.0 },

  // 成年期 - 已绝育
  { breed: '豹猫', ageMonth: 24, gender: 'male', neutered: true, minWeight: 5.0, maxWeight: 8.0 },
  { breed: '豹猫', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.5, maxWeight: 6.5 },
]

/**
 * 缅因猫 (Maine Coon)
 * 特点：超大型猫，体型巨大
 */
const maineCoonStandards: WeightStandardData[] = [
  // 幼猫期（缅因猫成熟非常慢）
  { breed: '缅因', ageMonth: 3, gender: 'all', neutered: false, minWeight: 1.2, maxWeight: 2.2 },
  { breed: '缅因', ageMonth: 6, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.5 },
  { breed: '缅因', ageMonth: 9, gender: 'all', neutered: false, minWeight: 3.5, maxWeight: 6.0 },
  { breed: '缅因', ageMonth: 12, gender: 'all', neutered: false, minWeight: 4.0, maxWeight: 7.0 },
  { breed: '缅因', ageMonth: 18, gender: 'all', neutered: false, minWeight: 5.0, maxWeight: 8.5 },
  { breed: '缅因', ageMonth: 24, gender: 'all', neutered: false, minWeight: 6.0, maxWeight: 10.0 },

  // 成年期 - 未绝育
  { breed: '缅因', ageMonth: 36, gender: 'male', neutered: false, minWeight: 6.5, maxWeight: 10.0 },
  { breed: '缅因', ageMonth: 36, gender: 'female', neutered: false, minWeight: 4.5, maxWeight: 7.5 },
  { breed: '缅因', ageMonth: 60, gender: 'male', neutered: false, minWeight: 7.0, maxWeight: 12.0 },
  { breed: '缅因', ageMonth: 60, gender: 'female', neutered: false, minWeight: 5.0, maxWeight: 8.5 },

  // 成年期 - 已绝育
  { breed: '缅因', ageMonth: 36, gender: 'male', neutered: true, minWeight: 7.5, maxWeight: 11.5 },
  { breed: '缅因', ageMonth: 36, gender: 'female', neutered: true, minWeight: 5.0, maxWeight: 8.5 },
]

/**
 * 豆腐猫 (俄罗斯蓝猫 Russian Blue)
 * 特点：中型，优雅
 */
const russianBlueStandards: WeightStandardData[] = [
  // 幼猫期
  { breed: '俄罗斯蓝', ageMonth: 3, gender: 'all', neutered: false, minWeight: 0.7, maxWeight: 1.3 },
  { breed: '俄罗斯蓝', ageMonth: 6, gender: 'all', neutered: false, minWeight: 1.6, maxWeight: 2.8 },
  { breed: '俄罗斯蓝', ageMonth: 9, gender: 'all', neutered: false, minWeight: 2.2, maxWeight: 3.8 },
  { breed: '俄罗斯蓝', ageMonth: 12, gender: 'all', neutered: false, minWeight: 2.5, maxWeight: 4.5 },

  // 成年期 - 未绝育
  { breed: '俄罗斯蓝', ageMonth: 24, gender: 'male', neutered: false, minWeight: 3.8, maxWeight: 6.0 },
  { breed: '俄罗斯蓝', ageMonth: 24, gender: 'female', neutered: false, minWeight: 2.8, maxWeight: 4.5 },
  { breed: '俄罗斯蓝', ageMonth: 36, gender: 'male', neutered: false, minWeight: 4.0, maxWeight: 6.5 },
  { breed: '俄罗斯蓝', ageMonth: 36, gender: 'female', neutered: false, minWeight: 3.0, maxWeight: 5.0 },

  // 成年期 - 已绝育
  { breed: '俄罗斯蓝', ageMonth: 24, gender: 'male', neutered: true, minWeight: 4.2, maxWeight: 7.0 },
  { breed: '俄罗斯蓝', ageMonth: 24, gender: 'female', neutered: true, minWeight: 3.2, maxWeight: 5.5 },
]

// 合并所有品种数据
const allStandards: WeightStandardData[] = [
  ...domesticCatStandards,
  ...britishShorthairStandards,
  ...americanShorthairStandards,
  ...ragdollStandards,
  ...siameseStandards,
  ...orangeCatStandards,
  ...persianStandards,
  ...sphynxStandards,
  ...bengalStandards,
  ...maineCoonStandards,
  ...russianBlueStandards,
]

/**
 * 种子数据库
 */
export async function seedWeightStandards(): Promise<void> {
  console.log('[Seed Weight Standards] 开始导入体重标准数据...')

  // 清空现有数据
  await prisma.weightStandard.deleteMany({})
  console.log('[Seed Weight Standards] 已清空现有数据')

  // 批量插入数据
  let imported = 0
  for (const standard of allStandards) {
    try {
      await prisma.weightStandard.create({
        data: standard,
      })
      imported++
    } catch (error) {
      console.error('[Seed Weight Standards] 导入失败:', standard, error)
    }
  }

  console.log(`[Seed Weight Standards] 成功导入 ${imported} 条体重标准数据`)
}

/**
 * 获取猫咪的体重标准
 * @param breed 品种
 * @param ageMonth 月龄
 * @param gender 性别
 * @param neutered 是否绝育
 */
export async function getWeightStandard(
  breed: string | null | undefined,
  ageMonth: number,
  gender: 'male' | 'female' | 'unknown',
  neutered: boolean
): Promise<{ minWeight: number; maxWeight: number } | null> {
  // 优先查找匹配品种
  let result = await prisma.weightStandard.findFirst({
    where: {
      breed: breed || '通用',
      ageMonth: { lte: ageMonth },
      gender: gender === 'unknown' ? 'all' : gender,
      neutered,
    },
    orderBy: { ageMonth: 'desc' },
  })

  // 如果品种没有标准，使用通用标准
  if (!result && breed !== '通用') {
    result = await prisma.weightStandard.findFirst({
      where: {
        breed: '通用',
        ageMonth: { lte: ageMonth },
        gender: gender === 'unknown' ? 'all' : gender,
        neutered,
      },
      orderBy: { ageMonth: 'desc' },
    })
  }

  return result ? { minWeight: result.minWeight, maxWeight: result.maxWeight } : null
}

// 如果直接运行此文件，执行种子导入
if (require.main === module) {
  seedWeightStandards()
    .then(() => {
      console.log('[Seed Weight Standards] 完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[Seed Weight Standards] 错误:', error)
      process.exit(1)
    })
}

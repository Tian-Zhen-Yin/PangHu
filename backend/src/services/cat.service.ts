import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 领养状态类型
 */
export type CatAdoptStatus = 'raisedFromBaby' | 'adoptedYoung' | 'adoptedAdult' | 'unknownAge'

/**
 * 领养状态配置
 */
export const ADOPT_STATUS_INFO: Record<CatAdoptStatus, { label: string; description: string; defaultAgeMonths: number }> = {
  raisedFromBaby: { label: '从小养到大', description: '从小养到大，完整记录成长', defaultAgeMonths: 0 },
  adoptedYoung: { label: '领养（幼年）', description: '领养的幼年猫咪，从领养日开始记录', defaultAgeMonths: 6 },
  adoptedAdult: { label: '领养（成年）', description: '领养的成年猫咪，关注健康养护', defaultAgeMonths: 24 },
  unknownAge: { label: '年龄不详', description: '不知道年龄，关注日常健康', defaultAgeMonths: 36 },
}

export function calculateAgeInMonths(birthDate: Date): number {
  const now = new Date()
  const years = now.getFullYear() - birthDate.getFullYear()
  const months = now.getMonth() - birthDate.getMonth()
  return Math.max(0, years * 12 + months)
}

export function formatAge(months: number): string {
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths}个月`
  if (remainingMonths === 0) return `${years}岁`
  return `${years}岁${remainingMonths}个月`
}

/**
 * 获取猫咪的开始饲养日期（领养日期）
 * 如果没有设置领养日期，返回猫咪的创建日期
 */
export function getStartRaisedDate(cat: { adoptDate?: Date | null; createdAt: Date }): Date {
  return cat.adoptDate || cat.createdAt
}

/**
 * 根据领养状态获取时间线标题
 */
export function getTimelineTitle(adoptStatus: CatAdoptStatus): string {
  switch (adoptStatus) {
    case 'raisedFromBaby':
      return '成长记录'
    case 'adoptedYoung':
      return '领养后成长记录'
    case 'adoptedAdult':
    case 'unknownAge':
      return '饲养记录'
    default:
      return '成长记录'
  }
}

export async function getCatsByUser(userId: string) {
  const cats = await prisma.cat.findMany({
    where: { userId, isActive: true },
    include: {
      vaccines: {
        orderBy: { vaccinatedAt: 'desc' },
        take: 1
      },
      records: {
        orderBy: { recordDate: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return cats.map(cat => {
    const ageMonths = calculateAgeInMonths(cat.birthDate)
    return {
      ...cat,
      weight: cat.weight !== null ? parseFloat(cat.weight.toFixed(2)) : cat.weight,
      ageMonths,
      ageFormatted: cat.birthDateEstimated ? `约${formatAge(ageMonths)}` : formatAge(ageMonths),
      lastVaccine: cat.vaccines[0] || null,
      lastRecord: cat.records[0] ? {
        ...cat.records[0],
        weight: cat.records[0].weight !== null ? parseFloat(cat.records[0].weight.toFixed(2)) : cat.records[0].weight
      } : null,
      timelineTitle: getTimelineTitle(cat.adoptStatus as CatAdoptStatus),
    }
  })
}

export async function getCatById(catId: string, userId: string) {
  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId, isActive: true },
    include: {
      vaccines: {
        orderBy: { vaccinatedAt: 'desc' }
      },
      records: {
        orderBy: { recordDate: 'desc' },
        take: 10
      }
    }
  })

  if (!cat) return null

  const ageMonths = calculateAgeInMonths(cat.birthDate)
  return {
    ...cat,
    weight: cat.weight !== null ? parseFloat(cat.weight.toFixed(2)) : cat.weight,
    ageMonths,
    ageFormatted: cat.birthDateEstimated ? `约${formatAge(ageMonths)}` : formatAge(ageMonths),
    timelineTitle: getTimelineTitle(cat.adoptStatus as CatAdoptStatus),
    records: cat.records.map(r => ({
      ...r,
      weight: r.weight !== null ? parseFloat(r.weight.toFixed(2)) : r.weight
    }))
  }
}

export async function createCat(userId: string, data: {
  name: string
  gender: string
  birthDate: string
  birthDateEstimated?: boolean
  breed?: string
  avatar?: string
  adoptDate?: string
  adoptStatus?: CatAdoptStatus
  weight?: number
  isNeutered?: boolean
  neuteredDate?: string
  color?: string
  features?: string
  allergies?: string
  diseases?: string
}) {
  // 如果设置了领养日期但没设置状态，自动推断状态
  let adoptStatus = data.adoptStatus || 'raisedFromBaby'
  let birthDateEstimated = data.birthDateEstimated || false

  if (data.adoptDate && !data.adoptStatus) {
    // 有领养日期但没有状态，根据出生日期推断
    const birthDate = new Date(data.birthDate)
    const adoptDate = new Date(data.adoptDate)
    const ageAtAdopt = calculateAgeInMonths(birthDate)

    if (ageAtAdopt < 3) {
      adoptStatus = 'raisedFromBaby'
    } else if (ageAtAdopt < 12) {
      adoptStatus = 'adoptedYoung'
    } else {
      adoptStatus = 'adoptedAdult'
    }
  }

  return prisma.cat.create({
    data: {
      userId,
      name: data.name,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      birthDateEstimated,
      breed: data.breed,
      avatar: data.avatar,
      adoptDate: data.adoptDate ? new Date(data.adoptDate) : null,
      adoptStatus,
      weight: data.weight,
      isNeutered: data.isNeutered || false,
      neuteredDate: data.neuteredDate ? new Date(data.neuteredDate) : null,
      color: data.color,
      features: data.features,
      allergies: data.allergies,
      diseases: data.diseases
    }
  })
}

export async function updateCat(catId: string, userId: string, data: {
  name?: string
  gender?: string
  birthDate?: string
  birthDateEstimated?: boolean
  breed?: string
  avatar?: string
  adoptDate?: string
  adoptStatus?: CatAdoptStatus
  weight?: number
  isNeutered?: boolean
  neuteredDate?: string
  color?: string
  features?: string
  allergies?: string
  diseases?: string
}) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId } })
  if (!cat) return null

  return prisma.cat.update({
    where: { id: catId },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      adoptDate: data.adoptDate ? new Date(data.adoptDate) : (data.adoptDate === null ? null : undefined),
      neuteredDate: data.neuteredDate ? new Date(data.neuteredDate) : undefined
    }
  })
}

export async function deleteCat(catId: string, userId: string) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId } })
  if (!cat) return null

  return prisma.cat.update({
    where: { id: catId },
    data: { isActive: false }
  })
}

export async function getCatContext(catId: string, userId: string) {
  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId, isActive: true },
    include: {
      vaccines: {
        orderBy: { vaccinatedAt: 'desc' },
        take: 3
      },
      records: {
        orderBy: { recordDate: 'desc' },
        take: 1
      }
    }
  })

  if (!cat) return null

  const ageMonths = calculateAgeInMonths(cat.birthDate)

  return {
    id: cat.id,
    name: cat.name,
    breed: cat.breed,
    gender: cat.gender,
    ageMonths,
    ageFormatted: formatAge(ageMonths),
    weight: cat.weight !== null ? parseFloat(cat.weight.toFixed(2)) : cat.weight,
    isNeutered: cat.isNeutered,
    allergies: cat.allergies,
    diseases: cat.diseases,
    recentVaccines: cat.vaccines.map(v => ({
      name: v.vaccineName,
      date: v.vaccinatedAt.toISOString().split('T')[0],
      nextDueDate: v.nextDueDate ? v.nextDueDate.toISOString().split('T')[0] : null
    })),
    lastRecord: cat.records[0] ? {
      date: cat.records[0].recordDate.toISOString().split('T')[0],
      weight: cat.records[0].weight !== null ? parseFloat(cat.records[0].weight.toFixed(2)) : cat.records[0].weight,
      notes: cat.records[0].notes
    } : null
  }
}

// 获取猫咪体重历史记录（用于趋势图）
export async function getCatWeightHistory(catId: string, userId: string) {
  console.log('[getCatWeightHistory] Called with catId:', catId, 'userId:', userId)
  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId, isActive: true }
  })

  if (!cat) {
    console.log('[getCatWeightHistory] Cat not found or userId mismatch')
    return null
  }

  // 获取所有有体重的记录
  const allRecords = await prisma.petRecord.findMany({
    where: { catId },
    orderBy: { recordDate: 'asc' }
  })

  console.log('[getCatWeightHistory] Found', allRecords.length, 'total records for cat')

  // 过滤出有体重的记录，并处理浮点数精度
  const records = allRecords
    .filter(r => r.weight !== null && r.weight !== undefined)
    .map(record => ({
      date: record.recordDate.toISOString().split('T')[0],
      weight: parseFloat(record.weight!.toFixed(2)),  // 保留两位小数
      notes: record.notes
    }))

  console.log('[getCatWeightHistory] Filtered to', records.length, 'records with weight')

  // 如果猫咪档案中有体重，且没有更早的记录，则添加初始体重
  if (cat.weight) {
    const hasEarlierRecord = records.length > 0 && new Date(records[0].date) <= cat.createdAt
    if (!hasEarlierRecord) {
      records.unshift({
        date: cat.createdAt.toISOString().split('T')[0],
        weight: cat.weight,
        notes: '初始体重'
      })
    }
  }

  return records
}

export async function setWeightGoal(catId: string, userId: string, targetWeight: number, targetDate: string) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId, isActive: true } })
  if (!cat) return null
  return prisma.cat.update({
    where: { id: catId },
    data: { weightGoalTarget: targetWeight, weightGoalDate: new Date(targetDate) }
  })
}

export async function updateCatAvatar(catId: string, userId: string, avatarUrl: string) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId, isActive: true } })
  if (!cat) return null
  return prisma.cat.update({
    where: { id: catId },
    data: { avatar: avatarUrl }
  })
}

/**
 * 更新猫咪头像（base64 格式）
 */
export async function updateCatAvatarData(catId: string, userId: string, avatarData: string) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId, isActive: true } })
  if (!cat) return null
  return prisma.cat.update({
    where: { id: catId },
    data: { avatarData: avatarData }
  })
}

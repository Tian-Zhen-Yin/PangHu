import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

  return cats.map(cat => ({
    ...cat,
    ageMonths: calculateAgeInMonths(cat.birthDate),
    ageFormatted: formatAge(calculateAgeInMonths(cat.birthDate)),
    lastVaccine: cat.vaccines[0] || null,
    lastRecord: cat.records[0] || null
  }))
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

  return {
    ...cat,
    ageMonths: calculateAgeInMonths(cat.birthDate),
    ageFormatted: formatAge(calculateAgeInMonths(cat.birthDate))
  }
}

export async function createCat(userId: string, data: {
  name: string
  gender: string
  birthDate: string
  breed?: string
  avatar?: string
  adoptDate?: string
  weight?: number
  isNeutered?: boolean
  neuteredDate?: string
  color?: string
  features?: string
  allergies?: string
  diseases?: string
}) {
  return prisma.cat.create({
    data: {
      userId,
      name: data.name,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      breed: data.breed,
      avatar: data.avatar,
      adoptDate: data.adoptDate ? new Date(data.adoptDate) : null,
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
  breed?: string
  avatar?: string
  adoptDate?: string
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
      adoptDate: data.adoptDate ? new Date(data.adoptDate) : undefined,
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
    weight: cat.weight,
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
      weight: cat.records[0].weight,
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

  // 过滤出有体重的记录
  const records = allRecords
    .filter(r => r.weight !== null && r.weight !== undefined)
    .map(record => ({
      date: record.recordDate.toISOString().split('T')[0],
      weight: record.weight!,
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

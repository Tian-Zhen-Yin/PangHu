import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getVaccinesByCat(catId: string, userId: string) {
  // 验证猫咪归属
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId, isActive: true } })
  if (!cat) return null

  return prisma.vaccineRecord.findMany({
    where: { catId },
    orderBy: { vaccinatedAt: 'desc' }
  })
}

export async function createVaccineRecord(catId: string, userId: string, data: {
  vaccineName: string
  vaccineType?: string
  manufacturer?: string
  batchNumber?: string
  vaccinatedAt: string
  nextDueDate?: string
  veterinarian?: string
  clinic?: string
  reaction?: string
  notes?: string
}) {
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId, isActive: true } })
  if (!cat) return null

  return prisma.vaccineRecord.create({
    data: {
      catId,
      vaccineName: data.vaccineName,
      vaccineType: data.vaccineType || '综合疫苗',
      manufacturer: data.manufacturer,
      batchNumber: data.batchNumber,
      vaccinatedAt: new Date(data.vaccinatedAt),
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      veterinarian: data.veterinarian,
      clinic: data.clinic,
      reaction: data.reaction,
      notes: data.notes
    }
  })
}

export async function updateVaccineRecord(id: string, userId: string, data: {
  vaccineName?: string
  vaccineType?: string
  manufacturer?: string
  batchNumber?: string
  vaccinatedAt?: string
  nextDueDate?: string
  veterinarian?: string
  clinic?: string
  reaction?: string
  notes?: string
}) {
  // 验证归属
  const record = await prisma.vaccineRecord.findFirst({
    where: { id },
    include: { cat: { select: { userId: true } } }
  })
  if (!record || record.cat.userId !== userId) return null

  return prisma.vaccineRecord.update({
    where: { id },
    data: {
      ...data,
      vaccinatedAt: data.vaccinatedAt ? new Date(data.vaccinatedAt) : undefined,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined
    }
  })
}

export async function deleteVaccineRecord(id: string, userId: string) {
  const record = await prisma.vaccineRecord.findFirst({
    where: { id },
    include: { cat: { select: { userId: true } } }
  })
  if (!record || record.cat.userId !== userId) return null

  return prisma.vaccineRecord.delete({ where: { id } })
}

export async function getUpcomingVaccines(userId: string, daysAhead: number = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  return prisma.vaccineRecord.findMany({
    where: {
      cat: { userId, isActive: true },
      nextDueDate: { lte: cutoff, gte: new Date() }
    },
    include: { cat: { select: { id: true, name: true, avatar: true } } },
    orderBy: { nextDueDate: 'asc' }
  })
}

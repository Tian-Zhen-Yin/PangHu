import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建成长记录数据...')

  // 获取测试用户
  const users = await prisma.user.findMany()
  if (users.length === 0) {
    console.log('没有找到用户，请先创建用户')
    return
  }

  const user = users[0]
  console.log(`使用用户: ${user.username}`)

  // 获取或创建测试猫咪
  let cat = await prisma.cat.findFirst({
    where: { userId: user.id, isActive: true }
  })

  if (!cat) {
    console.log('没有找到猫咪，创建测试猫咪...')
    cat = await prisma.cat.create({
      data: {
        userId: user.id,
        name: '小橘',
        gender: 'male',
        birthDate: new Date('2024-01-15'),
        adoptDate: new Date('2024-02-01'),
        adoptStatus: 'raisedFromBaby',
        weight: 4.5,
        isNeutered: true,
        neuteredDate: new Date('2024-06-15'),
        breed: '橘猫',
        color: '橘色',
        isActive: true
      }
    })
    console.log(`创建猫咪: ${cat.name}`)
  }

  console.log(`使用猫咪: ${cat.name}`)

  // 计算年龄周数
  const now = new Date()
  const birthDate = new Date(cat.birthDate)
  const ageWeeks = Math.floor((now.getTime() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

  // 确保有领养日期，如果没有则使用出生日期
  const adoptDate = cat.adoptDate ? new Date(cat.adoptDate) : new Date(cat.birthDate)

  // 创建成长记录
  const records = [
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks - 8),
      ageMonths: Math.max(0, Math.floor((ageWeeks - 8) / 4)),
      weight: 2.5,
      notes: '小橘第一次到新家，很健康活泼',
      recordDate: adoptDate,
      catId: cat.id,
      userId: user.id,
      type: 'daily',
      isAdoptionDay: true,
      photos: JSON.stringify([])
    },
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks - 6),
      ageMonths: Math.max(0, Math.floor((ageWeeks - 6) / 4)),
      weight: 3.2,
      notes: '体重增长很好，精神状态不错',
      recordDate: new Date(adoptDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      catId: cat.id,
      userId: user.id,
      type: 'daily',
      photos: JSON.stringify([])
    },
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks - 4),
      ageMonths: Math.max(0, Math.floor((ageWeeks - 4) / 4)),
      weight: 3.8,
      notes: '第一次打疫苗，很勇敢',
      recordDate: new Date(adoptDate.getTime() + 28 * 24 * 60 * 60 * 1000),
      catId: cat.id,
      userId: user.id,
      type: 'vaccine',
      templateData: JSON.stringify({ vaccineName: '猫三联疫苗', nextDate: new Date(adoptDate.getTime() + 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], clinic: '宠物医院' }),
      photos: JSON.stringify([])
    },
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks - 2),
      ageMonths: Math.max(0, Math.floor((ageWeeks - 2) / 4)),
      weight: 4.2,
      notes: '进行了体检，一切正常',
      recordDate: new Date(adoptDate.getTime() + 42 * 24 * 60 * 60 * 1000),
      catId: cat.id,
      userId: user.id,
      type: 'healthCheck',
      templateData: JSON.stringify({ clinic: '爱心宠物医院', vet: '王医生', findings: '体重正常，心跳有力，建议继续保持目前的喂养方式' }),
      photos: JSON.stringify([])
    },
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks - 1),
      ageMonths: Math.max(0, Math.floor((ageWeeks - 1) / 4)),
      weight: 4.4,
      notes: '完成绝育手术，恢复良好',
      recordDate: cat.neuteredDate || new Date(adoptDate.getTime() + 56 * 24 * 60 * 60 * 1000),
      catId: cat.id,
      userId: user.id,
      type: 'daily',
      photos: JSON.stringify([])
    },
    {
      petName: cat.name,
      ageWeeks: Math.max(0, ageWeeks),
      ageMonths: Math.max(0, Math.floor(ageWeeks / 4)),
      weight: 4.5,
      notes: '今天特别调皮，玩了好久的玩具',
      recordDate: new Date(),
      catId: cat.id,
      userId: user.id,
      type: 'daily',
      photos: JSON.stringify([])
    }
  ]

  for (const record of records) {
    await prisma.petRecord.create({
      data: record
    })
  }

  console.log(`创建了 ${records.length} 条成长记录`)

  // 查询所有记录确认
  const allRecords = await prisma.petRecord.findMany({
    where: { userId: user.id },
    orderBy: { recordDate: 'desc' }
  })

  console.log(`用户 ${user.username} 现在有 ${allRecords.length} 条成长记录`)
  allRecords.forEach(record => {
    console.log(`- ${record.recordDate.toISOString().split('T')[0]}: ${record.petName}, ${record.weight}kg`)
  })

  console.log('成长记录数据创建完成！')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
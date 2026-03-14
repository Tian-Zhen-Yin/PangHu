import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 测试用户数据
const testUsers = [
  {
    email: 'test@example.com',
    password: 'password123',
    username: '测试用户'
  }
]

// 测试猫咪数据 - 包含所有四种领养状态
const testCats = [
  // 从小养到大 - 完整的成长记录
  {
    name: '奶糖',
    gender: 'female',
    breed: '英短蓝猫',
    birthDate: new Date('2024-08-01'), // 约6个月大
    adoptDate: new Date('2024-08-01'), // 从小养大
    adoptStatus: 'raisedFromBaby',
    weight: 2.8,
    color: '蓝色',
    features: '圆脸，大眼睛，性格温顺',
    birthDateEstimated: false,
    avatar: 'cats/奶糖.png'  // 使用文件路径
  },
  // 领养（幼年）- 领养的幼年猫咪
  {
    name: '咪咪',
    gender: 'female',
    breed: '橘猫',
    birthDate: new Date('2024-03-15'), // 约11个月大
    adoptDate: new Date('2024-06-01'), // 2个多月时领养
    adoptStatus: 'adoptedYoung',
    weight: 3.5,
    color: '橘白相间',
    features: '活泼好动，喜欢玩玩具',
    birthDateEstimated: false,
    avatar: 'cats/咪咪.png'  // 使用文件路径
  },
  // 领养（成年）- 领养的成年猫咪
  {
    name: '小白',
    gender: 'male',
    breed: '布偶猫',
    birthDate: new Date('2022-05-20'), // 约3岁多
    adoptDate: new Date('2024-02-15'), // 成年后领养
    adoptStatus: 'adoptedAdult',
    weight: 6.5,
    isNeutered: true,
    neuteredDate: new Date('2023-03-10'),
    color: '重点色',
    features: '长毛，体型大，喜欢粘人',
    birthDateEstimated: false,
    avatar: 'cats/小白.png'  // 使用文件路径
  },
  // 年龄不详 - 不知道年龄的猫咪
  {
    name: '花花',
    gender: 'female',
    breed: '狸花猫',
    birthDate: new Date('2022-01-01'), // 估算的出生日期（约4岁）
    adoptDate: new Date('2024-01-10'), // 捡到的流浪猫
    adoptStatus: 'unknownAge',
    weight: 4.2,
    isNeutered: true,
    color: '虎斑纹',
    features: '警惕性高，独立性强',
    birthDateEstimated: true, // 出生日期是估算的
    avatar: 'cats/花花.png'  // 使用文件路径
  }
]

// 疫苗模板
const vaccineTemplates = [
  { name: '猫三联', type: '核心疫苗', clinic: '爱心宠物医院' },
  { name: '狂犬疫苗', type: '核心疫苗', clinic: '瑞派宠物医院' },
  { name: '猫四联', type: '核心疫苗', clinic: '爱心宠物医院' }
]

interface VaccineScheduleItem {
  months: number
  vaccine: typeof vaccineTemplates[0]
  date?: Date
}

// 生成猫咪的疫苗记录
function generateVaccineRecords(catId: string, catBirthDate: Date) {
  const records: any[] = []
  const now = new Date()

  // 幼猫疫苗接种时间表
  const vaccineSchedule: VaccineScheduleItem[] = [
    { months: 2, vaccine: vaccineTemplates[0] },
    { months: 3, vaccine: vaccineTemplates[0] },
    { months: 4, vaccine: vaccineTemplates[0] },
    { months: 4, vaccine: vaccineTemplates[1] }
  ]

  // 成猫加强免疫（每年一次）
  const ageInMonths = (now.getFullYear() - catBirthDate.getFullYear()) * 12 +
                      (now.getMonth() - catBirthDate.getMonth())

  if (ageInMonths > 12) {
    const lastYear = new Date(now)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    vaccineSchedule.push(
      { months: ageInMonths - 12, vaccine: vaccineTemplates[0], date: new Date(lastYear) },
      { months: ageInMonths - 12, vaccine: vaccineTemplates[1], date: new Date(lastYear) }
    )
  }

  vaccineSchedule.forEach(schedule => {
    const vaccineDate = schedule.date || new Date(catBirthDate)
    vaccineDate.setMonth(vaccineDate.getMonth() + schedule.months)

    if (vaccineDate <= now) {
      const nextDueDate = new Date(vaccineDate)
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)

      records.push({
        catId,
        vaccineName: schedule.vaccine.name,
        vaccineType: schedule.vaccine.type,
        vaccinatedAt: vaccineDate,
        nextDueDate: nextDueDate <= now ? null : nextDueDate,
        clinic: schedule.vaccine.clinic,
        veterinarian: ['李医生', '王医生', '张医生'][Math.floor(Math.random() * 3)]
      })
    }
  })

  return records
}

// 生成猫咪的体重记录
function generateWeightRecords(userId: string, catId: string, cat: any) {
  const records: any[] = []
  const now = new Date()
  const birthDate = new Date(cat.birthDate)

  // 从出生后3个月开始记录，每两周一次
  let recordDate = new Date(birthDate)
  recordDate.setMonth(recordDate.getMonth() + 3)

  let baseWeight = cat.gender === 'male' ? 1.2 : 1.0
  let maxWeight = cat.gender === 'male' ? 7.0 : 5.5
  let growthRate = cat.gender === 'male' ? 0.15 : 0.12

  if (cat.breed?.includes('布偶')) {
    baseWeight = 1.5
    maxWeight = cat.gender === 'male' ? 8.5 : 6.5
  }

  // 计算年龄（周和月）
  function calculateAge(bornDate: Date, currentDate: Date) {
    const diffTime = currentDate.getTime() - bornDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return {
      ageWeeks: Math.floor(diffDays / 7),
      ageMonths: Math.floor(diffDays / 30)
    }
  }

  // 幼猫期（3-12月）快速生长
  const twelveMonthsLater = new Date(birthDate)
  twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12)

  while (recordDate.getTime() < now.getTime() && recordDate.getTime() < twelveMonthsLater.getTime()) {
    baseWeight += growthRate * 2
    const { ageWeeks, ageMonths } = calculateAge(birthDate, recordDate)

    records.push({
      userId,
      catId,
      petName: cat.name,
      recordDate: new Date(recordDate),
      weight: Math.min(baseWeight, maxWeight),
      ageWeeks,
      ageMonths,
      photoUrl: '',
      notes: `体重${baseWeight.toFixed(1)}kg，健康成长中`
    })
    recordDate.setDate(recordDate.getDate() + 14)
  }

  // 成年期（12月后）每月记录一次
  while (recordDate.getTime() < now.getTime()) {
    baseWeight += (Math.random() - 0.5) * 0.1
    const { ageWeeks, ageMonths } = calculateAge(birthDate, recordDate)

    records.push({
      userId,
      catId,
      petName: cat.name,
      recordDate: new Date(recordDate),
      weight: Math.max(3, Math.min(baseWeight, maxWeight)),
      ageWeeks,
      ageMonths,
      photoUrl: '',
      notes: '定期体检，健康状况良好'
    })
    recordDate.setMonth(recordDate.getMonth() + 1)
  }

  return records
}

async function main() {
  console.log('🌱 开始生成测试数据...\n')

  try {
    // 清空现有数据
    console.log('🗑️  清理现有测试数据...')
    await prisma.message.deleteMany({})
    await prisma.conversation.deleteMany({})
    await prisma.vaccineRecord.deleteMany({})
    await prisma.petRecord.deleteMany({})
    await prisma.cat.deleteMany({})
    await prisma.user.deleteMany({
      where: { email: { in: testUsers.map(u => u.email) } }
    })
    console.log('✅ 清理完成\n')

    // 创建测试用户
    console.log('👤 创建测试用户...')
    const user = await prisma.user.create({
      data: {
        email: testUsers[0].email,
        username: testUsers[0].username,
        password: await bcrypt.hash(testUsers[0].password, 10)
      }
    })
    console.log(`✅ 用户创建成功: ${user.email} / ${testUsers[0].password}\n`)

    // 创建猫咪及关联数据
    console.log('🐱 创建测试猫咪...')
    for (const catData of testCats) {
      const cat = await prisma.cat.create({
        data: {
          userId: user.id,
          ...catData,
          isNeutered: catData.isNeutered || false
        }
      })
      console.log(`   ✅ ${cat.name} (${cat.breed}) - ${cat.weight}kg`)

      // 创建疫苗记录
      const vaccines = generateVaccineRecords(cat.id, cat.birthDate)
      for (const vaccine of vaccines) {
        await prisma.vaccineRecord.create({ data: vaccine })
      }
      console.log(`      💉 疫苗记录: ${vaccines.length} 条`)

      // 创建体重记录
      const weightRecords = generateWeightRecords(user.id, cat.id, cat)
      for (const record of weightRecords) {
        await prisma.petRecord.create({ data: record })
      }
      console.log(`      📊 体重记录: ${weightRecords.length} 条\n`)
    }

    // 创建示例对话
    console.log('💬 创建示例对话...')
    const cat = await prisma.cat.findFirst({ where: { userId: user.id } })
    if (cat) {
      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          catId: cat.id,
          title: '关于猫咪饮食的咨询'
        }
      })

      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: '我的猫咪最近不爱吃猫粮，怎么办？'
          },
          {
            conversationId: conversation.id,
            role: 'assistant',
            content: `根据${cat.name}的情况（${cat.breed}，${cat.weight}kg），如果突然不爱吃猫粮，可能是以下原因：

1. **挑食**：尝试更换不同口味或品牌的猫粮
2. **健康问题**：观察是否有精神萎靡、呕吐等症状
3. **环境压力**：是否有环境变化导致食欲下降
4. **发情期**：未绝育猫咪在发情期可能食欲下降

建议：
- 逐渐换粮（7天换粮法）
- 检查猫粮是否新鲜
- 观察其他行为是否正常
- 如持续超过2天，建议就医`
          }
        ]
      })
      console.log('   ✅ 示例对话创建成功')
    }

    console.log('\n✨ 测试数据生成完成！')
    console.log('\n📋 登录信息：')
    console.log('   邮箱: test@example.com')
    console.log('   密码: password123')

  } catch (error) {
    console.error('❌ 生成测试数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()

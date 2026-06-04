import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建成长阶段数据...')

  // ── 清空旧数据（注意外键顺序） ──
  await prisma.vaccine.deleteMany()
  await prisma.task.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.stage.deleteMany()

  // ── 阶段数据 ──
  const stages = await Promise.all([
    prisma.stage.create({
      data: {
        name: '新生期',
        ageRange: '0-2周',
        description: '新生幼猫完全依赖母猫，眼睛和耳朵未打开，需要温暖和营养。',
        order: 1,
        minAgeWeeks: 0,
        maxAgeWeeks: 2,
      },
    }),
    prisma.stage.create({
      data: {
        name: '过渡期',
        ageRange: '2-4周',
        description: '幼猫开始睁眼、走路，逐渐从母乳过渡到固体食物。',
        order: 2,
        minAgeWeeks: 2,
        maxAgeWeeks: 4,
      },
    }),
    prisma.stage.create({
      data: {
        name: '幼猫期',
        ageRange: '1-3个月',
        description: '断奶完成，进入快速成长期，疫苗接种和驱虫的关键时期。',
        order: 3,
        minAgeWeeks: 4,
        maxAgeWeeks: 12,
      },
    }),
    prisma.stage.create({
      data: {
        name: '少年期',
        ageRange: '3-6个月',
        description: '换牙期，身体快速发育，性格逐渐形成。',
        order: 4,
        minAgeWeeks: 12,
        maxAgeWeeks: 24,
      },
    }),
    prisma.stage.create({
      data: {
        name: '青年期（半岁至一岁）',
        ageRange: '6-12个月',
        description: '接近成年体型，性成熟，可考虑绝育。',
        order: 5,
        minAgeWeeks: 24,
        maxAgeWeeks: 52,
      },
    }),
    prisma.stage.create({
      data: {
        name: '成年期',
        ageRange: '1-7岁',
        description: '完全成熟，体重稳定，维持健康生活习惯。',
        order: 6,
        minAgeWeeks: 52,
        maxAgeWeeks: null,
      },
    }),
    prisma.stage.create({
      data: {
        name: '老年期',
        ageRange: '7岁以上',
        description: '活动量减少，需要更多健康关注和定期体检。',
        order: 7,
        minAgeWeeks: 364,
        maxAgeWeeks: null,
      },
    }),
  ])

  console.log(`创建了 ${stages.length} 个成长阶段`)

  // ── 里程碑数据 ──
  const milestoneData = [
    // 新生期
    { title: '出生', description: '新生幼猫出生，体重约 80-120g', ageWeeks: 0, icon: '🎉', stageId: stages[0]!.id },
    { title: '脐带脱落', description: '脐带通常在出生后 3-5 天自然脱落', ageWeeks: 0.5, icon: '🧵', stageId: stages[0]!.id },
    { title: '开始睁眼', description: '眼睛通常在 7-14 天开始睁开', ageWeeks: 1.5, icon: '👁️', stageId: stages[0]!.id },
    // 过渡期
    { title: '眼睛完全睁开', description: '眼睛完全睁开，开始对光线有反应', ageWeeks: 2, icon: '👀', stageId: stages[1]!.id },
    { title: '开始爬行', description: '开始用四肢爬行探索周围环境', ageWeeks: 2.5, icon: '🐾', stageId: stages[1]!.id },
    { title: '乳牙萌出', description: '乳牙开始长出，通常先长门齿', ageWeeks: 3, icon: '🦷', stageId: stages[1]!.id },
    { title: '开始走路', description: '开始摇摇晃晃地走路', ageWeeks: 3.5, icon: '🚶', stageId: stages[1]!.id },
    // 幼猫期
    { title: '断奶完成', description: '完全过渡到固体食物', ageWeeks: 8, icon: '🍽️', stageId: stages[2]!.id },
    { title: '第一次驱虫', description: '进行第一次体内外驱虫', ageWeeks: 6, icon: '💊', stageId: stages[2]!.id },
    { title: '第一针疫苗', description: '接种第一针猫三联疫苗', ageWeeks: 8, icon: '💉', stageId: stages[2]!.id },
    // 少年期
    { title: '换牙期', description: '乳牙开始脱落，恒牙逐渐长出', ageWeeks: 12, icon: '🦷', stageId: stages[3]!.id },
    { title: '第二针疫苗', description: '接种第二针猫三联疫苗', ageWeeks: 12, icon: '💉', stageId: stages[3]!.id },
    { title: '狂犬疫苗', description: '接种狂犬疫苗（可选，根据当地法规）', ageWeeks: 16, icon: '💉', stageId: stages[3]!.id },
    { title: '快速成长期', description: '身体快速长高长壮', ageWeeks: 16, icon: '📏', stageId: stages[3]!.id },
    // 青年期
    { title: '性成熟', description: '进入性成熟期，可能出现发情行为', ageWeeks: 28, icon: '💕', stageId: stages[4]!.id },
    { title: '考虑绝育', description: '建议在首次发情后进行绝育手术', ageWeeks: 32, icon: '🏥', stageId: stages[4]!.id },
    { title: '成年体型', description: '接近或达到成年体型', ageWeeks: 48, icon: '📐', stageId: stages[4]!.id },
    // 成年期
    { title: '体重稳定', description: '体重趋于稳定，注意控制防止肥胖', ageWeeks: 60, icon: '⚖️', stageId: stages[5]!.id },
    { title: '年度体检', description: '建议每年进行一次全面体检', ageWeeks: 104, icon: '🏥', stageId: stages[5]!.id },
    { title: '生活规律', description: '形成稳定的日常作息和习惯', ageWeeks: 80, icon: '📋', stageId: stages[5]!.id },
    // 老年期
    { title: '进入老年', description: '开始进入老年期，活动量减少', ageWeeks: 365, icon: '👴', stageId: stages[6]!.id },
    { title: '半年体检', description: '建议每半年进行一次全面体检', ageWeeks: 380, icon: '🏥', stageId: stages[6]!.id },
    { title: '关节护理', description: '注意关节健康，可补充关节保健营养', ageWeeks: 400, icon: '🦴', stageId: stages[6]!.id },
  ]

  for (const m of milestoneData) {
    await prisma.milestone.create({ data: m })
  }
  console.log(`创建了 ${milestoneData.length} 个里程碑`)

  // ── 任务数据 ──
  const taskData = [
    // 新生期
    { title: '保持环境温暖', description: '维持环境温度 29-32°C，使用保温垫或暖水袋', category: 'care', priority: 1, stageId: stages[0]!.id },
    { title: '每日称重', description: '每天记录体重，确保正常增长（每日增加 10-15g）', category: 'health', priority: 1, stageId: stages[0]!.id },
    { title: '刺激排便', description: '每次喂奶后用湿棉签刺激肛门帮助排便', category: 'care', priority: 2, stageId: stages[0]!.id },
    // 过渡期
    { title: '引导使用猫砂盆', description: '开始引导幼猫使用猫砂盆', category: 'training', priority: 1, stageId: stages[1]!.id },
    { title: '引入固体食物', description: '在奶粉中逐渐加入离乳期猫粮糊', category: 'feeding', priority: 1, stageId: stages[1]!.id },
    { title: '社交化训练', description: '让幼猫接触不同的人和温和的声音', category: 'training', priority: 2, stageId: stages[1]!.id },
    // 幼猫期
    { title: '第一次驱虫', description: '进行体内外驱虫，每 2-4 周一次直至 6 个月', category: 'health', priority: 1, stageId: stages[2]!.id },
    { title: '第一针猫三联疫苗', description: '6-8 周龄接种第一针猫三联疫苗', category: 'health', priority: 1, stageId: stages[2]!.id },
    { title: '完成断奶', description: '完全过渡到幼猫粮固体食物', category: 'feeding', priority: 2, stageId: stages[2]!.id },
    { title: '基础健康检查', description: '带幼猫做第一次全面健康检查', category: 'health', priority: 2, stageId: stages[2]!.id },
    // 少年期
    { title: '第二针猫三联疫苗', description: '12 周龄接种第二针猫三联疫苗', category: 'health', priority: 1, stageId: stages[3]!.id },
    { title: '狂犬疫苗', description: '12-16 周龄接种狂犬疫苗', category: 'health', priority: 2, stageId: stages[3]!.id },
    { title: '定期驱虫', description: '每月进行一次体内外驱虫', category: 'health', priority: 1, stageId: stages[3]!.id },
    { title: '牙齿护理', description: '开始建立刷牙习惯，使用宠物专用牙膏', category: 'care', priority: 3, stageId: stages[3]!.id },
    // 青年期
    { title: '考虑绝育手术', description: '咨询兽医，安排绝育手术', category: 'health', priority: 1, stageId: stages[4]!.id },
    { title: '过渡到成猫粮', description: '逐渐将幼猫粮过渡为成猫粮', category: 'feeding', priority: 2, stageId: stages[4]!.id },
    { title: '第三针猫三联疫苗', description: '如果兽医建议，接种第三针加强', category: 'health', priority: 2, stageId: stages[4]!.id },
    { title: '体重管理', description: '开始关注体重，防止过度肥胖', category: 'health', priority: 2, stageId: stages[4]!.id },
    // 成年期
    { title: '年度体检', description: '每年进行一次全面健康检查', category: 'health', priority: 1, stageId: stages[5]!.id },
    { title: '年度疫苗加强', description: '每年接种猫三联疫苗加强针', category: 'health', priority: 1, stageId: stages[5]!.id },
    { title: '每季度驱虫', description: '每 3 个月进行一次体内外驱虫', category: 'health', priority: 1, stageId: stages[5]!.id },
    { title: '牙齿清洁', description: '每周刷牙 2-3 次，定期检查口腔健康', category: 'care', priority: 2, stageId: stages[5]!.id },
    { title: '体重监控', description: '每月称重，保持健康体重范围', category: 'health', priority: 2, stageId: stages[5]!.id },
    // 老年期
    { title: '半年体检', description: '每半年进行一次全面健康检查', category: 'health', priority: 1, stageId: stages[6]!.id },
    { title: '肾功能检查', description: '定期检查肾功能，关注老年常见疾病', category: 'health', priority: 1, stageId: stages[6]!.id },
    { title: '关节保健', description: '补充关节保健营养品，提供软垫休息区', category: 'care', priority: 2, stageId: stages[6]!.id },
    { title: '调整饮食', description: '过渡到易消化的老年猫专用粮', category: 'feeding', priority: 2, stageId: stages[6]!.id },
    { title: '牙齿检查', description: '定期检查牙齿和牙龈健康', category: 'health', priority: 2, stageId: stages[6]!.id },
  ]

  for (const t of taskData) {
    await prisma.task.create({ data: t })
  }
  console.log(`创建了 ${taskData.length} 个任务`)

  // ── 疫苗数据 ──
  const vaccineData = [
    { name: '猫三联疫苗（第一针）', ageWeeks: 8, description: '预防猫瘟、猫鼻支、猫杯状病毒', stageId: stages[2]!.id },
    { name: '猫三联疫苗（第二针）', ageWeeks: 12, description: '加强免疫，巩固抗体水平', stageId: stages[3]!.id },
    { name: '猫三联疫苗（第三针）', ageWeeks: 16, description: '加强免疫，完成基础免疫程序', stageId: stages[3]!.id },
    { name: '狂犬疫苗', ageWeeks: 16, description: '预防狂犬病，法律要求的疫苗接种', stageId: stages[3]!.id },
    { name: '猫三联疫苗（年度加强）', ageWeeks: 56, description: '每年加强免疫一次', stageId: stages[4]!.id },
    { name: '狂犬疫苗（年度加强）', ageWeeks: 68, description: '每年加强免疫一次', stageId: stages[4]!.id },
    { name: '成猫年度加强疫苗', ageWeeks: 104, description: '成年猫每年一次的常规免疫加强', stageId: stages[5]!.id },
    { name: '老年猫疫苗评估', ageWeeks: 365, description: '根据健康状况评估是否需要接种', stageId: stages[6]!.id },
  ]

  for (const v of vaccineData) {
    await prisma.vaccine.create({ data: v })
  }
  console.log(`创建了 ${vaccineData.length} 个疫苗记录`)

  console.log('成长阶段数据创建完成！')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

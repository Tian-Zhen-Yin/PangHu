import prisma from '../config/database'

/**
 * 数据种子 - 猫咪成长阶段数据
 */
async function main() {
  console.log('开始种子数据...')

  // 清理现有数据
  await prisma.vaccine.deleteMany({})
  await prisma.task.deleteMany({})
  await prisma.milestone.deleteMany({})
  await prisma.stage.deleteMany({})
  console.log('已清理现有数据')

  // 创建成长阶段
  const stages = await Promise.all([
    // 新生期 (0-2周)
    prisma.stage.create({
      data: {
        name: '新生期',
        ageRange: '0-2周',
        description: '刚出生的小猫非常脆弱，完全依赖母猫的照顾。这个阶段主要关注保温、哺乳和健康监测。',
        order: 1,
        minAgeWeeks: 0,
        maxAgeWeeks: 2,
        milestones: {
          create: [
            { title: '睁开眼睛', description: '小猫通常在7-10天左右睁开眼睛', ageWeeks: 1, icon: '👀' },
            { title: '开始听声音', description: '耳朵开始张开，能听到声音', ageWeeks: 2, icon: '👂' }
          ]
        },
        tasks: {
          create: [
            { title: '保持温暖', description: '确保环境温度在28-30°C', category: 'care', priority: 1 },
            { title: '监测体重', description: '每天称重，确保体重增长', category: 'health', priority: 1 },
            { title: '观察哺乳情况', description: '确保每只小猫都能吃到母乳', category: 'feeding', priority: 1 }
          ]
        },
        vaccines: {
          create: [
            { name: '驱虫（体内）', description: '如有需要，可在2周龄进行第一次驱虫', ageWeeks: 2 }
          ]
        }
      }
    }),

    // 过渡期 (2-4周)
    prisma.stage.create({
      data: {
        name: '过渡期',
        ageRange: '2-4周',
        description: '小猫开始探索世界，学习走路和玩耍。是开始断奶和猫砂训练的重要时期。',
        order: 2,
        minAgeWeeks: 2,
        maxAgeWeeks: 4,
        milestones: {
          create: [
            { title: '开始走路', description: '从摇晃到稳步行走', ageWeeks: 3, icon: '🚶' },
            { title: '开始玩耍', description: '与兄弟姐妹互动玩耍', ageWeeks: 3, icon: '🎾' },
            { title: '开始吃固体食物', description: '可以尝试少量湿粮', ageWeeks: 4, icon: '🍽️' }
          ]
        },
        tasks: {
          create: [
            { title: '引入猫砂盆', description: '放置低矮的猫砂盆，引导使用', category: 'training', priority: 1 },
            { title: '开始断奶', description: '逐渐引入幼猫湿粮', category: 'feeding', priority: 1 },
            { title: '增加活动空间', description: '提供安全的空间供其探索', category: 'care', priority: 2 }
          ]
        }
      }
    }),

    // 社交期 (4-12周)
    prisma.stage.create({
      data: {
        name: '社交期',
        ageRange: '4-12周',
        description: '这是小猫社交化的关键时期！需要充分接触人类和各种体验，培养性格。',
        order: 3,
        minAgeWeeks: 4,
        maxAgeWeeks: 12,
        milestones: {
          create: [
            { title: '完全断奶', description: '完全过渡到固体食物', ageWeeks: 8, icon: '🥣' },
            { title: '学习捕猎技能', description: '通过玩耍学习扑咬技巧', ageWeeks: 6, icon: '🐭' },
            { title: '性格形成', description: '开始展现个性特征', ageWeeks: 8, icon: '😸' }
          ]
        },
        tasks: {
          create: [
            { title: '大量社交互动', description: '每天与多人互动，培养亲人性', category: 'training', priority: 1 },
            { title: '第一针疫苗', description: '通常在6-8周接种第一针猫三联', category: 'health', priority: 1 },
            { title: '环境声音训练', description: '让小猫接触各种日常声音', category: 'training', priority: 2 },
            { title: '建立日常作息', description: '建立规律的喂食和玩耍时间', category: 'care', priority: 2 }
          ]
        },
        vaccines: {
          create: [
            { name: '猫三联（第一针）', description: '预防猫瘟、猫鼻支、猫杯状病毒', ageWeeks: 6 },
            { name: '猫三联（第二针）', description: '间隔3-4周接种第二针', ageWeeks: 10 }
          ]
        }
      }
    }),

    // 幼猫期 (3-6个月)
    prisma.stage.create({
      data: {
        name: '幼猫期',
        ageRange: '3-6个月',
        description: '快速成长期，精力旺盛，需要大量营养和运动。也是绝育手术的推荐时间。',
        order: 4,
        minAgeWeeks: 12,
        maxAgeWeeks: 26,
        milestones: {
          create: [
            { title: '换牙期', description: '开始更换乳牙为恒牙', ageWeeks: 16, icon: '🦷' },
            { title: '性成熟开始', description: '开始进入青春期', ageWeeks: 20, icon: '💕' }
          ]
        },
        tasks: {
          create: [
            { title: '安排绝育手术', description: '建议在5-6个月大时进行绝育', category: 'health', priority: 1 },
            { title: '第三针疫苗', description: '完成疫苗接种系列', category: 'health', priority: 1 },
            { title: '增加互动玩耍', description: '每天至少30分钟互动', category: 'training', priority: 2 },
            { title: '开始梳毛习惯', description: '定期梳毛，适应被触摸', category: 'care', priority: 2 }
          ]
        },
        vaccines: {
          create: [
            { name: '猫三联（第三针）', description: '完成基础免疫', ageWeeks: 14 },
            { name: '狂犬疫苗', description: '接种狂犬病疫苗', ageWeeks: 16 }
          ]
        }
      }
    }),

    // 青春期 (6-12个月)
    prisma.stage.create({
      data: {
        name: '青春期',
        ageRange: '6-12个月',
        description: '青少年阶段，可能表现出挑战性行为。需要持续的训练和社交。',
        order: 5,
        minAgeWeeks: 26,
        maxAgeWeeks: 52,
        milestones: {
          create: [
            { title: '接近成年体型', description: '体型接近成年猫', ageWeeks: 40, icon: '📏' },
            { title: '性格稳定', description: '成年性格逐渐显现', ageWeeks: 48, icon: '😼' }
          ]
        },
        tasks: {
          create: [
            { title: '调整饮食', description: '从幼猫粮逐渐过渡到成猫粮', category: 'feeding', priority: 1 },
            { title: '年度体检', description: '进行全面健康检查', category: 'health', priority: 1 },
            { title: '行为训练', description: '纠正不良行为', category: 'training', priority: 2 }
          ]
        }
      }
    }),

    // 成年期 (1岁+)
    prisma.stage.create({
      data: {
        name: '成年期',
        ageRange: '1岁+',
        description: '猫咪已完全成年，进入稳定的生活阶段。需要定期的健康检查和持续的关爱。',
        order: 6,
        minAgeWeeks: 52,
        maxAgeWeeks: null,
        milestones: {
          create: [
            { title: '完全成熟', description: '身体和心理完全成熟', ageWeeks: 52, icon: '🎉' }
          ]
        },
        tasks: {
          create: [
            { title: '定期体检', description: '每年至少一次健康检查', category: 'health', priority: 1 },
            { title: '疫苗接种续种', description: '根据需要接种加强针', category: 'health', priority: 1 },
            { title: '体重管理', description: '监控体重，防止肥胖', category: 'health', priority: 2 },
            { title: '牙齿护理', description: '关注口腔健康', category: 'care', priority: 2 },
            { title: '持续互动', description: '保持每天的互动和玩耍', category: 'training', priority: 2 }
          ]
        }
      }
    })
  ])

  console.log(`创建了 ${stages.length} 个成长阶段`)

  // 创建指南分类
  const categories = await Promise.all([
    prisma.guideCategory.create({
      data: { name: '喂养营养', slug: 'feeding', icon: '🍼', description: '关于猫咪饮食和营养的知识', order: 1 }
    }),
    prisma.guideCategory.create({
      data: { name: '环境准备', slug: 'environment', icon: '🏠', description: '为猫咪准备舒适的生活环境', order: 2 }
    }),
    prisma.guideCategory.create({
      data: { name: '健康医疗', slug: 'health', icon: '💊', description: '猫咪健康和医疗相关知识', order: 3 }
    }),
    prisma.guideCategory.create({
      data: { name: '行为训练', slug: 'training', icon: '🎾', description: '猫咪行为理解和训练技巧', order: 4 }
    }),
    prisma.guideCategory.create({
      data: { name: '日常护理', slug: 'care', icon: '🧼', description: '日常护理和清洁技巧', order: 5 }
    }),
    prisma.guideCategory.create({
      data: { name: '常见问题', slug: 'faq', icon: '❓', description: '常见问题解答', order: 6 }
    })
  ])

  console.log(`创建了 ${categories.length} 个指南分类`)

  // 创建示例指南
  await Promise.all([
    prisma.guide.create({
      data: {
        title: '新生小猫如何保暖？',
        slug: 'how-to-keep-newborn-kitten-warm',
        content: `# 新生小猫如何保暖？

新生小猫（0-2周）无法自我调节体温，保持适当的温度至关重要。

## 温度要求

| 年龄 | 环境温度 |
|------|----------|
| 0-1周 | 28-30°C |
| 1-2周 | 26-28°C |
| 2-3周 | 24-26°C |

## 保暖方法

1. **加热垫**：使用宠物专用加热垫，放在毯子下方
2. **热水瓶**：用毛巾包裹热水瓶，避免直接接触
3. **取暖灯**：使用陶瓷取暖灯（注意保持距离）

## 注意事项

- 确保温暖设备不会造成烫伤
- 保持适当的湿度（40-60%）
- 定期检查小猫体温（肛温应在36-38°C）
`,
        excerpt: '新生小猫无法自我调节体温，保持28-30°C的环境温度至关重要。',
        categoryId: categories[0].id
      }
    }),
    prisma.guide.create({
      data: {
        title: '小猫什么时候开始断奶？',
        slug: 'when-to-start-weaning',
        content: `# 小猫什么时候开始断奶？

小猫通常在3-4周大时开始断奶过程，到8周左右完全断奶。

## 断奶时间线

- **3-4周**：开始尝试少量幼猫湿粮
- **5-6周**：逐渐增加固体食物比例
- **7-8周**：完全过渡到固体食物

## 断奶步骤

1. 选择高质量的幼猫湿粮
2. 用温水或羊奶调成糊状
3. 放在浅盘子里让小猫尝试
4. 逐渐减少奶的供应
5. 确保小猫吃够量

## 注意事项

- 断奶是一个渐进过程，不要急于求成
- 确保小猫体重持续增长
- 提供充足的清洁饮水
`,
        excerpt: '小猫在3-4周大时开始断奶，到8周左右完全断奶。',
        categoryId: categories[0].id
      }
    }),
    prisma.guide.create({
      data: {
        title: '猫咪疫苗接种时间表',
        slug: 'vaccination-schedule',
        content: `# 猫咪疫苗接种时间表

按时接种疫苗是保护猫咪健康的重要措施。

## 核心疫苗

### 猫三联疫苗（FVRCP）

预防：猫瘟、猫鼻支、猫杯状病毒

| 年龄 | 接种时间 |
|------|----------|
| 6-8周 | 第一针 |
| 10-12周 | 第二针（间隔3-4周） |
| 14-16周 | 第三针（加强） |

### 狂犬疫苗

| 年龄 | 接种时间 |
|------|----------|
| 12-16周 | 第一针 |

## 后续续种

- **猫三联**：首次免疫后，1年后续种，之后每3年一次
- **狂犬疫苗**：根据当地法规，通常每年或每3年续种一次

## 注意事项

- 接种前确保猫咪健康状况良好
- 接种后观察是否有不良反应
- 保存好疫苗接种记录
`,
        excerpt: '猫咪需要在6-8周开始接种猫三联疫苗，之后按照时间表完成接种。',
        categoryId: categories[2].id
      }
    })
  ])

  console.log('创建了示例知识指南')

  // 创建计划模板
  await Promise.all([
    prisma.template.create({
      data: {
        name: '新手入门计划',
        description: '适合第一次养猫的新手，涵盖前3个月的重要事项',
        category: '新手',
        stageId: stages[2].id,
        content: JSON.stringify({
          tasks: [
            '准备猫砂盆、食盆、水盆等基本用品',
            '选择合适的幼猫粮',
            '预约兽医进行首次健康检查',
            '开始疫苗接种计划',
            '每天进行社交互动',
            '建立规律的作息时间'
          ]
        })
      }
    }),
    prisma.template.create({
      data: {
        name: '疫苗接种提醒',
        description: '跟踪猫咪的疫苗接种进度',
        category: '健康',
        stageId: stages[2].id,
        content: JSON.stringify({
          schedule: [
            { age: '6-8周', vaccine: '猫三联第一针' },
            { age: '10-12周', vaccine: '猫三联第二针' },
            { age: '14-16周', vaccine: '猫三联第三针 + 狂犬疫苗' }
          ],
          reminders: [
            '每次接种间隔3-4周',
            '接种后观察猫咪状态',
            '保存好接种记录'
          ]
        })
      }
    })
  ])

  console.log('创建了计划模板')
  console.log('种子数据创建完成！')
}

main()
  .catch((e) => {
    console.error('创建种子数据时出错:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建养猫指南数据...')

  // 创建分类
  const categories = await prisma.guideCategory.createMany({
    data: [
      {
        name: '幼猫护理',
        slug: 'kitten',
        icon: '🐱',
        description: '新生幼猫到6个月的护理指南',
        order: 1
      },
      {
        name: '喂养营养',
        slug: 'feeding',
        icon: '🍖',
        description: '不同阶段的喂养和营养指南',
        order: 2
      },
      {
        name: '健康医疗',
        slug: 'health',
        icon: '💊',
        description: '猫咪健康和医疗护理',
        order: 3
      },
      {
        name: '疫苗接种',
        slug: 'vaccine',
        icon: '💉',
        description: '疫苗接种时间和注意事项',
        order: 4
      },
      {
        name: '行为训练',
        slug: 'behavior',
        icon: '🎯',
        description: '猫咪行为理解和训练',
        order: 5
      }
    ],
    skipDuplicates: true
  })

  console.log(`创建了 ${categories.count} 个分类`)

  // 获取分类用于关联
  const categoryData = await prisma.guideCategory.findMany()
  const categoryMap = new Map(categoryData.map(c => [c.slug, c.id]))

  // 创建指南
  const guides = [
    {
      title: '新生幼猫护理完全指南',
      slug: 'newborn-kitten-care',
      categoryId: categoryMap.get('kitten')!,
      content: `# 新生幼猫护理完全指南

## 初到新家

新生幼猫（0-4周）需要特别细心的照顾。这个阶段的幼猫眼睛刚睁开，行动能力有限，需要人工喂养和保暖。

## 体温调节
- 新生幼猫无法自己调节体温
- 环境温度应保持在 29-32°C
- 使用保温垫或温暖毯子
- 避免直接接触加热源

## 喂养要点
- 使用宠物专用奶粉
- 每2-3小时喂一次
- 奶温保持在 37-38°C
- 每次喂奶后要帮助排尿

## 健康观察
- 体重增长：每天应增加 10-15g
- 活跃度：健康的幼猫会蠕动和发出声音
- 脐带：保持干燥清洁`,
      excerpt: '新生幼猫（0-4周）的护理要点，包括体温调节、喂养方法和健康观察。'
    },
    {
      title: '幼猫疫苗接种时间表',
      slug: 'kitten-vaccination-schedule',
      categoryId: categoryMap.get('vaccine')!,
      content: `# 幼猫疫苗接种时间表

## 核心疫苗

### 6-8周龄
- 猫三联疫苗（FVRCP）第一针
- 预防：猫瘟、猫鼻支、猫杯状病毒

### 10-12周龄
- 猫三联疫苗第二针
- 狂犬疫苗第一针

### 14-16周龄
- 猫三联疫苗第三针
- 狂犬疫苗第二针

## 注意事项

- 接种前确保幼猫健康
- 接种后观察7-10天，注意异常反应
- 完成接种前避免外出
- 每年需要加强免疫`,
      excerpt: '详细的幼猫疫苗接种时间表，包括核心疫苗种类和接种注意事项。'
    },
    {
      title: '猫咪不同年龄段的喂养指南',
      slug: 'cat-feeding-guide-by-age',
      categoryId: categoryMap.get('feeding')!,
      content: `# 猫咪不同年龄段的喂养指南

## 幼猫期（0-12个月）

### 0-2个月
- 以母乳或宠物奶粉为主
- 每2-3小时喂一次
- 逐渐引入离乳期食品

### 2-6个月
- 换牙期，提供软质食物
- 少食多餐，每天4-5次
- 选择高蛋白幼猫粮

### 6-12个月
- 逐渐过渡到成猫粮
- 每天3次喂食
- 控制零食量

## 成猫期（1-7岁）
- 根据体重选择成猫粮
- 每天定时喂食2次
- 提供充足的清水
- 适量补充湿粮

## 老年猫（7岁以上）
- 选择易消化的老年猫粮
- 增加喂食次数
- 注意补充关节保健营养
- 定期检查肾功能`,
      excerpt: '猫咪从幼猫到成猫再到老年猫的完整喂养指南，包括不同年龄段的饮食重点。'
    },
    {
      title: '常见猫咪疾病识别与预防',
      slug: 'common-cat-diseases-prevention',
      categoryId: categoryMap.get('health')!,
      content: `# 常见猫咪疾病识别与预防

## 上呼吸道感染
### 症状
- 打喷嚏、流鼻涕
- 眼睛分泌物增多
- 食欲下降

### 预防
- 按时接种疫苗
- 保持室内空气流通
- 避免接触病猫

## 泌尿系统疾病
### 症状
- 频繁如厕但尿量少
- 尿血或尿中带血
- 如厕时发出叫声

### 预防
- 提供充足的清水
- 选择湿粮或干湿搭配
- 保持猫砂盆清洁

## 胃肠道问题
### 症状
- 呕吐、腹泻
- 食欲不振
- 精神萎靡

### 预防
- 定期驱虫
- 避免突然换粮
- 提供清洁食物`,
      excerpt: '猫咪常见疾病的症状识别方法和预防措施，包括呼吸道感染、泌尿系统疾病和肠胃问题。'
    },
    {
      title: '猫咪行为训练基础',
      slug: 'cat-behavior-training-basics',
      categoryId: categoryMap.get('behavior')!,
      content: `# 猫咪行为训练基础

## 猫砂盆训练

### 训练要点
- 幼猫到新家立即带入猫砂盆
- 将猫咪放入猫砂盆，让其熟悉
- 定期清理猫砂盆
- 猫砂盆数量：猫咪数量 + 1

### 问题处理
- 如厕地点不对：及时清理并用除臭剂
- 突然不使用猫砂盆：检查是否有疾病

## 磨爪训练

### 正确引导
- 提供合适的猫抓板
- 在家具附近放置猫抓板
- 使用猫薄荷吸引

### 避免抓家具
- 定期修剪指甲
- 使用防抓喷剂
- 提供足够的玩具

## 社交训练

### 早期社会化
- 2-7周是关键期
- 让幼猫接触不同的人和环境
- 正面体验各种情况

### 成年猫训练
- 使用正向强化
- 避免惩罚
- 保持耐心和一致性`,
      excerpt: '猫咪基本行为训练方法，包括猫砂盆训练、磨爪训练和社交训练的技巧。'
    }
  ]

  for (const guide of guides) {
    await prisma.guide.create({
      data: {
        ...guide,
        viewCount: Math.floor(Math.random() * 100) // 随机浏览量
      }
    })
  }

  console.log(`创建了 ${guides.length} 个指南`)

  console.log('数据创建完成！')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
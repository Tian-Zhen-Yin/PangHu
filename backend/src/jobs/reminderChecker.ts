/**
 * 提醒检查定时任务
 *
 * 每小时检查一次需要发送的提醒：
 * - 疫苗到期前 7/3/1 天提醒
 * - 体重异常提醒
 * - 记录提醒
 */

import cron from 'node-cron'
import prisma from '../config/database'
import { sendNotification, type NotificationData } from '../services/notification.service'

/**
 * 检查并发送疫苗到期提醒
 */
async function checkVaccineReminders() {
  console.log('[Reminder Checker] Checking vaccine reminders...')

  try {
    // 获取所有用户的疫苗记录
    const vaccines = await prisma.vaccineRecord.findMany({
      where: {
        nextDueDate: {
          not: null,
        },
      },
      include: {
        cat: {
          include: {
            user: true,
          },
        },
      },
    })

    const now = new Date()
    const remindersToCreate: NotificationData[] = []

    for (const vaccine of vaccines) {
      const userId = vaccine.cat.userId
      const catName = vaccine.cat.name
      const vaccineName = vaccine.vaccineName
      const nextDueDate = vaccine.nextDueDate!

      // 计算距离到期的天数
      const daysUntilDue = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // 检查是否需要发送提醒（7天、3天、1天前）
      const advanceDays = [7, 3, 1]
      if (advanceDays.includes(daysUntilDue)) {
        // 检查是否已经发送过该提前天数的提醒
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'vaccine',
            relatedId: vaccine.id,
            scheduledAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 最近24小时
            },
          },
        })

        if (!existingNotification) {
          remindersToCreate.push({
            userId,
            type: 'vaccine',
            title: `疫苗即将到期`,
            content: `${catName}的${vaccineName}将在${daysUntilDue}天后到期（${nextDueDate.toLocaleDateString()}），请及时预约接种。`,
            relatedId: vaccine.id,
            relatedType: 'vaccine',
            scheduledAt: now,
          })
        }
      }

      // 到期当天也提醒
      if (daysUntilDue === 0) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'vaccine',
            relatedId: vaccine.id,
            scheduledAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
          },
        })

        if (!existingNotification) {
          remindersToCreate.push({
            userId,
            type: 'vaccine',
            title: `疫苗今天到期`,
            content: `${catName}的${vaccineName}今天到期（${nextDueDate.toLocaleDateString()}），请尽快安排接种。`,
            relatedId: vaccine.id,
            relatedType: 'vaccine',
            scheduledAt: now,
          })
        }
      }
    }

    // 发送提醒
    let sentCount = 0
    for (const reminder of remindersToCreate) {
      const sent = await sendNotification(reminder)
      if (sent) sentCount++
    }

    console.log(`[Reminder Checker] Vaccine reminders sent: ${sentCount}/${remindersToCreate.length}`)
  } catch (error) {
    console.error('[Reminder Checker] Error checking vaccine reminders:', error)
  }
}

/**
 * 检查体重异常提醒
 */
async function checkWeightReminders() {
  console.log('[Reminder Checker] Checking weight reminders...')

  try {
    // 获取所有有体重记录的猫咪
    const cats = await prisma.cat.findMany({
      where: {
        isActive: true,
        weight: {
          not: null,
        },
      },
    })

    const now = new Date()

    for (const cat of cats) {
      // 获取最近30天的体重记录
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const recentRecords = await prisma.petRecord.findMany({
        where: {
          catId: cat.id,
          recordDate: {
            gte: thirtyDaysAgo,
          },
          weight: {
            not: null as any,
          },
        },
        orderBy: {
          recordDate: 'asc',
        },
      })

      if (recentRecords.length < 2) continue

      // 检查体重是否异常变化（短时间内大幅下降或上升）
      const firstWeight = recentRecords[0].weight!
      const lastWeight = recentRecords[recentRecords.length - 1].weight!
      const weightChange = lastWeight - firstWeight
      const weightChangePercent = (Math.abs(weightChange) / firstWeight) * 100

      // 体重变化超过20%视为异常
      if (weightChangePercent > 20) {
        // 检查是否已经发送过提醒
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: cat.userId,
            type: 'weight',
            relatedId: cat.id,
            scheduledAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 最近7天
            },
          },
        })

        if (!existingNotification) {
          const isWeightLoss = weightChange < 0
          await sendNotification({
            userId: cat.userId,
            type: 'weight',
            title: `体重异常${isWeightLoss ? '下降' : '上升'}`,
            content: `${cat.name}的体重在近期${isWeightLoss ? '下降' : '上升'}了约${weightChangePercent.toFixed(1)}%，建议关注并咨询兽医。`,
            relatedId: cat.id,
            relatedType: 'cat',
            scheduledAt: now,
          })
        }
      }

      // 检查是否超过7天没有记录体重
      const lastRecord = recentRecords[recentRecords.length - 1]
      const daysSinceLastRecord = Math.floor(
        (now.getTime() - lastRecord.recordDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceLastRecord >= 7) {
        // 检查是否已经发送过提醒
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: cat.userId,
            type: 'record',
            relatedId: cat.id,
            scheduledAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        })

        if (!existingNotification) {
          await sendNotification({
            userId: cat.userId,
            type: 'record',
            title: `记录体重提醒`,
            content: `${cat.name}已经${daysSinceLastRecord}天没有记录体重了，建议定期记录以监测健康状况。`,
            relatedId: cat.id,
            relatedType: 'cat',
            scheduledAt: now,
          })
        }
      }
    }

    console.log('[Reminder Checker] Weight reminders checked')
  } catch (error) {
    console.error('[Reminder Checker] Error checking weight reminders:', error)
  }
}

/**
 * 执行所有提醒检查
 */
export async function checkAndSendReminders() {
  console.log('[Reminder Checker] Running reminder check at:', new Date().toISOString())

  await checkVaccineReminders()
  await checkWeightReminders()

  console.log('[Reminder Checker] Reminder check completed')
}

/**
 * 启动定时任务
 */
export function startReminderScheduler() {
  // 每小时的第0分钟执行
  cron.schedule('0 * * * *', async () => {
    try {
      await checkAndSendReminders()
    } catch (error) {
      console.error('[Reminder Scheduler] Error:', error)
    }
  })

  console.log('[Reminder Scheduler] Started - runs every hour')
}

// 如果直接运行此文件，执行一次检查
if (require.main === module) {
  checkAndSendReminders()
    .then(() => {
      console.log('[Reminder Checker] Completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[Reminder Checker] Error:', error)
      process.exit(1)
    })
}

import prisma from '../config/database'
import { hashPassword } from '../utils/password'

export async function seedAdmins() {
  console.log('Seeding admins...')

  // Check if admins already exist
  const existingAdmins = await prisma.admin.count()
  if (existingAdmins > 0) {
    console.log('Admins already exist, skipping seed')
    return
  }

  const admins = [
    {
      username: 'admin',
      password: await hashPassword('Admin@123'),
      role: 'admin',
      name: '系统管理员',
      email: 'admin@example.com'
    },
    {
      username: 'super',
      password: await hashPassword('Super@123'),
      role: 'super',
      name: '超级管理员',
      email: 'super@example.com'
    }
  ]

  for (const admin of admins) {
    await prisma.admin.create({ data: admin })
    console.log(`Created admin: ${admin.username}`)
  }

  console.log('Admin seed completed')
}

// 注意:同 weightStandards——esbuild bundle 中 require.main guard 恒真,禁止加 CLI 直跑入口

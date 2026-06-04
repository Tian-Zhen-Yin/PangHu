import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import apiRoutes from './routes/index'
import { errorHandler, notFoundHandler } from './middlewares/error'
import { startReminderScheduler } from './jobs/reminderChecker'

const app = express()
const PORT = process.env.PORT || 3000

// 安全头
app.use(helmet())

// CORS 配置 — 允许开发和生产环境
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // 允许不带 origin 的请求（如 curl、服务端调用）
    // 允许所有 localhost 来源（开发环境端口可变）
    if (!origin || origin.startsWith('http://localhost') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true,
}))

// 全局 API 限流：每 15 分钟 500 次
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
})
app.use('/api', globalLimiter)

// 认证接口严格限流：每 15 分钟 20 次
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '登录/注册尝试次数过多，请稍后再试' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// AI 聊天限流：每分钟 10 次
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI 聊天请求过于频繁，请稍后再试' },
})
app.use('/api/chat', chatLimiter)

// Body 大小限制
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// API路由
app.use('/api', apiRoutes)

// 诊断端点 — 检查模块加载状态
app.get('/api/debug', (_req, res) => {
  const checks: Record<string, string> = {}
  try { require('@prisma/client'); checks['@prisma/client'] = 'ok' } catch (e: any) { checks['@prisma/client'] = e.message }
  try { require('@prisma/adapter-pg'); checks['@prisma/adapter-pg'] = 'ok' } catch (e: any) { checks['@prisma/adapter-pg'] = e.message }
  try { require('pg'); checks['pg'] = 'ok' } catch (e: any) { checks['pg'] = e.message }
  res.json({ env: { VERCEL: !!process.env.VERCEL, DATABASE_URL: !!process.env.DATABASE_URL, JWT_SECRET: !!process.env.JWT_SECRET }, checks })
})

// 静态文件服务
app.use(express.static('public'))
// 宠物照片上传目录
app.use('/uploads', express.static('uploads'))

// 错误处理
app.use(notFoundHandler)
app.use(errorHandler)

// 导出 app 供 Vercel Serverless Functions 使用
export default app

// 只有在非 Vercel 环境下才启动服务器
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
    console.log(`📚 API地址: http://localhost:${PORT}/api`)

    // 启动定时任务（注意：在 Serverless 环境下 node-cron 可能不会如预期运行）
    startReminderScheduler()
  })
}

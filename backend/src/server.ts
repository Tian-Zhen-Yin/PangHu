import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import apiRoutes from './routes/index'
import { errorHandler, notFoundHandler } from './middlewares/error'
import fs from 'node:fs'
import path from 'node:path'
import { startReminderScheduler } from './jobs/reminderChecker'
import { getIntentRecaller } from './agent/core/IntentRecaller'

const app = express()
const PORT = process.env.PORT || 3000

// Trust Vercel's reverse proxy so rate limiting identifies users correctly
if (process.env.VERCEL) app.set('trust proxy', 1)

// 安全头
// 注意:默认 helmet 的 CSP 是 img-src 'self' data:,不允许 blob: URL
// 但前端用 URL.createObjectURL() 做本地图片预览(头像选择后),会产出 blob: URL
// 不放开 blob: 会导致 <img src="blob:..."> 被 CSP 拦截,浏览器报"加载失败"
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'", 'https:', 'wss:'],
    },
  },
}))

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

// AI 聊天限流：每分钟 10 次（生产）/ 200 次（PERF_TEST 时放开）
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.PERF_TEST === '1' ? 200 : 10,
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
app.use(express.static('public', { redirect: false }))
// 宠物照片上传目录
app.use('/uploads', express.static('uploads'))

// ---- 托管前端 SPA（与前端 .env.production 的 VITE_API_BASE_URL=/api 同源设计）----
// 仅当构建产物存在时启用；纯 API / 开发模式下自动跳过
const frontendDist = path.resolve(process.cwd(), '../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { redirect: false }))
  // SPA 回退：GET 且非 /api、/uploads 的请求返回 index.html，交给前端路由
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    const indexFile = path.join(frontendDist, 'index.html')
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile)
    } else {
      next()
    }
  })
}

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

    // 预热 IntentRecaller(异步,不阻塞启动) — 用于意图召回 fast-path
    const apiKey = process.env.ZHIPUAI_API_KEY
    if (apiKey) {
      getIntentRecaller().initialize(apiKey).catch((err) => {
        console.warn('[server] IntentRecaller 预热失败,fast-path 将自动降级到 LLM 路由:', err.message)
      })
    } else {
      console.warn('[server] 未配置 ZHIPUAI_API_KEY,IntentRecaller 不会启用')
    }
  })
}

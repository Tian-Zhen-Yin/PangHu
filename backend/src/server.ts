import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRoutes from './routes'
import { errorHandler, notFoundHandler } from './middlewares/error'
import { startReminderScheduler } from './jobs/reminderChecker'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API路由
app.use('/api', apiRoutes)

// 静态文件服务
app.use(express.static('public'))
// 宠物照片上传目录
app.use('/uploads', express.static('uploads'))

// 错误处理
app.use(notFoundHandler)
app.use(errorHandler)

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`📚 API地址: http://localhost:${PORT}/api`)

  // 启动定时任务
  startReminderScheduler()
})

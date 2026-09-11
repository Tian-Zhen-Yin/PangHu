/**
 * 启动引导 —— 只负责本地/自托管模式的监听与后台任务;
 * app 装配在 app.ts,Vercel Serverless 直接用 app(经 esbuild bundle 本文件)。
 */
import app from './app'
import { startReminderScheduler } from './jobs/reminderChecker'
import { getIntentRecaller } from './agent/core/IntentRecaller'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 3000

// 供 Vercel Serverless Functions 消费(build 脚本 bundle 本文件)
export default app

// 只有在非 Vercel 环境下才启动服务器
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info('server', `🚀 服务器运行在 http://localhost:${PORT}`)
    logger.info('server', `📚 API地址: http://localhost:${PORT}/api`)

    // 启动定时任务（注意：在 Serverless 环境下 node-cron 可能不会如预期运行）
    startReminderScheduler()

    // 预热 IntentRecaller(异步,不阻塞启动) — 用于意图召回 fast-path
    const apiKey = process.env.ZHIPUAI_API_KEY
    if (apiKey) {
      getIntentRecaller().initialize(apiKey).catch((err) => {
        logger.warn('server', 'IntentRecaller 预热失败,fast-path 将自动降级到 LLM 路由:', err.message)
      })
    } else {
      logger.warn('server', '未配置 ZHIPUAI_API_KEY,IntentRecaller 不会启用')
    }
  })
}

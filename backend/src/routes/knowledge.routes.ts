/**
 * RAG 知识库管理路由
 * 用于知识库的入库、状态查询等操作
 */

import { Router } from 'express'
import { ingestGuide, ingestAllGuides, getKnowledgeStatus } from '../services/rag.service'
import { authMiddleware } from '../middlewares/auth'
import { successResponse, errorResponse } from '../utils/response'

const router = Router()

// 需要管理员权限（这里简单处理，使用认证中间件）
router.use(authMiddleware)

/**
 * @route   GET /api/knowledge/status
 * @desc    获取知识库状态
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getKnowledgeStatus()
    res.json(successResponse(status, '获取知识库状态成功'))
  } catch (error: any) {
    console.error('获取知识库状态失败:', error)
    res.status(500).json(errorResponse(error.message || '获取知识库状态失败'))
  }
})

/**
 * @route   POST /api/knowledge/ingest/:guideId
 * @desc    入库单个指南
 * @access  Private
 */
router.post('/ingest/:guideId', async (req, res) => {
  try {
    const { guideId } = req.params
    const apiKey = process.env.ZHIPUAI_API_KEY

    if (!apiKey) {
      return res.status(500).json(errorResponse('未配置智谱AI API Key'))
    }

    const result = await ingestGuide(guideId, apiKey)

    if (result.error) {
      return res.status(400).json(errorResponse(result.error))
    }

    res.json(successResponse({
      guideId,
      chunksCreated: result.chunks
    }, `指南入库成功，创建了 ${result.chunks} 个知识块`))
  } catch (error: any) {
    console.error('指南入库失败:', error)
    res.status(500).json(errorResponse(error.message || '指南入库失败'))
  }
})

/**
 * @route   POST /api/knowledge/ingest-all
 * @desc    入库所有指南
 * @access  Private
 */
router.post('/ingest-all', async (req, res) => {
  try {
    const apiKey = process.env.ZHIPUAI_API_KEY

    if (!apiKey) {
      return res.status(500).json(errorResponse('未配置智谱AI API Key'))
    }

    const result = await ingestAllGuides(apiKey)

    res.json(successResponse({
      success: result.success,
      failed: result.failed,
      errors: result.errors
    }, `入库完成：成功 ${result.success} 个，失败 ${result.failed} 个`))
  } catch (error: any) {
    console.error('批量入库失败:', error)
    res.status(500).json(errorResponse(error.message || '批量入库失败'))
  }
})

export default router

import { Router } from 'express'
import {
  getConversations,
  getConversationById,
  createConversation,
  deleteConversation,
  updateConversationTitle,
  sendMessageHandler,
  getSuggestedQuestions
} from '../controllers/chat.controller'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * @route   GET /api/chat/conversations
 * @desc    获取用户的所有对话
 * @access  Private
 */
router.get('/conversations', getConversations)

/**
 * @route   GET /api/chat/conversations/:id
 * @desc    获取单个对话详情（包含所有消息）
 * @access  Private
 */
router.get('/conversations/:id', getConversationById)

/**
 * @route   POST /api/chat/conversations
 * @desc    创建新对话
 * @access  Private
 */
router.post('/conversations', createConversation)

/**
 * @route   DELETE /api/chat/conversations/:id
 * @desc    删除对话
 * @access  Private
 */
router.delete('/conversations/:id', deleteConversation)

/**
 * @route   PATCH /api/chat/conversations/:id
 * @desc    更新对话标题
 * @access  Private
 */
router.patch('/conversations/:id', updateConversationTitle)

/**
 * @route   POST /api/chat/messages
 * @desc    发送消息（支持流式响应）
 * @access  Private
 * @body    conversationId, content
 */
router.post('/messages', sendMessageHandler)

/**
 * @route   GET /api/chat/suggested-questions
 * @desc    获取预设问题列表
 * @access  Private
 */
router.get('/suggested-questions', getSuggestedQuestions)

export default router

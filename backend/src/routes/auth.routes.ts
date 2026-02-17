import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

// 公开路由
router.post('/register', authController.registerValidation, authController.register)
router.post('/login', authController.loginValidation, authController.login)

// 需要认证的路由
router.get('/me', authMiddleware, authController.getCurrentUser)
router.patch('/username', authMiddleware, authController.updateUsernameValidation, authController.updateUsername)
router.post('/logout', authMiddleware, authController.logout)

export default router

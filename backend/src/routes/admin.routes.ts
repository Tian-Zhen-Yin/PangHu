import { Router } from 'express'
import { adminAuthMiddleware } from '../middlewares/adminAuth'
import * as authController from '../controllers/admin/auth.controller'
import * as dashboardController from '../controllers/admin/dashboard.controller'

const router = Router()

// Auth routes
router.post('/login', authController.loginValidation, authController.login)
router.post('/logout', adminAuthMiddleware, authController.logout)
router.get('/me', adminAuthMiddleware, authController.getMe)
router.put('/me', adminAuthMiddleware, authController.updateProfileValidation, authController.updateProfile)
router.put('/me/password', adminAuthMiddleware, authController.changePasswordValidation, authController.changePassword)

// Dashboard routes
router.get('/dashboard/stats', adminAuthMiddleware, dashboardController.getStats)
router.get('/dashboard/logs', adminAuthMiddleware, dashboardController.getRecentLogs)

export default router

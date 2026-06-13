import { Router } from 'express'
import { adminAuthMiddleware } from '../middlewares/adminAuth'
import * as authController from '../controllers/admin/auth.controller'
import * as dashboardController from '../controllers/admin/dashboard.controller'
import * as guideController from '../controllers/admin/guide.controller'
import * as templateController from '../controllers/admin/template.controller'
import * as userController from '../controllers/admin/user.controller'

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

// Guide management routes
router.get('/guides', adminAuthMiddleware, guideController.getGuides)
router.get('/guides/categories', adminAuthMiddleware, guideController.getCategories)
router.get('/guides/:id', adminAuthMiddleware, guideController.getGuideById)
router.post('/guides', adminAuthMiddleware, guideController.createGuide)
router.put('/guides/:id', adminAuthMiddleware, guideController.updateGuide)
router.delete('/guides/:id', adminAuthMiddleware, guideController.deleteGuide)
router.post('/guides/:id/ingest', adminAuthMiddleware, guideController.ingestGuide)
router.post('/guides/ingest-all', adminAuthMiddleware, guideController.ingestAllGuides)

// Template management routes
router.get('/templates', adminAuthMiddleware, templateController.getTemplates)
router.get('/templates/categories', adminAuthMiddleware, templateController.getTemplateCategories)
router.get('/templates/stages', adminAuthMiddleware, templateController.getStages)
router.get('/templates/:id', adminAuthMiddleware, templateController.getTemplateById)
router.post('/templates', adminAuthMiddleware, templateController.createTemplate)
router.put('/templates/:id', adminAuthMiddleware, templateController.updateTemplate)
router.delete('/templates/:id', adminAuthMiddleware, templateController.deleteTemplate)

// User management routes
router.get('/users', adminAuthMiddleware, userController.getUsers)
router.get('/users/stats', adminAuthMiddleware, userController.getUserStats)
router.get('/users/export', adminAuthMiddleware, userController.exportUsers)
router.get('/users/:id', adminAuthMiddleware, userController.getUserById)
router.put('/users/:id', adminAuthMiddleware, userController.updateUser)
router.delete('/users/:id', adminAuthMiddleware, userController.deleteUser)
router.post('/users/:id/reset-password', adminAuthMiddleware, userController.resetUserPassword)
router.post('/users/:id/toggle-status', adminAuthMiddleware, userController.toggleUserStatus)

export default router

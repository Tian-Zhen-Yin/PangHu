import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import router from './router/index'
import App from './App.vue'
import { setupGlobalErrorHandler } from './utils/errorHandler'
import { useAuthStore } from './stores/auth'
import { useAdminStore } from './stores/admin'
import './assets/styles/main.css'
import './styles/tokens.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 设置全局错误处理
setupGlobalErrorHandler(app)

// 初始化认证状态（从 localStorage 恢复登录状态）
const authStore = useAuthStore()
authStore.initAuth()

// Initialize admin authentication state
const adminStore = useAdminStore()
adminStore.initAdmin()

app.mount('#app')

// 注册 PWA Service Worker（仅在生产环境）
if (import.meta.env.PROD) {
  import('./utils/pwa').then(async ({ registerServiceWorker }) => {
    await registerServiceWorker()
    console.log('[PWA] Service Worker registration initiated')
  }).catch((error) => {
    console.error('[PWA] Failed to register Service Worker:', error)
  })
} else {
  console.log('[PWA] Service Worker registration skipped in development mode')
}

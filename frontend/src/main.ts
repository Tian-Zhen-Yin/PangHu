import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import router from './router/index'
import App from './App.vue'
import { setupGlobalErrorHandler } from './utils/errorHandler'
import { useAuthStore } from './stores/auth'
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

app.mount('#app')

// 注册 PWA Service Worker（仅在生产环境）
if (import.meta.env.PROD) {
  const { registerServiceWorker } = await import('./utils/pwa')
  await registerServiceWorker()
  console.log('[PWA] Service Worker registration initiated')
}

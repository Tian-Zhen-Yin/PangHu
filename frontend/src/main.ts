import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import { setupGlobalErrorHandler } from './utils/errorHandler'
import { useAuthStore } from './stores/auth'
import './assets/styles/main.css'
import './styles/tokens.css'

const app = createApp(App)
const pinia = createPinia()

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 设置全局错误处理
setupGlobalErrorHandler(app)

// 初始化认证状态（从 localStorage 恢复登录状态）
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')

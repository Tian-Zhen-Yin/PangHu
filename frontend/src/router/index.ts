import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home/index.vue'),
    meta: { title: '首页 - 哈吉咪养成计划' }
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('../views/Timeline/index.vue'),
    meta: { title: '养成时间线 - 哈吉咪养成计划' }
  },
  {
    path: '/guides',
    name: 'Guides',
    component: () => import('../views/Guides/index.vue'),
    meta: { title: '知识指南 - 哈吉咪养成计划' }
  },
  {
    path: '/guides/:id',
    name: 'GuideDetail',
    component: () => import('../views/Guides/Detail.vue'),
    meta: { title: '指南详情 - 哈吉咪养成计划' }
  },
  {
    path: '/ai-chat',
    name: 'AIChat',
    component: () => import('../views/AIChat/index.vue'),
    meta: { title: 'AI医师 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('../views/Templates/index.vue'),
    meta: { title: '计划模板 - 哈吉咪养成计划' }
  },
  {
    path: '/templates/:id',
    name: 'TemplateDetail',
    component: () => import('../views/Templates/Detail.vue'),
    meta: { title: '模板详情 - 哈吉咪养成计划' }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search/index.vue'),
    meta: { title: '搜索 - 哈吉咪养成计划' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Auth/Login.vue'),
    meta: { title: '登录 - 哈吉咪养成计划', guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Auth/Register.vue'),
    meta: { title: '注册 - 哈吉咪养成计划', guest: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/User/Profile.vue'),
    meta: { title: '个人中心 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About/index.vue'),
    meta: { title: '关于 - 哈吉咪养成计划' }
  },
  {
    path: '/my-cats',
    name: 'MyCats',
    component: () => import('../views/MyCats/index.vue'),
    meta: { title: '我的猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/new',
    name: 'MyCatNew',
    component: () => import('../views/MyCats/Form.vue'),
    meta: { title: '添加猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id/edit',
    name: 'MyCatEdit',
    component: () => import('../views/MyCats/Form.vue'),
    meta: { title: '编辑猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id',
    name: 'MyCatDetail',
    component: () => import('../views/MyCats/Detail.vue'),
    meta: { title: '猫咪详情 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id/vaccines',
    name: 'MyCatVaccines',
    component: () => import('../views/MyCats/Vaccines.vue'),
    meta: { title: '疫苗记录 - 哈吉咪养成计划', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

let authInitialized = false

// 路由守卫
router.beforeEach((to, _from, next) => {
  // 初始化认证状态（只执行一次）
  if (!authInitialized) {
    const authStore = useAuthStore()
    authStore.initAuth()
    authInitialized = true
  }

  // 设置页面标题
  document.title = to.meta.title as string || '哈吉咪养成计划'

  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // 需要认证的页面
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // 已登录用户访问 guest 页面（登录/注册页）
  if (to.meta.guest && isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router

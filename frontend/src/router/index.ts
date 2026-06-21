import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAdminStore } from '../stores/admin'
import { adminRoutes } from './admin'

// 路由分组优化 - 按功能模块分割代码
const routes: RouteRecordRaw[] = [
  // 管理后台路由
  ...adminRoutes,

  // 首页和核心页面（优先级高）
  {
    path: '/',
    name: 'Dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '../modules/dashboard/pages/DashboardPage.vue'),
    meta: { title: '首页 - 哈吉咪养成计划', preload: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '../views/Home/index.vue'),
    meta: { title: '关于我们 - 哈吉咪养成计划' }
  },

  // 时间线模块
  {
    path: '/timeline',
    component: () => import(/* webpackChunkName: "timeline-layout" */ '../views/Timeline/TimelineLayout.vue'),
    children: [
      { path: '', redirect: '/timeline/overview' },
      {
        path: 'overview',
        name: 'TimelineOverview',
        component: () => import(/* webpackChunkName: "timeline-overview" */ '../views/Timeline/OverviewTab.vue'),
        meta: { title: '养成时间线 - 哈吉咪养成计划' }
      },
      {
        path: 'tasks',
        name: 'TimelineTasks',
        component: () => import(/* webpackChunkName: "timeline-tasks" */ '../views/Timeline/TasksTab.vue'),
        meta: { title: '任务清单 - 哈吉咪养成计划' }
      },
      {
        path: 'vaccines',
        name: 'TimelineVaccines',
        component: () => import(/* webpackChunkName: "timeline-vaccines" */ '../views/Timeline/VaccinesTab.vue'),
        meta: { title: '疫苗接种 - 哈吉咪养成计划' }
      },
      {
        path: 'growth',
        name: 'TimelineGrowth',
        component: () => import(/* webpackChunkName: "timeline-growth" */ '../views/Timeline/GrowthRecords.vue'),
        meta: { title: '成长记录 - 哈吉咪养成计划' }
      }
    ]
  },

  // AI 功能（可以延迟加载）
  {
    path: '/ai-chat',
    name: 'AIChat',
    component: () => import(/* webpackChunkName: "ai-chat" */ '../views/AIChat/index.vue'),
    meta: { title: '喵喵 - 哈吉咪养成计划', requiresAuth: true }
  },

  // 陪玩推荐（已合入喵喵对话，保留旧入口重定向到陪玩模式）
  {
    path: '/play',
    name: 'Play',
    redirect: { name: 'AIChat', query: { mode: 'play' } }
  },

  // 我的猫咪模块
  {
    path: '/my-cats',
    name: 'MyCats',
    component: () => import(/* webpackChunkName: "my-cats-list" */ '../views/MyCats/index.vue'),
    meta: { title: '我的猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/new',
    name: 'MyCatNew',
    component: () => import(/* webpackChunkName: "my-cats-form" */ '../views/MyCats/Form.vue'),
    meta: { title: '添加猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/compare',
    name: 'CatsComparison',
    component: () => import(/* webpackChunkName: "my-cats-compare" */ '../views/MyCats/Compare.vue'),
    meta: { title: '多猫对比 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id/edit',
    name: 'MyCatEdit',
    component: () => import(/* webpackChunkName: "my-cats-form" */ '../views/MyCats/Form.vue'),
    meta: { title: '编辑猫咪 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id',
    name: 'MyCatDetail',
    component: () => import(/* webpackChunkName: "my-cats-detail" */ '../views/MyCats/Detail.vue'),
    meta: { title: '猫咪详情 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/my-cats/:id/vaccines',
    name: 'MyCatVaccines',
    component: () => import(/* webpackChunkName: "my-cats-vaccines" */ '../views/MyCats/Vaccines.vue'),
    meta: { title: '疫苗记录 - 哈吉咪养成计划', requiresAuth: true }
  },

  // 指南和模板
  {
    path: '/guides',
    name: 'Guides',
    component: () => import(/* webpackChunkName: "guides" */ '../views/Guides/index.vue'),
    meta: { title: '知识指南 - 哈吉咪养成计划' }
  },
  {
    path: '/guides/:id',
    name: 'GuideDetail',
    component: () => import(/* webpackChunkName: "guide-detail" */ '../views/Guides/Detail.vue'),
    meta: { title: '指南详情 - 哈吉咪养成计划' }
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import(/* webpackChunkName: "templates" */ '../views/Templates/index.vue'),
    meta: { title: '计划模板 - 哈吉咪养成计划' }
  },
  {
    path: '/templates/:id',
    name: 'TemplateDetail',
    component: () => import(/* webpackChunkName: "template-detail" */ '../views/Templates/Detail.vue'),
    meta: { title: '模板详情 - 哈吉咪养成计划' }
  },

  // 其他页面
  {
    path: '/search',
    name: 'Search',
    component: () => import(/* webpackChunkName: "search" */ '../views/Search/index.vue'),
    meta: { title: '搜索 - 哈吉咪养成计划' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/User/Profile.vue'),
    meta: { title: '个人中心 - 哈吉咪养成计划', requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import(/* webpackChunkName: "about" */ '../views/About/index.vue'),
    meta: { title: '关于 - 哈吉咪养成计划' }
  },

  // 认证页面（单独分组，减少主包大小）
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackChunkName: "auth" */ '../views/Auth/Login.vue'),
    meta: { title: '登录 - 哈吉咪养成计划', guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import(/* webpackChunkName: "auth" */ '../views/Auth/Register.vue'),
    meta: { title: '注册 - 哈吉咪养成计划', guest: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

let authInitialized = false
let adminInitialized = false

// 路由守卫
router.beforeEach((to, _from, next) => {
  // 初始化认证状态（只执行一次）
  if (!authInitialized) {
    const authStore = useAuthStore()
    authStore.initAuth()
    authInitialized = true
  }

  // 初始化管理员认证状态（只执行一次）
  if (!adminInitialized) {
    const adminStore = useAdminStore()
    adminStore.initAdmin()
    adminInitialized = true
  }

  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // 处理管理员路由
  if (to.meta.admin) {
    const adminStore = useAdminStore()

    // 设置管理员页面标题
    document.title = `${to.meta.title as string} - 后台管理`

    // 需要认证的管理员页面
    if (to.meta.requiresAuth && !adminStore.isAuthenticated) {
      next({
        name: 'AdminLogin',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 已认证管理员访问登录页，重定向到仪表板
    if (to.name === 'AdminLogin' && adminStore.isAuthenticated) {
      next({ name: 'AdminDashboard' })
      return
    }

    next()
    return
  }

  // 设置普通页面标题
  document.title = to.meta.title as string || '哈吉咪养成计划'

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

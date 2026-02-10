import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home/index.vue'),
    meta: { title: '首页 - 猫咪养成计划' }
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('../views/Timeline/index.vue'),
    meta: { title: '养成时间线 - 猫咪养成计划' }
  },
  {
    path: '/guides',
    name: 'Guides',
    component: () => import('../views/Guides/index.vue'),
    meta: { title: '知识指南 - 猫咪养成计划' }
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('../views/Templates/index.vue'),
    meta: { title: '计划模板 - 猫咪养成计划' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About/index.vue'),
    meta: { title: '关于 - 猫咪养成计划' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = to.meta.title as string || '猫咪养成计划'
  next()
})

export default router

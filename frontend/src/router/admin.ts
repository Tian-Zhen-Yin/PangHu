import type { RouteRecordRaw } from 'vue-router'

// Flag to identify admin routes
export const ADMIN_ROUTE_FLAG = 'admin'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('../views/Admin/Layout.vue'),
    meta: { requiresAuth: true, admin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/Admin/Dashboard/index.vue'),
        meta: { title: '数据概览', admin: true }
      }
    ]
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/Admin/Login.vue'),
    meta: { requiresAuth: false, title: '管理员登录', admin: true }
  }
]

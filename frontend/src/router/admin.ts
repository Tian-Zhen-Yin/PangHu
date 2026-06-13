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
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/Admin/Users/List.vue'),
        meta: { title: '用户管理', admin: true }
      },
      {
        path: 'users/:id',
        name: 'AdminUserDetail',
        component: () => import('../views/Admin/Users/Detail.vue'),
        meta: { title: '用户详情', admin: true }
      },
      {
        path: 'guides',
        name: 'AdminGuides',
        component: () => import('../views/Admin/Guides/List.vue'),
        meta: { title: '指南管理', admin: true }
      },
      {
        path: 'guides/create',
        name: 'AdminGuideCreate',
        component: () => import('../views/Admin/Guides/Form.vue'),
        meta: { title: '新建指南', admin: true }
      },
      {
        path: 'guides/:id/edit',
        name: 'AdminGuideEdit',
        component: () => import('../views/Admin/Guides/Form.vue'),
        meta: { title: '编辑指南', admin: true }
      },
      {
        path: 'templates',
        name: 'AdminTemplates',
        component: () => import('../views/Admin/Templates/List.vue'),
        meta: { title: '模板管理', admin: true }
      },
      {
        path: 'templates/create',
        name: 'AdminTemplateCreate',
        component: () => import('../views/Admin/Templates/Form.vue'),
        meta: { title: '新建模板', admin: true }
      },
      {
        path: 'templates/:id/edit',
        name: 'AdminTemplateEdit',
        component: () => import('../views/Admin/Templates/Form.vue'),
        meta: { title: '编辑模板', admin: true }
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

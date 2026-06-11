# Phase 1: Admin System Basic Framework - Design Specification

> **Date**: 2026-06-11
> **Project**: 哈吉咪养成计划 - Backend Management System
> **Phase**: 1 - Basic Framework
> **Status**: Approved

---

## Overview

Phase 1 establishes the foundational infrastructure for the admin management system, including authentication, authorization, basic layout, and a dashboard with mock statistics. This phase enables admin login, role-based access control, operation logging, and provides a visual dashboard to validate the UI/UX design.

**Scope Decisions:**
- **Roles**: Two-tier implementation (super + admin), deferring editor role to later phases
- **Dashboard Data**: Mock statistics for UI development
- **Additional Features**: Full AdminLog operation logging + Remember Me functionality
- **Architecture**: Minimal Integration approach for rapid development

---

## 1. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Vue 3 + Element Plus + Pinia + Vue Router                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Admin Pages                                          │  │
│  │  ├── Login.vue      (/admin/login)                    │  │
│  │  ├── Layout.vue     (admin shell)                     │  │
│  │  └── Dashboard.vue  (/admin)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Admin Store (Pinia)                                  │  │
│  │  └── State: token, userInfo, permissions              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  Express Routes → Controllers → Services                    │
│                                                              │
│  /api/admin/login     → adminAuth.controller               │
│  /api/admin/logout    → adminAuth.controller               │
│  /api/admin/me        → adminAuth.controller               │
│  /api/admin/dashboard → adminDashboard.controller          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Layer                     │
│  JWT tokens → adminAuth middleware → role check             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│  PostgreSQL + Prisma ORM                                     │
│                                                              │
│  Admin table      (id, username, password, role, ...)      │
│  AdminLog table   (id, adminId, action, module, ...)        │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/src/
├── controllers/
│   ├── admin/
│   │   ├── auth.controller.ts       # login, logout, me
│   │   └── dashboard.controller.ts  # stats
│   └── [existing controllers]
├── middlewares/
│   └── adminAuth.ts                 # JWT verification + role check
├── routes/
│   └── admin.routes.ts              # All /api/admin/* routes
├── services/
│   ├── admin/
│   │   ├── auth.service.ts          # Login logic, token generation
│   │   ├── dashboard.service.ts     # Mock stats
│   │   └── log.service.ts           # AdminLog CRUD
│   └── [existing services]
├── types/
│   └── admin.ts                     # Admin, AdminLog, LoginRequest types
└── utils/
    └── adminLogger.ts               # Helper to create AdminLog entries

frontend/src/
├── views/
│   └── Admin/
│       ├── Login.vue              # /admin/login
│       ├── Layout.vue             # Admin shell (sidebar + header + content)
│       └── Dashboard/
│           └── index.vue          # /admin (default route)
├── stores/
│   └── admin.ts                   # Admin auth state & permissions
├── api/
│   └── admin.ts                   # Admin API calls
├── router/
│   └── admin.ts                   # Admin routes configuration
├── types/
│   └── admin.ts                   # Admin, AdminLog, LoginCredentials types
└── utils/
    └── adminRules.ts              # Form validation rules
```

---

## 2. Database Design

### Prisma Models

```prisma
// backend/prisma/schema.prisma

// 管理员表
model Admin {
  id          String   @id @default(cuid())
  username    String   @unique
  password    String   // bcrypt hash
  email       String?  @unique
  role        String   @default("admin") // "super" or "admin"
  name        String?
  avatar      String?
  isActive    Boolean  @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  logs        AdminLog[]

  @@index([username])
  @@index([role])
  @@map("admins")
}

// 操作日志表
model AdminLog {
  id        String   @id @default(cuid())
  adminId   String?
  admin     Admin?   @relation(fields: [adminId], references: [id], onDelete: SetNull)
  action    String   // login, logout, create, update, delete
  module    String   // auth, dashboard, user, guide, etc.
  targetId  String?  // ID of affected record
  detail    String?  // JSON string with additional context
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([adminId])
  @@index([action])
  @@index([module])
  @@index([createdAt])
  @@map("admin_logs")
}
```

### Role Permissions

| Role | Permissions |
|------|-------------|
| `super` | All permissions (can access system config in Phase 4) |
| `admin` | Cannot modify system config, everything else allowed |

### Seed Data

Default admin accounts created on first run:

| Username | Password | Role | Name |
|----------|----------|------|------|
| `admin` | `Admin@123` | `admin` | 系统管理员 |
| `super` | `Super@123` | `super` | 超级管理员 |

---

## 3. Backend API

### Authentication Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/admin/login` | Admin login | `{ username, password, rememberMe? }` | `{ token, refreshToken, admin, permissions }` |
| POST | `/api/admin/logout` | Admin logout | - | `{ success: true }` |
| GET | `/api/admin/me` | Get current admin | - | `{ admin, permissions }` |
| PUT | `/api/admin/me` | Update profile | `{ name?, email? }` | `{ admin }` |
| PUT | `/api/admin/me/password` | Change password | `{ oldPassword, newPassword }` | `{ success: true }` |

### Dashboard Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/api/admin/dashboard/stats` | Dashboard statistics (mock) | `{ totalUsers, totalCats, totalGuides, todayChats, userGrowth, catBreeds }` |

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**Error:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "未登录或登录已过期",
  "details": {}
}
```

### Authentication Flow

```
Login Request
    ↓
adminAuth.controller.login()
    ↓
auth.service.validateCredentials() → check username/password in DB
    ↓ (valid)
Generate JWT access token (15min) + refresh token (7d)
    ↓
Create AdminLog entry (action: "login")
    ↓
Return { token, refreshToken, admin, permissions }
    ↓
Frontend stores token in localStorage + cookie (if rememberMe)
```

---

## 4. Frontend Design

### Pages

**Login.vue** (`/admin/login`)
- Centered card layout with brand logo
- Username + Password inputs with validation
- Remember Me checkbox
- Login button with loading state
- Error message display
- Redirects to `/admin` on success

**Layout.vue** (Admin shell)
- **Sidebar (210px)**:
  - Logo area
  - Navigation menu (Dashboard only in Phase 1)
  - Collapsible on mobile
- **Header (56px)**:
  - Breadcrumb navigation
  - User dropdown (avatar, name, role badge)
  - Logout button
- **Main Content**:
  - Router view for child pages
  - Page title bar
  - Content area with padding

**Dashboard/index.vue** (`/admin`)
- **Stat Cards (4 cols)**:
  - Total Users (1234)
  - Total Cats (856)
  - Today's Chats (128)
  - Knowledge Guides (42)
- **Charts Area**:
  - Line chart: User growth trend (6 months)
  - Pie chart: Cat breed distribution
- **Recent Logs Table**:
  - Last 5 admin operations
  - Columns: Admin, Action, Module, Time

### Admin Store (Pinia)

```typescript
interface AdminInfo {
  id: string
  username: string
  email?: string
  name?: string
  role: 'super' | 'admin'
  permissions: Permission[]
}

interface LoginCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const refreshToken = ref<string>(localStorage.getItem('admin_refresh_token') || '')
  const userInfo = ref<AdminInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!userInfo.value)
  const hasPermission = computed(() => (permission: Permission) =>
    userInfo.value?.permissions.includes(permission) || false
  )
  const isSuperAdmin = computed(() => userInfo.value?.role === 'super')
  const isAdmin = computed(() => ['super', 'admin'].includes(userInfo.value?.role || ''))

  // Actions
  async function login(credentials: LoginCredentials) { ... }
  async function logout() { ... }
  async function loadCurrentUser() { ... }
  async function refreshAccessToken() { ... }

  return { token, refreshToken, userInfo, isLoading, error, isAuthenticated, hasPermission, isSuperAdmin, isAdmin, login, logout, loadCurrentUser, refreshAccessToken }
})
```

### Router Configuration

```typescript
const adminRoutes = [
  {
    path: '/admin',
    component: () => import('@/views/Admin/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/Admin/Dashboard/index.vue'),
        meta: { title: '数据概览' }
      }
    ]
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/Admin/Login.vue'),
    meta: { requiresAuth: false }
  }
]

// Route guard
router.beforeEach((to, from, next) => {
  const adminStore = useAdminStore()

  if (to.meta.requiresAuth && !adminStore.isAuthenticated) {
    next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
  } else if (to.name === 'AdminLogin' && adminStore.isAuthenticated) {
    next({ name: 'AdminDashboard' })
  } else {
    next()
  }
})
```

---

## 5. Security

### Token Management

| Token Type | Expiration | Storage | Usage |
|------------|------------|---------|-------|
| Access Token | 15 minutes | localStorage + memory | API requests |
| Refresh Token | 7 days | localStorage (if rememberMe) | Get new access token |

### Security Measures

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Secret**: Environment variable `JWT_SECRET` (minimum 32 characters)
3. **Rate Limiting**: Login endpoint limited to 5 attempts per 15 minutes per IP
4. **Input Validation**:
   - Username: 3-30 characters, alphanumeric + underscore only
   - Password: minimum 8 characters
5. **SQL Injection Protection**: Prisma parameterized queries
6. **XSS Protection**: Input sanitization on login/create
7. **Logout Handling**: Clear tokens, create AdminLog entry

### Error Codes

| Error Code | HTTP Status | User Message |
|------------|-------------|--------------|
| `UNAUTHORIZED` | 401 | 未登录或登录已过期 |
| `INVALID_CREDENTIALS` | 401 | 用户名或密码错误 |
| `ACCOUNT_LOCKED` | 403 | 账户已被禁用 |
| `VALIDATION_ERROR` | 400 | 请输入正确的用户名和密码 |
| `TOO_MANY_ATTEMPTS` | 429 | 登录尝试次数过多，请稍后再试 |
| `INTERNAL_ERROR` | 500 | 服务器错误，请稍后重试 |

---

## 6. Testing Strategy

### Unit Tests (Vitest)

**Backend:**
- `utils/adminLogger.test.ts` - Log creation helper
- `middlewares/adminAuth.test.ts` - JWT verification, role check
- `services/admin/auth.service.test.ts` - Login logic, token generation
- `services/admin/dashboard.service.test.ts` - Mock stats
- `controllers/admin/auth.controller.test.ts` - Request/response handling

**Target:** 80%+ code coverage

### Integration Tests (Supertest)

- `admin.auth.api.test.ts` - Login, logout, me endpoints
- `admin.dashboard.api.test.ts` - Stats endpoint
- `admin.permissions.api.test.ts` - Role-based access control

**Coverage:** All API endpoints with valid/invalid scenarios

### E2E Tests (Playwright)

- `auth.spec.ts` - Login flow, logout, remember me
- `dashboard.spec.ts` - Dashboard loads, displays stats, charts render
- `permissions.spec.ts` - Route guards, protected redirects

**Coverage:** Critical user paths

### Test Data

```typescript
export const testAdmins = {
  super: {
    username: 'test_super',
    password: 'Test@123',
    role: 'super',
  },
  admin: {
    username: 'test_admin',
    password: 'Test@123',
    role: 'admin',
  },
}
```

### Mock Dashboard Stats

```typescript
export const mockDashboardStats = {
  totalUsers: 1234,
  totalCats: 856,
  totalGuides: 42,
  todayChats: 128,
  userGrowth: [10, 15, 22, 18, 25, 30],
  catBreeds: [
    { name: '英短', value: 335 },
    { name: '美短', value: 234 },
    { name: '田园', value: 154 },
    { name: '布偶', value: 98 },
    { name: '其他', value: 35 },
  ],
}
```

---

## 7. Dependencies

### Backend

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3",
    "express-rate-limit": "^8.3.2"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0"
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "echarts": "^6.0.0",
    "vue-router": "^4.6.4",
    "pinia": "^3.0.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

All listed dependencies are **already installed** in the project.

---

## 8. Environment Variables

```bash
# backend/.env
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_RATE_LIMIT_WINDOW=15
ADMIN_RATE_LIMIT_MAX=5
```

---

## 9. Implementation Checklist

### Backend Files
- [ ] `prisma/schema.prisma` - Add Admin, AdminLog models
- [ ] `src/types/admin.ts` - Type definitions
- [ ] `src/services/admin/log.service.ts` - AdminLog CRUD
- [ ] `src/services/admin/auth.service.ts` - Login logic
- [ ] `src/services/admin/dashboard.service.ts` - Mock stats
- [ ] `src/controllers/admin/auth.controller.ts` - Auth endpoints
- [ ] `src/controllers/admin/dashboard.controller.ts` - Dashboard endpoints
- [ ] `src/middlewares/adminAuth.ts` - JWT verification
- [ ] `src/routes/admin.routes.ts` - Route definitions
- [ ] `src/seed/admin-seed.ts` - Default admin creation
- [ ] `src/utils/adminLogger.ts` - Log helper
- [ ] Update `src/routes/index.ts` - Include admin routes
- [ ] Update `src/server.ts` - Register admin routes

### Frontend Files
- [ ] `src/types/admin.ts` - Type definitions
- [ ] `src/api/admin.ts` - API client
- [ ] `src/stores/admin.ts` - Auth store
- [ ] `src/router/admin.ts` - Route config
- [ ] `src/views/Admin/Login.vue` - Login page
- [ ] `src/views/Admin/Layout.vue` - Admin shell
- [ ] `src/views/Admin/Dashboard/index.vue` - Dashboard
- [ ] `src/utils/adminRules.ts` - Form validation rules
- [ ] Update `src/router/index.ts` - Include admin routes
- [ ] Update `src/main.ts` - Register Pinia store

### Test Files
- [ ] `backend/src/__tests__/utils/adminLogger.test.ts`
- [ ] `backend/src/__tests__/middlewares/adminAuth.test.ts`
- [ ] `backend/src/__tests__/services/admin/auth.service.test.ts`
- [ ] `backend/src/__tests__/services/admin/dashboard.service.test.ts`
- [ ] `backend/src/__tests__/api/admin.auth.api.test.ts`
- [ ] `backend/src/__tests__/api/admin.dashboard.api.test.ts`
- [ ] `e2e/admin/auth.spec.ts`
- [ ] `e2e/admin/dashboard.spec.ts`

---

## 10. Development Workflow

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Tests (watch mode)
npm run test:unit -- --watch
```

---

## 11. Success Criteria

Phase 1 is complete when:

1. ✅ Admin can log in with username/password
2. ✅ JWT authentication works for protected routes
3. ✅ Dashboard displays mock statistics correctly
4. ✅ Admin operations are logged to AdminLog table
5. ✅ Remember Me functionality persists session
6. ✅ Route guards prevent unauthorized access
7. ✅ Unit tests pass with 80%+ coverage
8. ✅ Integration tests cover all API endpoints
9. ✅ E2E tests validate critical user flows
10. ✅ Code follows existing project patterns

---

## Related Documents

- [后台管理系统设计方案](../../04-架构/后台管理系统设计方案.md)
- [后台管理系统UE-UX规范](../../03-设计/后台管理系统UE-UX规范.md)
- [测试用例文档](../../02-开发/测试用例文档.md)

---

**Phase 1 Design Specification** - Last Updated: 2026-06-11

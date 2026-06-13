# 哈吉咪养成计划 - 后台管理系统 UE/UX 规范

> 版本：V1.1
> 更新时间：2026-06-11
> 适用范围：后台管理系统 Web 端

---

## 1. 设计原则

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **效率优先** | 后台系统以提升操作效率为目标，减少点击次数 |
| **清晰层级** | 信息层次分明，重点突出，避免视觉干扰 |
| **一致性** | 遵循 Element Plus 规范，保持与 C 端品牌一致 |
| **可预测性** | 用户能预判操作结果，减少学习成本 |

### 1.2 设计目标

- **专业感**：沉稳的配色和布局，传达可信赖的管理工具
- **高效性**：常用操作一步直达，减少导航层级
- **容错性**：危险操作需确认，数据不可轻易删除
- **可扩展性**：模块化设计，便于功能增减

---

## 2. 视觉规范

### 2.1 品牌色彩延续

沿用 C 端品牌主色调，保持产品一致性：

```css
:root {
  /* 主色调 - 温暖橙（沿用品牌色） */
  --color-primary: #FFB86C;
  --color-primary-light: #FFD19A;
  --color-primary-dark: #E59545;

  /* 辅助色 */
  --color-success: #67C23A;
  --color-warning: #E6A23C;
  --color-danger: #F56C6C;
  --color-info: #909399;

  /* 背景色 */
  --color-bg-page: #F5F7FA;
  --color-bg-card: #FFFFFF;
  --color-bg-sidebar: #304156;
  --color-bg-header: #FFFFFF;

  /* 文字色 */
  --color-text-primary: #303133;
  --color-text-regular: #606266;
  --color-text-secondary: #909399;
  --color-text-placeholder: #C0C4CC;

  /* 边框色 */
  --color-border-base: #DCDFE6;
  --color-border-light: #E4E7ED;
  --color-border-lighter: #EBEEF5;

  /* 侧边栏深色 */
  --color-sidebar-text: #BFCBD9;
  --color-sidebar-text-active: #FFFFFF;
  --color-sidebar-bg: #304156;
  --color-sidebar-hover: #263445;
}
```

### 2.2 Typography 字体规范

```css
/* 字体家族 */
--font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, 'Microsoft YaHei', Arial, sans-serif;

/* 字号层级 */
--font-size-xs: 12px;      /* 辅助说明 */
--font-size-sm: 13px;      /* 次要信息 */
--font-size-base: 14px;    /* 正文 */
--font-size-md: 16px;      /* 页面标题 */
--font-size-lg: 18px;      /* 模块标题 */
--font-size-xl: 20px;      /* 页面大标题 */

/* 字重 */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-bold: 600;

/* 行高 */
--line-height-tight: 1.3;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### 2.3 间距体系

采用 8px 基准系统：

| 名称 | 数值 | 用途 |
|------|------|------|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 紧凑元素间距 |
| md | 16px | 标准元素间距 |
| lg | 24px | 模块间距 |
| xl | 32px | 区块间距 |
| xxl | 48px | 页面边距 |

### 2.4 圆角与阴影

```css
/* 圆角 */
--border-radius-sm: 4px;      /* 按钮、输入框 */
--border-radius-md: 8px;      /* 卡片、面板 */
--border-radius-lg: 12px;     /* 弹窗、大卡片 */

/* 阴影 */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

---

## 3. 布局规范

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  顶部 Header (56px)                                            │
│  ┌─────────┬───────────────────────────────────────┬────────┐ │
│  │ Logo    │  面包屑 / 页面标题                     │ 用户信息│ │
│  └─────────┴───────────────────────────────────────┴────────┘ │
├───────────┬─────────────────────────────────────────────────────┤
│           │                                                     │
│  侧边栏   │  主内容区                                           │
│  Sidebar  │  Main Content                                       │
│  (210px)  │                                                     │
│           │  ┌─────────────────────────────────────────────┐   │
│  ┌─────┐  │  │ Page Header (页面标题 + 操作按钮)          │   │
│  │     │  │  └─────────────────────────────────────────────┘   │
│  │ Menu│  │                                                     │
│  │     │  │  ┌─────────────────────────────────────────────┐   │
│  │     │  │  │ Content (内容区 - 可滚动)                     │   │
│  │     │  │  │                                             │   │
│  │     │  │  │ 表格 / 表单 / 统计卡片 / 图表               │   │
│  │     │  │  │                                             │   │
│  └─────┘  │  └─────────────────────────────────────────────┘   │
│           │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
```

### 3.2 布局规格

**顶部 Header**
```css
.header {
  height: 56px;
  background: var(--color-bg-header);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
```

**侧边栏 Sidebar**
```css
.sidebar {
  width: 210px;
  background: var(--color-sidebar-bg);
  position: fixed;
  top: 56px;
  bottom: 0;
  left: 0;
  overflow-y: auto;
  transition: width 0.3s;
}

.sidebar-menu {
  padding: 8px 0;
}

.sidebar-item {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  color: var(--color-sidebar-text);
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text-active);
}

.sidebar-item.active {
  background: var(--color-primary);
  color: var(--color-sidebar-text-active);
}
```

**主内容区**
```css
.main-content {
  margin-left: 210px;
  margin-top: 56px;
  padding: 24px;
  min-height: calc(100vh - 56px);
  background: var(--color-bg-page);
}
```

**页面 Header**
```css
.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.page-actions {
  display: flex;
  gap: 12px;
}
```

---

## 4. 组件规范

### 4.1 表格 Table

**标准表格**
```vue
<el-table :data="tableData" stripe border>
  <el-table-column prop="username" label="用户名" />
  <el-table-column prop="email" label="邮箱" />
  <el-table-column prop="role" label="角色" />
  <el-table-column label="操作" width="180">
    <template #default="{ row }">
      <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
      <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
    </template>
  </el-table-column>
</el-table>
```

**表格样式优化**
```css
.el-table {
  --el-table-border-color: var(--color-border-light);
  --el-table-header-bg-color: #FAFAFA;
  font-size: var(--font-size-sm);
}

.el-table th {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}
```

**表格分页**
```vue
<div class="table-footer">
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :total="total"
    :page-sizes="[10, 20, 50, 100]"
    layout="total, sizes, prev, pager, next, jumper"
    background
  />
</div>
```

### 4.2 表单 Form

**标准表单布局**
```vue
<el-form :model="form" label-width="120px" :rules="rules">
  <el-form-item label="用户名" prop="username">
    <el-input v-model="form.username" placeholder="请输入用户名" />
  </el-form-item>
  <el-form-item label="角色" prop="role">
    <el-select v-model="form.role" placeholder="请选择角色">
      <el-option label="超级管理员" value="super" />
      <el-option label="管理员" value="admin" />
      <el-option label="编辑" value="editor" />
    </el-select>
  </el-form-item>
  <el-form-item>
    <el-button type="primary" @click="handleSubmit">保存</el-button>
    <el-button @click="handleCancel">取消</el-button>
  </el-form-item>
</el-form>
```

**表单栅格**
```css
.el-form-item {
  margin-bottom: 20px;
}

.el-input,
.el-select,
.el-date-editor {
  width: 100%;
  max-width: 400px;
}
```

### 4.3 按钮 Button

**按钮尺寸**
| 场景 | 大小 |
|------|------|
| 表格操作 | small (28px) |
| 表单提交 | default (32px) |
| 页面主操作 | default (32px) |
| 工具栏 | small (28px) |

**按钮分组**
```vue
<div class="button-group">
  <el-button type="primary" @click="handleCreate">新建</el-button>
  <el-button @click="handleExport">导出</el-button>
  <el-button type="danger" plain @click="handleBatchDelete">批量删除</el-button>
</div>
```

**按钮样式规范**
```css
/* 主要操作 */
.el-button--primary {
  --el-button-bg-color: var(--color-primary);
  --el-button-border-color: var(--color-primary);
  --el-button-hover-bg-color: var(--color-primary-light);
  --el-button-hover-border-color: var(--color-primary-light);
}

/* 危险操作需二次确认 */
.el-button--danger {
  --el-button-bg-color: var(--color-danger);
  --el-button-border-color: var(--color-danger);
}
```

### 4.4 卡片 Card

**统计卡片**
```vue
<div class="stat-cards">
  <el-card class="stat-card">
    <div class="stat-icon-wrapper primary">
      <el-icon><User /></el-icon>
    </div>
    <div class="stat-content">
      <div class="stat-value">1,234</div>
      <div class="stat-label">用户总数</div>
    </div>
  </el-card>
</div>
```

```css
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon-wrapper.primary {
  background: #FFF7EC;
  color: var(--color-primary);
}

.stat-value {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

**内容卡片**
```css
.content-card {
  background: var(--color-bg-card);
  border-radius: var(--border-radius-md);
  padding: 20px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}

.card-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
}
```

### 4.5 搜索与筛选

**搜索栏**
```vue
<div class="search-bar">
  <el-input
    v-model="searchKeyword"
    placeholder="搜索用户名、邮箱..."
    prefix-icon="Search"
    clearable
    style="width: 280px;"
  />
  <el-select v-model="filterRole" placeholder="角色筛选" clearable style="width: 140px;">
    <el-option label="全部" value="" />
    <el-option label="超级管理员" value="super" />
    <el-option label="管理员" value="admin" />
    <el-option label="编辑" value="editor" />
  </el-select>
  <el-date-picker
    v-model="dateRange"
    type="daterange"
    range-separator="至"
    start-placeholder="开始日期"
    end-placeholder="结束日期"
  />
  <el-button type="primary" @click="handleSearch">搜索</el-button>
  <el-button @click="handleReset">重置</el-button>
</div>
```

```css
.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--border-radius-md);
  margin-bottom: 16px;
}
```

### 4.6 弹窗 Dialog

**确认弹窗**
```vue
<el-dialog
  v-model="dialogVisible"
  title="确认操作"
  width="400px"
  :show-close="false"
>
  <p>确定要删除选中的 {{ selectedCount }} 个用户吗？此操作不可恢复。</p>
  <template #footer>
    <el-button @click="dialogVisible = false">取消</el-button>
    <el-button type="danger" @click="handleConfirmDelete">确定删除</el-button>
  </template>
</el-dialog>
```

**表单弹窗**
```vue
<el-dialog
  v-model="formDialogVisible"
  :title="isEdit ? '编辑用户' : '新建用户'"
  width="600px"
>
  <el-form :model="form" label-width="100px">
    <!-- 表单项 -->
  </el-form>
  <template #footer>
    <el-button @click="formDialogVisible = false">取消</el-button>
    <el-button type="primary" @click="handleSubmit">保存</el-button>
  </template>
</el-dialog>
```

---

## 5. 页面模板

### 5.1 列表页模板

```vue
<template>
  <div class="page-container">
    <!-- 页面 Header -->
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <div class="page-actions">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建用户
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="search-bar">...</div>

    <!-- 表格 -->
    <div class="table-container">
      <el-table :data="tableData" stripe border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)">{{ getRoleName(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="table-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </div>

    <!-- 表单弹窗 -->
    <user-form-dialog v-model="formDialogVisible" :data="currentRow" @success="fetchData" />
  </div>
</template>
```

### 5.2 详情页模板

```vue
<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户详情</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/admin/users' }">用户管理</el-breadcrumb-item>
          <el-breadcrumb-item>用户详情</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="page-actions">
        <el-button @click="handleBack">返回</el-button>
        <el-button type="primary" @click="handleEdit">编辑</el-button>
      </div>
    </div>

    <el-row :gutter="24">
      <el-col :span="16">
        <el-card class="detail-card">
          <template #header>
            <span>基本信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ user.role }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ user.createdAt }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="detail-card" style="margin-top: 16px;">
          <template #header>
            <span>关联猫咪</span>
          </template>
          <el-table :data="user.cats" stripe>
            <el-table-column prop="name" label="名字" />
            <el-table-column prop="breed" label="品种" />
            <el-table-column prop="weight" label="体重" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="detail-card">
          <template #header>
            <span>操作日志</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="log in logs"
              :key="log.id"
              :timestamp="log.createdAt"
              placement="top"
            >
              {{ log.action }} - {{ log.detail }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
```

### 5.3 仪表盘模板

```vue
<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">数据概览</h1>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <el-card class="stat-card">
        <div class="stat-icon-wrapper primary"><el-icon><User /></el-icon></div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-icon-wrapper success"><el-icon><Cat /></el-icon></div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalCats }}</div>
          <div class="stat-label">猫咪总数</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-icon-wrapper warning"><el-icon><ChatDotRound /></el-icon></div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayChats }}</div>
          <div class="stat-label">今日对话</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-icon-wrapper info"><el-icon><Document /></el-icon></div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalGuides }}</div>
          <div class="stat-label">知识指南</div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="24">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <span>用户增长趋势</span>
          </template>
          <div ref="userChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>猫咪品种分布</span>
          </template>
          <div ref="catChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近操作 -->
    <el-card class="recent-card">
      <template #header>
        <span>最近操作</span>
      </template>
      <el-table :data="recentLogs" stripe>
        <el-table-column prop="admin" label="管理员" />
        <el-table-column prop="action" label="操作" />
        <el-table-column prop="module" label="模块" />
        <el-table-column prop="createdAt" label="时间" />
      </el-table>
    </el-card>
  </div>
</template>
```

---

## 6. 交互规范

### 6.1 通用交互

| 场景 | 行为 |
|------|------|
| 点击按钮 | 即时视觉反馈 (opacity 变化) |
| 危险操作 | 弹窗二次确认 |
| 表单提交 | 显示 loading 状态 |
| 操作成功 | 顶部 toast 提示 |
| 操作失败 | 错误原因 toast |
| 删除数据 | 软删除，可恢复 |
| 页面跳转 | 按钮加载状态 |

### 6.2 表格交互

| 交互 | 行为 |
|------|------|
| 行 hover | 显示操作按钮 |
| 多选 | 全选复选框在表头 |
| 排序 | 点击列头切换升/降序 |
| 行内编辑 | 双击进入编辑模式 |
| 批量操作 | 选中后工具栏出现 |

### 6.3 表单交互

| 交互 | 行为 |
|------|------|
| 必填校验 | 红色星号标注 |
| 输入校验 | 实时校验 + blur 校验 |
| 提交校验 | 失败定位到第一个错误 |
| 保存成功 | 关闭弹窗 + 刷新列表 + toast |

### 6.4 空状态

```vue
<el-empty
  v-if="tableData.length === 0"
  description="暂无数据"
  :image-size="120"
>
  <el-button v-if="showCreate" type="primary" @click="handleCreate">
    立即创建
  </el-button>
</el-empty>
```

### 6.5 加载状态

```vue
<!-- 骨架屏 -->
<el-skeleton :rows="6" animated />

<!-- 表格加载 -->
<el-table v-loading="loading" :data="tableData">
  ...
</el-table>

<!-- 按钮加载 -->
<el-button type="primary" :loading="submitting">
  保存
</el-button>
```

### 6.6 错误处理

```vue
<!-- 全局错误提示 -->
<el-message
  v-if="error"
  :type="error.type"
  :message="error.message"
  show-close
/>
```

---

## 7. 权限交互

### 7.1 按钮级权限

```vue
<template>
  <!-- 根据权限显示/隐藏按钮 -->
  <el-button
    v-if="hasPermission('user.delete')"
    type="danger"
    @click="handleDelete"
  >
    删除
  </el-button>

  <!-- 或禁用 -->
  <el-button
    v-hasPermission="'user.delete'"
    type="danger"
    disabled
  >
    无权限
  </el-button>
</template>

<script setup>
const adminStore = useAdminStore()
const hasPermission = (permission) => adminStore.hasPermission(permission)
</script>
```

### 7.2 页面级权限

```typescript
// router/index.ts
{
  path: '/admin/users',
  component: Layout,
  meta: {
    permission: 'user.read',
    requiresAuth: true
  },
  children: [...]
}
```

```typescript
// 路由守卫
router.beforeEach((to, from, next) => {
  if (to.meta.permission && !adminStore.hasPermission(to.meta.permission)) {
    ElMessage.warning('您没有访问该页面的权限')
    next('/admin/dashboard')
    return
  }
  next()
})
```

---

## 8. 响应式规范

### 8.1 断点定义

| 名称 | 宽度 | 场景 |
|------|------|------|
| xs | < 768px | 手机 |
| sm | 768px - 992px | 平板 |
| md | 992px - 1200px | 小屏电脑 |
| lg | 1200px - 1920px | 标准屏幕 |
| xl | > 1920px | 大屏 |

### 8.2 布局响应式

```css
/* 统计卡片 */
@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}

/* 表格 */
@media (max-width: 992px) {
  .el-table {
    font-size: 12px;
  }

  .el-table__header th,
  .el-table__body td {
    padding: 8px 4px;
  }
}

/* 侧边栏折叠 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }
}
```

---

## 9. 导航规范

### 9.1 侧边栏菜单

```vue
<el-menu
  :default-active="activeMenu"
  :unique-opened="true"
  background-color="#304156"
  text-color="#BFCBD9"
  active-text-color="#FFFFFF"
>
  <el-sub-menu index="1">
    <template #title>
      <el-icon><DataAnalysis /></el-icon>
      <span>仪表盘</span>
    </template>
    <el-menu-item index="1-1">数据概览</el-menu-item>
  </el-sub-menu>

  <el-sub-menu index="2">
    <template #title>
      <el-icon><User /></el-icon>
      <span>用户管理</span>
    </template>
    <el-menu-item index="2-1">用户列表</el-menu-item>
    <el-menu-item index="2-2">猫咪列表</el-menu-item>
  </el-sub-menu>

  <el-menu-item index="3">
    <el-icon><Document /></el-icon>
    <span>内容管理</span>
  </el-menu-item>
</el-menu>
```

### 9.2 面包屑

```vue
<el-breadcrumb separator="/">
  <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
  <el-breadcrumb-item :to="{ path: '/admin/users' }">用户管理</el-breadcrumb-item>
  <el-breadcrumb-item>用户详情</el-breadcrumb-item>
</el-breadcrumb>
```

---

## 10. 状态设计

### 10.1 用户状态

| 状态 | 标签颜色 | 说明 |
|------|---------|------|
| 正常 | success (绿色) | 正常使用 |
| 禁用 | info (灰色) | 被禁用 |
| 待验证 | warning (橙色) | 邮箱未验证 |

### 10.2 角色状态

| 角色 | 标签颜色 | 权限等级 |
|------|---------|---------|
| 超级管理员 | danger (红色) | L1 |
| 管理员 | warning (橙色) | L2 |
| 编辑 | primary (主色) | L3 |

### 10.3 操作状态

| 状态 | 颜色 | 说明 |
|------|------|------|
| 新建 | primary | 创建资源 |
| 编辑 | warning | 修改资源 |
| 删除 | danger | 删除资源 |
| 查看 | info | 只读操作 |
| 导出 | success | 导出数据 |

---

## 11. 动效规范

### 11.1 过渡时长

```css
--transition-fast: 0.15s;    /* 按钮 hover */
--transition-normal: 0.3s;   /* 展开/收起 */
--transition-slow: 0.5s;     /* 页面切换 */
```

### 11.2 动效曲线

```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 11.3 动效场景

| 场景 | 动效 |
|------|------|
| 按钮 hover | scale(1.02), 0.15s |
| 弹窗出现 | fadeIn + scale(0.95 → 1), 0.3s |
| 侧边栏展开 | width 变化, 0.3s |
| Toast 提示 | slideIn + fade, 0.3s |
| 页面切换 | fade, 0.2s |

---

## 12. 可访问性 (A11y)

### 12.1 键盘导航

| 快捷键 | 功能 |
|--------|------|
| Tab | 切换焦点 |
| Enter | 确认/提交 |
| Escape | 关闭弹窗 |
| ↑/↓ | 列表导航 |

### 12.2 ARIA 标签

```vue
<el-button aria-label="新建用户">新建</el-button>

<el-input
  aria-label="用户名"
  placeholder="请输入用户名"
/>

<el-table aria-label="用户列表">
  ...
</el-table>
```

---

## 13. 附录

### 13.1 组件命名

| 组件 | 命名规范 | 示例 |
|------|---------|------|
| 页面组件 | [模块][功能]Page.vue | UserListPage.vue |
| 布局组件 | [功能]Layout.vue | AdminLayout.vue |
| 业务组件 | [模块][功能].vue | UserFormDialog.vue |
| 通用组件 | [类型][描述].vue | StatCard.vue |

### 13.2 目录组织

```
src/views/Admin/
├── Layout.vue
├── Dashboard/
│   └── index.vue
├── Users/
│   ├── List.vue
│   ├── Detail.vue
│   └── Form.vue
├── Cats/
│   ├── List.vue
│   └── Detail.vue
└── System/
    ├── Settings.vue
    └── Logs.vue
```

### 13.3 状态管理

```
stores/
├── admin.ts          # 管理员登录状态
├── users.ts         # 用户列表状态
├── cats.ts          # 猫咪列表状态
└── common.ts         # 共享状态
```

---

## 13. 深色模式设计

### 13.1 模式切换策略

```css
/* 主题变量 - 亮色模式（默认） */
:root {
  --color-bg-page: #F5F7FA;
  --color-bg-card: #FFFFFF;
  --color-bg-sidebar: #304156;
  --color-text-primary: #303133;
  --color-text-regular: #606266;
  --color-border-base: #DCDFE6;
}

/* 深色模式 */
:root.dark,
[data-theme="dark"] {
  --color-bg-page: #1A1A2E;
  --color-bg-card: #16213E;
  --color-bg-sidebar: #0F0F1A;
  --color-text-primary: #E4E7ED;
  --color-text-regular: #C0C4CC;
  --color-border-base: #3A3A4A;
}
```

### 13.2 深色模式色彩系统

```css
/* 深色模式专用变量 */
:root.dark {
  /* 背景层次 */
  --dark-bg-base: #1A1A2E;
  --dark-bg-surface: #16213E;
  --dark-bg-elevated: #1F2937;
  --dark-bg-sidebar: #0F0F1A;

  /* 文字层次 */
  --dark-text-primary: #E4E7ED;
  --dark-text-regular: #C0C4CC;
  --dark-text-secondary: #909399;
  --dark-text-disabled: #5C5C6A;

  /* 边框 */
  --dark-border-base: #3A3A4A;
  --dark-border-light: #2D2D3D;
  --dark-border-hover: #4A4A5A;

  /* 状态色（保持高对比度） */
  --dark-success: #67C23A;
  --dark-warning: #E6A23C;
  --dark-danger: #F56C6C;
  --dark-info: #74C0FC;

  /* 主色调（加深处理） */
  --dark-primary: #CC934F;
  --dark-primary-light: #DDA85A;
  --dark-primary-dark: #A67530;
}
```

### 13.3 深色模式组件适配

**表格深色模式**
```css
:root.dark .el-table {
  --el-table-bg-color: var(--dark-bg-surface);
  --el-table-tr-bg-color: var(--dark-bg-surface);
  --el-table-header-bg-color: var(--dark-bg-elevated);
  --el-table-row-hover-bg-color: var(--dark-bg-elevated);
  --el-table-border-color: var(--dark-border-base);
  color: var(--dark-text-primary);
}
```

**侧边栏深色模式**
```css
:root.dark .sidebar {
  background: var(--dark-bg-sidebar);
}

:root.dark .sidebar-item {
  color: var(--dark-text-secondary);
}

:root.dark .sidebar-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--dark-text-primary);
}

:root.dark .sidebar-item.active {
  background: var(--dark-primary);
  color: #FFFFFF;
}
```

**卡片深色模式**
```css
:root.dark .el-card {
  --el-card-bg-color: var(--dark-bg-surface);
  border-color: var(--dark-border-base);
}

:root.dark .content-card {
  background: var(--dark-bg-surface);
  border: 1px solid var(--dark-border-base);
}
```

### 13.4 主题切换实现

```typescript
// theme.ts
export const useTheme = () => {
  const isDark = ref(false)

  const toggleTheme = () => {
    isDark.value = !isDark.value
    document.documentElement.setAttribute(
      'data-theme',
      isDark.value ? 'dark' : 'light'
    )
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  const initTheme = () => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = saved ? saved === 'dark' : prefersDark
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  return { isDark, toggleTheme, initTheme }
}
```

---

## 14. 图标系统

### 14.1 图标库选择

**主图标库**：Element Plus Icons (@element-plus/icons-vue)
**扩展图标库**：Lucide Icons（备选，线性风格）

### 14.2 图标使用规范

| 类型 | 使用场景 | 示例 |
|------|---------|------|
| 功能图标 | 操作按钮内 | Edit, Delete, Plus |
| 导航图标 | 侧边栏菜单 | User, Setting, Document |
| 状态图标 | 提示、徽章 | Success, Warning, Info |
| 品牌图标 | 空状态、加载 | Cat, Paw |

```vue
<!-- 正确用法 -->
<el-button>
  <el-icon><Edit /></el-icon>
  编辑
</el-button>

<!-- 图标尺寸 -->
<el-icon size="16"><Edit /></el-icon>   <!-- 小 -->
<el-icon size="20"><Edit /></el-icon>   <!-- 中 -->
<el-icon size="24"><Edit /></el-icon>   <!-- 大 -->
```

### 14.3 后台管理系统图标清单

```
导航菜单
├── Dashboard        数据分析
├── User            用户管理
├── Cat             猫咪管理
├── Document        指南管理
├── Collection       模板管理
├── ChatDotRound    对话管理
├── DataLine        数据统计
└── Setting          系统设置

操作按钮
├── Plus            新建
├── Edit            编辑
├── Delete          删除
├── View            查看
├── Download        导出
├── Upload          导入
├── Refresh         刷新
├── Search          搜索
├── Filter          筛选
└── More            更多

状态指示
├── SuccessFilled   成功
├── WarningFilled   警告
├── CircleCloseFilled 错误
├── InfoFilled      信息
├── Check           已完成
├── Close           未完成
└── Clock           进行中

通用
├── Bell            通知
├── Message         消息
├── Lock            锁定
├── Unlock          解锁
├── Star            收藏
├── StarFilled      已收藏
└── MoreFilled      更多
```

### 14.4 自定义图标组件

```vue
<!-- Icon.vue -->
<template>
  <component :is="iconComponent" :style="{ fontSize: size, color: color }" />
</template>

<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'

const props = defineProps<{
  name: string
  size?: string | number
  color?: string
}>()

const iconComponent = computed(() => Icons[props.name] || Icons['QuestionFilled'])
</script>

<!-- 使用 -->
<Icon name="Edit" size="16px" />
<Icon name="Delete" size="16px" color="var(--color-danger)" />
```

---

## 15. 数据可视化规范

### 15.1 图表配色方案

**默认配色（沿用品牌色）**
```javascript
const chartColors = {
  primary: '#FFB86C',      // 主色
  success: '#67C23A',      // 成功
  warning: '#E6A23C',      // 警告
  danger: '#F56C6C',       // 危险
  info: '#909399',         // 信息
  // 图表系列色
  series: ['#FFB86C', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#74C0FC', '#B37FEB', '#87CEEB']
}
```

**深色模式配色**
```javascript
const darkChartColors = {
  primary: '#DDA85A',
  series: ['#DDA85A', '#85D26A', '#F0B050', '#FF7070', '#90A0B0', '#90C0FF', '#C8A0FF', '#A0D0FF']
}
```

### 15.2 图表类型规范

| 数据场景 | 推荐图表 | 规范 |
|---------|---------|------|
| 趋势变化 | 折线图 | 线条 2px，数据点 6px |
| 占比分布 | 饼图/环形图 | 扇区间距 2px，标签居中 |
| 分类对比 | 柱状图 | 柱子间距 4px，圆角 4px |
| 排名排序 | 条形图 | 条形间距 8px |
| 关联关系 | 散点图 | 点半径 8px |
| 流程转化 | 漏斗图 | 层级间距 40px |
| 进度监控 | 仪表盘 | 弧度 240°，起始 -120° |

### 15.3 图表通用规范

**容器尺寸**
```css
.chart-container {
  width: 100%;
  height: 300px;   /* 标准高度 */
}

.chart-container.large {
  height: 400px;
}

.chart-container.small {
  height: 200px;
}
```

**标题规范**
```javascript
const chartOptions = {
  title: {
    text: '用户增长趋势',
    left: 'left',
    textStyle: {
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--color-text-primary)'
    }
  },
  legend: {
    bottom: 0,
    textStyle: {
      fontSize: 12,
      color: 'var(--color-text-secondary)'
    }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    textStyle: { color: '#fff' }
  }
}
```

**响应式图表**
```typescript
// 使用 ECharts ResizeObserver
import { use echarts } from '@/composables/useEcharts'

const chartRef = ref<HTMLElement>()
const { setOptions, resize } = useEcharts(chartRef)

onMounted(() => {
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
})
```

### 15.4 常用图表模板

**折线图模板**
```javascript
const lineChartOptions = {
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisLine: { lineStyle: { color: '#E4E7ED' } },
    axisLabel: { color: '#909399' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#F2F2F2', type: 'dashed' } },
    axisLine: { show: false },
    axisLabel: { color: '#909399' }
  },
  series: [{
    type: 'line',
    smooth: true,
    data: [820, 932, 901, 934, 1290, 1330, 1320],
    lineStyle: { width: 2, color: '#FFB86C' },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(255, 184, 108, 0.3)' },
          { offset: 1, color: 'rgba(255, 184, 108, 0.05)' }
        ]
      }
    },
    itemStyle: { color: '#FFB86C' }
  }],
  grid: { left: 50, right: 20, top: 20, bottom: 30 }
}
```

**饼图模板**
```javascript
const pieChartOptions = {
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: {
      borderRadius: 4,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}: {d}%',
      color: 'inherit'
    },
    data: [
      { value: 335, name: '英短', itemStyle: { color: '#FFB86C' } },
      { value: 234, name: '美短', itemStyle: { color: '#67C23A' } },
      { value: 154, name: '田园', itemStyle: { color: '#E6A23C' } }
    ]
  }]
}
```

---

## 16. 核心流程交互图

### 16.1 用户管理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     用户管理流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ 列表页   │───▶│ 新建用户 │───▶│ 填写表单 │───▶│ 保存成功 │ │
│  │          │    │          │    │          │    │          │ │
│  └──────────┘    └──────────┘    └────┬─────┘    └──────────┘ │
│       │                                  │                       │
│       │                                  │ 验证失败               │
│       │                                  ▼                       │
│       │                           ┌──────────┐                   │
│       │                           │ 显示错误 │                   │
│       │                           └──────────┘                   │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ 编辑用户 │───▶│ 确认操作  │───▶│ 保存成功 │                    │
│  └──────────┘    └────┬─────┘    └──────────┘                    │
│       │                │                                        │
│       │                │ 取消                                    │
│       │                ▼                                        │
│       │           ┌──────────┐                                   │
│       │           │ 关闭弹窗 │                                   │
│       │           └──────────┘                                   │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ 删除用户 │───▶│ 二次确认  │───▶│ 删除成功 │                    │
│  └──────────┘    └────┬─────┘    └──────────┘                    │
│                        │ 取消                                    │
│                        ▼                                        │
│                   ┌──────────┐                                   │
│                   │ 关闭弹窗 │                                   │
│                   └──────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 16.2 指南内容管理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    指南内容管理流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ 指南列表  │───▶│ 创建指南  │───▶│ 编辑内容 │───▶│ 保存草稿 │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │                                  │                       │
│       │                                  │ 发布                  │
│       │                                  ▼                       │
│       │                           ┌──────────┐                   │
│       │                           │ 审核预览  │                   │
│       │                           └────┬─────┘                   │
│       │                                │                         │
│       │          ┌────────────────────┼────────────────────┐    │
│       │          │                    │                    │    │
│       ▼          ▼                    ▼                    │    │
│  ┌──────────┐ ┌──────────┐    ┌──────────┐                │    │
│  │ 编辑指南  │ │ 删除指南  │    │ 确认发布  │                │    │
│  └────┬─────┘ └────┬─────┘    └────┬─────┘                │    │
│       │           │                │                       │    │
│       │           │ 确认删除       │ 确认                   │    │
│       │           ▼                ▼                       │    │
│       │     ┌──────────┐    ┌──────────┐                   │    │
│       │     │ 删除成功  │    │ 发布成功  │                   │    │
│       │     └──────────┘    │ 同步知识库 │                   │    │
│       │                     └────┬─────┘                   │    │
│       │                          │                          │    │
│       │                          ▼                          │    │
│       │                    ┌──────────┐                      │    │
│       └───────────────────▶│ 更新列表  │──────────────────────┘    │
│                            └──────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 16.3 数据导出流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据导出流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐                                                   │
│  │ 选择数据  │                                                   │
│  └────┬─────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                   │
│  │ 筛选条件  │                                                   │
│  └────┬─────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ 点击导出  │───▶│ 导出弹窗  │───▶│ 选择格式  │───▶│ 确认导出 │ │
│  │          │    │          │    │ (Excel/  │    │          │ │
│  │          │    │          │    │  CSV)    │    │          │ │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘ │
│                                                        │       │
│       ┌────────────────────────────────────────────────┘       │
│       │                                                           │
│       ▼                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ 生成文件  │───▶│ 下载文件  │───▶│ 导出完成 │                    │
│  │ (Loading) │    │          │    │          │                    │
│  └──────────┘    └──────────┘    └──────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 17. 错误页面设计

### 17.1 HTTP 错误页面

**404 页面**
```vue
<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <div class="error-title">页面不存在</div>
      <div class="error-description">
        抱歉，您访问的页面已不存在或已被删除
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
    </div>
    <div class="error-illustration">
      <img src="@/assets/images/404.svg" alt="404" />
    </div>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-bg-page);
  padding: 24px;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 16px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.error-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-illustration img {
  width: 300px;
  margin-left: 48px;
}
</style>
```

**403 页面**
```vue
<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">403</div>
      <div class="error-title">无权限访问</div>
      <div class="error-description">
        您没有访问该页面的权限，请联系管理员申请权限
      </div>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>
```

**500 页面**
```vue
<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">500</div>
      <div class="error-title">服务器错误</div>
      <div class="error-description">
        抱歉，服务器发生了一些问题，请稍后重试
      </div>
      <el-button @click="refreshPage">
        <el-icon><Refresh /></el-icon>
        刷新页面
      </el-button>
    </div>
  </div>
</template>
```

### 17.2 网络错误处理

```typescript
// errorHandler.ts
export const errorPages = {
  400: { title: '请求错误', message: '请求参数有误，请检查后重试' },
  401: { title: '未登录', message: '请先登录后再操作', action: '去登录' },
  403: { title: '无权限', message: '您没有权限执行此操作' },
  404: { title: '页面不存在', message: '您访问的页面不存在' },
  408: { title: '请求超时', message: '请求超时，请检查网络后重试' },
  500: { title: '服务器错误', message: '服务器繁忙，请稍后重试' },
  502: { title: '网关错误', message: '网关错误，请稍后重试' },
  503: { title: '服务不可用', message: '服务暂时不可用，请稍后重试' },
  504: { title: '网关超时', message: '网关超时，请稍后重试' },
  NETWORK_ERROR: { title: '网络错误', message: '网络连接失败，请检查网络设置' }
}
```

---

## 18. 无障碍支持 (A11y)

### 18.1 ARIA 规范

```vue
<!-- 导航 -->
<nav aria-label="主导航">
  <el-menu aria-label="菜单">
    <el-menu-item aria-label="仪表盘">仪表盘</el-menu-item>
  </el-menu>
</nav>

<!-- 表单 -->
<el-form>
  <el-form-item label="用户名" aria-required="true">
    <el-input
      aria-describedby="username-help"
      aria-invalid="false"
    />
    <span id="username-help" class="help-text">3-20个字符</span>
  </el-form-item>
</el-form>

<!-- 表格 -->
<el-table aria-label="用户列表">
  <el-table-column aria-label="用户名" />
  <el-table-column aria-label="操作" />
</el-table>

<!-- 弹窗 -->
<el-dialog aria-labelledby="dialog-title" aria-describedby="dialog-content">
  <template #title>
    <span id="dialog-title">确认删除</span>
  </template>
  <div id="dialog-content">确定要删除吗？</div>
</el-dialog>

<!-- 加载状态 -->
<div aria-busy="true" aria-live="polite">
  正在加载数据...
</div>
```

### 18.2 焦点管理

```typescript
// focusTrap.ts - 弹窗焦点管理
export const useFocusTrap = (containerRef: Ref<HTMLElement | null>) => {
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const focusable = containerRef.value?.querySelectorAll(focusableElements)
    if (!focusable?.length) return

    const first = focusable[0] as HTMLElement
    const last = focusable[focusable.length - 1] as HTMLElement

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  onMounted(() => {
    containerRef.value?.addEventListener('keydown', handleKeyDown)
    // 自动聚焦到第一个元素
    const first = containerRef.value?.querySelector(focusableElements) as HTMLElement
    first?.focus()
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('keydown', handleKeyDown)
  })
}
```

### 18.3 屏幕阅读器支持

```vue
<!-- 视觉隐藏但屏幕阅读器可读 -->
<span class="sr-only">当前页面</span>

<!-- 状态变化通知 -->
<el-alert
  role="alert"
  aria-live="assertive"
  title="操作成功"
/>

<!-- 表格空状态 -->
<el-table :data="[]">
  <template #empty>
    <span role="img" aria-label="空文件夹">📂</span>
    <span>暂无数据</span>
  </template>
</el-table>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
```

---

## 19. 性能优化指导

### 19.1 图片优化

```typescript
// 图片懒加载
<el-table>
  <el-table-column label="头像">
    <template #default="{ row }">
      <img
        v-lazy="row.avatar"
        alt="用户头像"
        loading="lazy"
        class="avatar-img"
      />
    </template>
  </el-table-column>
</el-table>

<style>
.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
```

### 19.2 组件懒加载

```typescript
// router/index.ts
const routes = [
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/Admin/Dashboard/index.vue'),
      },
      {
        path: 'users',
        component: () => import('@/views/Admin/Users/List.vue'),
      },
    ]
  }
]
```

### 19.3 虚拟滚动

```vue
<!-- 大列表虚拟滚动 -->
<el-table-virtual
  :data="largeDataList"
  :height="400"
  :row-height="48"
>
  <el-table-column prop="name" label="姓名" />
  <el-table-column prop="email" label="邮箱" />
</el-table-virtual>
```

### 19.4 防抖节流

```typescript
// composables/useDebounce.ts
export const useDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
) => {
  let timer: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

// 搜索防抖
const debouncedSearch = useDebounce(handleSearch, 500)
```

---

## 20. 相关文档

- [UI设计规范](../03-设计/UI设计规范.md) - C端设计规范
- [品牌视觉语言手册](../03-设计/品牌视觉语言手册.md)
- [后台管理系统设计方案](../04-架构/后台管理系统设计方案.md)
- [Element Plus 组件库](https://element-plus.org/)

---

_后台管理系统 UE/UX 规范 V1.1 - 最后更新：2026-06-11_

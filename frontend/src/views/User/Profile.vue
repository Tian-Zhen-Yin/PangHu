<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth.js'
import { usePlanStore } from '../../stores/plan.js'
import type { UserPlan } from '../../api/plan.js'

const router = useRouter()
const authStore = useAuthStore()
const planStore = usePlanStore()
const isLoggingOut = ref(false)

// 当前标签页
const currentTab = ref<'overview' | 'plans'>('overview')

// 删除确认
const showDeleteConfirm = ref(false)
const planToDelete = ref<UserPlan | null>(null)

// 编辑用户名
const showEditUsername = ref(false)
const editUsername = ref('')
const editUsernameError = ref('')

// 计划统计
const planStats = computed(() => {
  const plans = planStore.plans
  const total = plans.length
  const active = plans.filter(p => p.isActive).length
  const completed = plans.filter(p => planStore.getPlanCompletion(p.id) === 100).length
  const inProgress = plans.filter(p => {
    const completion = planStore.getPlanCompletion(p.id)
    return completion > 0 && completion < 100
  }).length
  const notStarted = plans.filter(p => planStore.getPlanCompletion(p.id) === 0).length

  return { total, active, completed, inProgress, notStarted }
})

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 退出登录
async function handleLogout() {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    isLoggingOut.value = true
    await authStore.logoutAction()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
  } finally {
    isLoggingOut.value = false
  }
}

// 获取计划进度
function getPlanProgress(plan: UserPlan) {
  return planStore.getPlanCompletion(plan.id)
}

// 设置激活计划
async function handleSetActivePlan(planId: string) {
  await planStore.setActivePlan(planId)
}

// 查看计划详情
function viewPlanDetail(plan: UserPlan) {
  // 跳转到模板详情页，并带上计划ID
  router.push(`/templates/${plan.templateId}?planId=${plan.id}`)
}

// 确认删除计划
function confirmDeletePlan(plan: UserPlan) {
  planToDelete.value = plan
  showDeleteConfirm.value = true
}

// 删除计划
async function handleDeletePlan() {
  if (planToDelete.value) {
    const success = await planStore.deleteUserPlan(planToDelete.value.id)
    if (success) {
      showDeleteConfirm.value = false
      planToDelete.value = null
    }
  }
}

// 获取进度条颜色
function getProgressColor(completion: number): string {
  if (completion === 0) return 'var(--color-border-light)'
  if (completion < 30) return 'var(--color-primary)'
  if (completion < 70) return 'var(--color-warning)'
  return 'var(--color-success)'
}

// 打开编辑用户名弹窗
function openEditUsername() {
  editUsername.value = authStore.user?.username || ''
  editUsernameError.value = ''
  showEditUsername.value = true
}

// 关闭编辑用户名弹窗
function closeEditUsername() {
  showEditUsername.value = false
  editUsername.value = ''
  editUsernameError.value = ''
}

// 保存用户名
async function saveUsername() {
  // 验证
  if (!editUsername.value || editUsername.value.trim().length < 3) {
    editUsernameError.value = '用户名长度至少3个字符'
    return
  }
  if (editUsername.value.trim().length > 20) {
    editUsernameError.value = '用户名长度不能超过20个字符'
    return
  }

  const success = await authStore.updateUsernameAction(editUsername.value.trim())
  if (success) {
    closeEditUsername()
  } else {
    editUsernameError.value = authStore.error || '更新失败，请重试'
  }
}

onMounted(async () => {
  // 如果未登录，跳转到登录页
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  // 获取用户计划
  await planStore.fetchPlans()
})
</script>

<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 页面头部 -->
      <div class="profile-header">
        <h1 class="page-title">
          <span class="title-emoji" aria-hidden="true">👤</span>
          <span>个人中心</span>
        </h1>
        <button @click="handleLogout" class="logout-btn" :disabled="isLoggingOut">
          {{ isLoggingOut ? '退出中...' : '退出登录' }}
        </button>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs">
        <button
          :class="['tab', { active: currentTab === 'overview' }]"
          @click="currentTab = 'overview'"
        >
          概览
        </button>
        <button
          :class="['tab', { active: currentTab === 'plans' }]"
          @click="currentTab = 'plans'"
        >
          我的计划
          <span v-if="planStats.total > 0" class="badge">{{ planStats.total }}</span>
        </button>
      </div>

      <!-- 概览标签页 -->
      <div v-show="currentTab === 'overview'" class="tab-content">
        <!-- 用户信息卡片 -->
        <div v-if="authStore.user" class="user-card">
          <div class="user-avatar">
            {{ authStore.user?.username?.charAt(0).toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <div class="user-name-row">
              <h2 class="user-name">{{ authStore.user.username }}</h2>
              <button @click="openEditUsername" class="edit-btn">✏️ 编辑</button>
            </div>
            <div class="user-details">
              <div class="detail-item">
                <span class="detail-label">邮箱</span>
                <span class="detail-value">{{ authStore.user.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">注册时间</span>
                <span class="detail-value">{{ formatDate(authStore.user.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 计划统计卡片 -->
        <div class="stats-section">
          <h3 class="section-title">计划统计</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon">📋</span>
              <div class="stat-content">
                <span class="stat-value">{{ planStats.total }}</span>
                <span class="stat-label">总计划</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">✅</span>
              <div class="stat-content">
                <span class="stat-value">{{ planStats.completed }}</span>
                <span class="stat-label">已完成</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">🔄</span>
              <div class="stat-content">
                <span class="stat-value">{{ planStats.inProgress }}</span>
                <span class="stat-label">进行中</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">⭐</span>
              <div class="stat-content">
                <span class="stat-value">{{ planStats.active }}</span>
                <span class="stat-label">激活中</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷功能 -->
        <div class="features-section">
          <h3 class="section-title">快捷功能</h3>
          <div class="features-grid">
            <button class="feature-card" @click="router.push('/templates')">
              <span class="feature-icon" aria-hidden="true">📚</span>
              <span class="feature-text">
                <span class="feature-name">浏览模板</span>
                <span class="feature-desc">发现更多养成计划</span>
              </span>
            </button>
            <button class="feature-card" @click="currentTab = 'plans'">
              <span class="feature-icon" aria-hidden="true">📋</span>
              <span class="feature-text">
                <span class="feature-name">我的计划</span>
                <span class="feature-desc">查看所有保存的计划</span>
              </span>
            </button>
            <button class="feature-card" @click="router.push('/timeline')">
              <span class="feature-icon" aria-hidden="true">📅</span>
              <span class="feature-text">
                <span class="feature-name">时间线</span>
                <span class="feature-desc">查看养成时间线</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- 我的计划标签页 -->
      <div v-show="currentTab === 'plans'" class="tab-content">
        <!-- 空状态 -->
        <div v-if="!planStore.loading && planStats.total === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <h3 class="empty-title">还没有保存的计划</h3>
          <p class="empty-desc">去浏览模板，保存你喜欢的养成计划吧！</p>
          <button class="btn-primary" @click="router.push('/templates')">
            浏览模板
          </button>
        </div>

        <!-- 计划列表 -->
        <div v-else class="plans-list">
          <!-- 统计摘要 -->
          <div class="plans-summary">
            <div class="summary-item">
              <span class="summary-label">总计划数</span>
              <span class="summary-value">{{ planStats.total }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">进行中</span>
              <span class="summary-value">{{ planStats.inProgress }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">未开始</span>
              <span class="summary-value">{{ planStats.notStarted }}</span>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-if="planStore.loading" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>

          <!-- 计划卡片 -->
          <div v-for="plan in planStore.plans" :key="plan.id" class="plan-card">
            <div class="plan-header">
              <div class="plan-info">
                <h3 class="plan-name">{{ plan.name }}</h3>
                <span class="plan-date">{{ formatDate(plan.createdAt) }}</span>
              </div>
              <div class="plan-badge" :class="{ active: plan.isActive }">
                {{ plan.isActive ? '激活中' : '未激活' }}
              </div>
            </div>

            <!-- 进度条 -->
            <div class="plan-progress">
              <div class="progress-header">
                <span class="progress-label">完成进度</span>
                <span class="progress-value">{{ getPlanProgress(plan) }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div
                  class="progress-bar-fill"
                  :style="{
                    width: getPlanProgress(plan) + '%',
                    backgroundColor: getProgressColor(getPlanProgress(plan))
                  }"
                ></div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="plan-actions">
              <button
                v-if="!plan.isActive"
                class="btn-action btn-activate"
                @click="handleSetActivePlan(plan.id)"
              >
                ⭐ 设为激活
              </button>
              <button
                class="btn-action btn-view"
                @click="viewPlanDetail(plan)"
              >
                👁️ 查看详情
              </button>
              <button
                class="btn-action btn-delete"
                @click="confirmDeletePlan(plan)"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-content">
          确定要删除计划「{{ planToDelete?.name }}」吗？此操作无法撤销。
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteConfirm = false">
            取消
          </button>
          <button class="btn-danger" @click="handleDeletePlan">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑用户名弹窗 -->
    <div v-if="showEditUsername" class="modal-overlay" @click.self="closeEditUsername">
      <div class="modal">
        <h3 class="modal-title">修改用户名</h3>
        <div class="edit-form">
          <div class="form-group">
            <label for="username">新用户名</label>
            <input
              id="username"
              v-model="editUsername"
              type="text"
              placeholder="请输入3-20个字符（支持中文、字母、数字）"
              class="form-input"
              :class="{ error: !!editUsernameError }"
              @keyup.enter="saveUsername"
            />
            <span v-if="editUsernameError" class="error-hint">{{ editUsernameError }}</span>
            <span v-else class="input-hint">3-20个字符，支持中文、字母、数字</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeEditUsername" :disabled="authStore.loading">
            取消
          </button>
          <button class="btn-primary" @click="saveUsername" :disabled="authStore.loading">
            {{ authStore.loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
 * 页面级容器：使用 token 化的间距与背景
 * ============================================================ */
.profile-page {
  background: var(--color-bg-page);
  padding: var(--space-2xl) var(--space-lg) 96px;
}

@media (min-width: 768px) {
  .profile-page {
    padding: var(--space-2xl) var(--space-xl) var(--space-2xl);
  }
}

.profile-container {
  max-width: 760px;
  margin: 0 auto;
}

/* ============================================================
 * 页面头部
 * ============================================================ */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.title-emoji {
  font-size: 24px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-primary-light);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}

.page-title :deep(.emoji),
.page-title {
  /* emoji 不再抢主导，控制其行内呈现 */
}

.logout-btn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  color: var(--color-text-regular);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============================================================
 * 标签页导航 —— 1 档阴影 (subtle)
 * ============================================================ */
.tabs {
  display: flex;
  gap: var(--space-xs);
  background: var(--color-bg-card);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-xl);
  box-shadow: var(--shadow-xs);
}

.tab {
  flex: 1;
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  color: var(--color-text-regular);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.tab:hover {
  background: var(--color-bg-block-hover);
}

.tab.active {
  background: var(--color-primary-gradient);
  color: var(--color-text-white);
}

.badge {
  background: rgba(255, 255, 255, 0.28);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  line-height: 1.4;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============================================================
 * Section 容器 —— 大圆角 + soft shadow（与 list-item 区分层级）
 * 列表项 (plan-card) 改用 border + 小圆角
 * ============================================================ */
.user-card,
.stats-section,
.features-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card-normal);
  margin-bottom: var(--space-xl);
}

/* ============================================================
 * 用户信息卡片 —— 头像 72px、字号收敛
 * ============================================================ */
.user-card {
  display: flex;
  gap: var(--space-xl);
  align-items: center;
}

.user-avatar {
  width: 72px;
  height: 72px;
  background: var(--color-primary-gradient);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-white);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.user-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin: 0;
}

.edit-btn {
  padding: var(--space-xs) var(--space-md);
  background: var(--color-bg-block);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  color: var(--color-text-regular);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.detail-item {
  display: flex;
  gap: var(--space-md);
  align-items: baseline;
}

.detail-label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  min-width: 64px;
}

.detail-value {
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

/* ============================================================
 * Section 标题
 * ============================================================ */
.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-lg) 0;
}

/* ============================================================
 * 统计卡片 —— 数字主角、图标克制
 * 纵横比 ≈ 1.6:1，固定 min-height
 * ============================================================ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  min-height: 80px;
  background: var(--color-bg-block);
  border-radius: var(--radius-xs);
}

.stat-icon {
  font-size: var(--text-xl);
  line-height: 1;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

/* ============================================================
 * 功能卡片 —— 横向布局，避免"竖条感"
 * ============================================================ */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-md);
}

.feature-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--color-bg-block);
  border: none;
  border-radius: var(--radius-xs);
  padding: var(--space-md) var(--space-lg);
  min-height: 80px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  background: var(--color-primary-light);
}

.feature-icon {
  font-size: 24px;
  line-height: 1;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feature-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.feature-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

/* ============================================================
 * 计划列表 —— 摘要 + 列表项
 * 列表项使用 border + 小圆角，与 section 形成层级
 * ============================================================ */
.plans-summary {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  background: var(--color-bg-card);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card-normal);
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  font-weight: var(--font-medium);
}

.summary-value {
  display: block;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  line-height: var(--leading-tight);
}

.empty-state {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  box-shadow: var(--shadow-card-normal);
}

.empty-icon {
  font-size: 48px;
  line-height: 1;
  display: block;
  margin-bottom: var(--space-md);
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-xl) 0;
  line-height: var(--leading-normal);
}

.btn-primary {
  padding: var(--space-md) var(--space-xl);
  background: var(--color-primary-gradient);
  border: none;
  border-radius: var(--radius-xs);
  color: var(--color-text-white);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: var(--space-2xl);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 计划卡片 —— 列表项层级（无 shadow、border 描边） */
.plan-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.plan-card:hover {
  border-color: var(--color-border-normal);
  box-shadow: var(--shadow-card-normal);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.plan-info {
  flex: 1;
  min-width: 0;
}

.plan-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-xs) 0;
  line-height: var(--leading-tight);
}

.plan-date {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.plan-badge {
  padding: var(--space-xs) var(--space-md);
  background: var(--color-bg-block);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.plan-badge.active {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

/* 进度条 */
.plan-progress {
  margin-bottom: var(--space-lg);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.progress-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.progress-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.progress-bar-bg {
  height: 6px;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease, background-color 0.3s ease;
}

/* 操作按钮 */
.plan-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.btn-action {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  background: var(--color-bg-card);
  color: var(--color-text-regular);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: var(--color-bg-block);
}

.btn-activate:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.btn-view:hover {
  background: var(--color-success-bg);
  border-color: var(--color-success);
  color: var(--color-success);
}

.btn-delete:hover {
  background: var(--color-danger-bg);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* ============================================================
 * 弹窗
 * ============================================================ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 41, 38, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-lg);
}

.modal {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  max-width: 420px;
  width: 100%;
  box-shadow: var(--shadow-md);
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.modal-content {
  font-size: var(--text-sm);
  color: var(--color-text-regular);
  margin: 0 0 var(--space-xl) 0;
  line-height: var(--leading-normal);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
}

.btn-secondary {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  color: var(--color-text-regular);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-bg-block);
  border-color: var(--color-border-normal);
}

.btn-danger {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-danger);
  border: none;
  border-radius: var(--radius-xs);
  color: var(--color-text-white);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-danger:hover {
  opacity: 0.9;
}

/* 编辑表单 */
.edit-form {
  margin-bottom: var(--space-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-regular);
}

.form-input {
  padding: var(--space-md) var(--space-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  font-size: var(--text-base);
  background: var(--color-bg-card);
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.form-input.error {
  border-color: var(--color-danger);
}

.input-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.error-hint {
  font-size: var(--text-xs);
  color: var(--color-danger);
}

/* ============================================================
 * 响应式：与设计系统对齐到 768px
 * ============================================================ */
@media (max-width: 768px) {
  .user-card {
    flex-direction: column;
    text-align: center;
    gap: var(--space-md);
  }

  .user-name-row {
    justify-content: center;
  }

  .user-details {
    align-items: center;
  }

  .detail-item {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .plan-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-sm);
  }

  .plan-badge {
    align-self: flex-start;
  }

  .plan-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
  }
}
</style>

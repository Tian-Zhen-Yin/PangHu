<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { usePlanStore } from '../../stores/plan.js'
import type { UserPlan } from '../../api/plan.js'

const router = useRouter()
const authStore = useAuthStore()
const planStore = usePlanStore()

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
  await authStore.logoutAction()
  router.push('/login')
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
        <h1 class="page-title">👤 个人中心</h1>
        <button @click="handleLogout" class="logout-btn">
          退出登录
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
              <span class="feature-icon">📚</span>
              <span class="feature-name">浏览模板</span>
              <span class="feature-desc">发现更多养成计划</span>
            </button>
            <button class="feature-card" @click="currentTab = 'plans'">
              <span class="feature-icon">📋</span>
              <span class="feature-name">我的计划</span>
              <span class="feature-desc">查看所有保存的计划</span>
            </button>
            <button class="feature-card" @click="router.push('/timeline')">
              <span class="feature-icon">📅</span>
              <span class="feature-name">时间线</span>
              <span class="feature-desc">查看养成时间线</span>
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
.profile-page {
  background: var(--color-bg-page);
  padding: 2rem 1rem 100px;
}

@media (min-width: 768px) {
  .profile-page {
    padding: 2rem 1rem 80px;
  }
}

.profile-container {
  max-width: 900px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.logout-btn {
  padding: 0.625rem 1.25rem;
  background: white;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  color: var(--color-text-regular);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* 标签页导航 */
.tabs {
  display: flex;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: var(--color-text-regular);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab:hover {
  background: var(--color-bg-block-hover);
}

.tab.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
}

.badge {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户信息卡片 */
.user-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 2rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.user-avatar {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.edit-btn {
  padding: 0.375rem 0.75rem;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  border-radius: 0.5rem;
  color: var(--color-text-regular);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: var(--color-bg-block-hover);
  border-color: var(--color-border-light);
  color: var(--color-text-regular);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  gap: 1rem;
}

.detail-label {
  color: var(--color-text-regular);
  font-size: 0.875rem;
  min-width: 80px;
}

.detail-value {
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

/* 统计卡片 */
.stats-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-page);
  border-radius: 0.75rem;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-regular);
}

/* 功能卡片 */
.features-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.feature-card {
  background: var(--color-bg-page);
  border: none;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: var(--color-bg-cream);
}

.feature-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.feature-name {
  display: block;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.feature-desc {
  font-size: 0.875rem;
  color: var(--color-text-placeholder);
}

/* 计划列表 */
.plans-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: white;
  padding: 1rem;
  border-radius: 0.75rem;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-regular);
  margin-bottom: 0.25rem;
}

.summary-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.empty-state {
  background: white;
  border-radius: 1rem;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-desc {
  color: var(--color-text-regular);
  margin: 0 0 1.5rem 0;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 计划卡片 */
.plan-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.plan-info {
  flex: 1;
}

.plan-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
}

.plan-date {
  font-size: 0.8125rem;
  color: var(--color-text-placeholder);
}

.plan-badge {
  padding: 0.25rem 0.75rem;
  background: var(--color-bg-block-hover);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--color-text-regular);
  white-space: nowrap;
}

.plan-badge.active {
  background: var(--color-bg-cream);
  color: var(--color-primary-dark);
}

/* 进度条 */
.plan-progress {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-size: 0.875rem;
  color: var(--color-text-regular);
}

.progress-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-bar-bg {
  height: 8px;
  background: var(--color-bg-block-hover);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

/* 操作按钮 */
.plan-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-action {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: 0.5rem;
  background: white;
  color: var(--color-text-regular);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: var(--color-bg-page);
}

.btn-activate:hover {
  background: var(--color-bg-cream);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.btn-view:hover {
  background: #f0fdf4;
  border-color: var(--color-success);
  color: var(--color-success);
}

.btn-delete:hover {
  background: #fef2f2;
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem 0;
}

.modal-content {
  color: var(--color-text-regular);
  margin: 0 0 1.5rem 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  background: white;
  border: 1px solid var(--color-border-light);
  border-radius: 0.5rem;
  color: var(--color-text-regular);
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--color-bg-page);
}

.btn-danger {
  padding: 0.625rem 1.25rem;
  background: var(--color-danger);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger:hover {
  background: var(--color-danger);
}

/* 编辑表单 */
.edit-form {
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.form-input.error {
  border-color: var(--color-danger);
}

.input-hint {
  font-size: 0.75rem;
  color: var(--color-text-placeholder);
}

.error-hint {
  font-size: 0.75rem;
  color: var(--color-danger);
}

@media (max-width: 600px) {
  .user-card {
    flex-direction: column;
    text-align: center;
  }

  .detail-item {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .plan-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .plan-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
  }
}
</style>

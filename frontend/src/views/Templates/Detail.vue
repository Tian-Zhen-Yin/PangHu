<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTemplateStore } from '../../stores/template.js'
import { usePlanStore } from '../../stores/plan.js'
import { useAuthStore } from '../../stores/auth.js'
import type { UserPlan } from '../../api/plan.js'

const route = useRoute()
const router = useRouter()
const templateStore = useTemplateStore()
const planStore = usePlanStore()
const authStore = useAuthStore()

const template = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const saveSuccess = ref(false)

// 显示保存弹窗
const showSaveModal = ref(false)
const planName = ref('')

// 显示分享弹窗
const showShareModal = ref(false)

// 当前用户计划
const currentPlan = ref<UserPlan | null>(null)
const planId = ref<string | null>(null)

// 任务进度状态
const taskProgress = ref<Record<string, { completed: boolean; date?: string; notes?: string }>>({})
const savingProgress = ref(false)
const progressSaved = ref(false)

// 解析后的模板内容
const parsedContent = computed(() => {
  if (!template.value) return null
  return templateStore.parseTemplateContent(template.value.content)
})

// 检查是否已保存
const isSaved = computed(() => {
  if (!template.value || !authStore.isAuthenticated) return false
  return planStore.plans.some(p => p.templateId === template.value.id)
})

// 是否为编辑模式（有 planId）
const isEditMode = computed(() => !!planId.value)

// 计划进度百分比
const progressPercentage = computed(() => {
  const tasks = getAllTasks()
  if (tasks.length === 0) return 0
  const completed = tasks.filter(t => taskProgress.value[t.id]?.completed).length
  return Math.round((completed / tasks.length) * 100)
})

// 分享链接
const shareUrl = computed(() => {
  return typeof window !== 'undefined' ? window.location.href : ''
})

// 获取所有任务（扁平化）
function getAllTasks(): Array<{ id: string; title: string; description?: string }> {
  if (!parsedContent.value) return []

  const tasks: Array<{ id: string; title: string; description?: string }> = []

  // 简单任务列表
  if (parsedContent.value.tasks) {
    parsedContent.value.tasks.forEach((task: any, index: number) => {
      tasks.push({ id: `task-${index}`, title: task.title, description: task.description })
    })
  }

  // 分类任务
  const categories = ['annual', 'monthly', 'weekly', 'daily']
  categories.forEach(category => {
    if (parsedContent.value[category]) {
      parsedContent.value[category].forEach((task: any, index: number) => {
        tasks.push({
          id: `${category}-${index}`,
          title: task.title,
          description: task.description
        })
      })
    }
  })

  // 疫苗接种时间表
  if (parsedContent.value.schedule) {
    parsedContent.value.schedule.forEach((item: any, index: number) => {
      tasks.push({
        id: `schedule-${index}`,
        title: item.vaccine,
        description: `${item.age} - ${item.notes || ''}`
      })
    })
  }

  return tasks
}

// 加载当前计划
function loadCurrentPlan() {
  if (!planId.value || !template.value) return

  const plan = planStore.plans.find(p => p.id === planId.value)
  if (plan) {
    currentPlan.value = plan
    try {
      const progress = JSON.parse(plan.progress)
      taskProgress.value = progress
    } catch {
      taskProgress.value = {}
    }
  }
}

// 切换任务完成状态
async function toggleTask(taskId: string) {
  const current = taskProgress.value[taskId]
  const newCompleted = !current?.completed

  if (newCompleted) {
    taskProgress.value[taskId] = {
      completed: true,
      date: new Date().toISOString()
    }
  } else {
    taskProgress.value[taskId] = {
      completed: false
    }
  }

  // 自动保存进度
  await saveProgress()
}

// 保存进度
async function saveProgress() {
  if (!planId.value) return

  savingProgress.value = true
  try {
    await planStore.updateProgress(planId.value, taskProgress.value)
    progressSaved.value = true
    setTimeout(() => {
      progressSaved.value = false
    }, 2000)
  } catch (err) {
    console.error('保存进度失败:', err)
  } finally {
    savingProgress.value = false
  }
}

// 检查任务是否完成
function isTaskCompleted(taskId: string): boolean {
  return taskProgress.value[taskId]?.completed || false
}

// 返回上一页
function goBack() {
  router.back()
}

// 打开保存弹窗
function openSaveModal() {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  planName.value = template.value?.name || ''
  showSaveModal.value = true
}

// 保存模板
async function saveTemplate() {
  if (!template.value) return

  saving.value = true
  const success = await planStore.saveTemplate(template.value.id, planName.value)
  saving.value = false

  if (success) {
    saveSuccess.value = true
    showSaveModal.value = false
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  }
}

// 导出模板为 JSON
function exportTemplate() {
  if (!template.value) return

  const data = {
    name: template.value.name,
    description: template.value.description,
    category: template.value.category,
    content: template.value.content,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.value.name}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 复制分享链接
function copyShareLink() {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    showShareModal.value = false
    // 可以添加一个提示
  })
}

// 获取模板详情
async function fetchTemplate() {
  const id = route.params.id as string
  loading.value = true
  error.value = null
  try {
    const data = await templateStore.fetchTemplateById(id)
    if (data) {
      template.value = data
    } else {
      error.value = '模板不存在'
    }
  } catch (err: any) {
    error.value = err.message || '获取模板失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 获取 URL 中的 planId 参数
  planId.value = (route.query.planId as string) || null

  await fetchTemplate()

  // 如果已登录，获取用户的计划列表
  if (authStore.isAuthenticated) {
    await planStore.fetchPlans()

    // 如果有 planId，加载当前计划
    if (planId.value) {
      loadCurrentPlan()
    }
  }
})

// 监听 plans 变化，当 plans 加载完成后重新加载当前计划
watch(() => planStore.plans, () => {
  if (planId.value && !currentPlan.value) {
    loadCurrentPlan()
  }
})
</script>

<template>
  <div class="template-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchTemplate" class="retry-btn">重试</button>
    </div>

    <!-- 模板内容 -->
    <div v-else-if="template && parsedContent" class="template-content">
      <!-- 返回按钮 -->
      <div class="top-bar">
        <button @click="goBack" class="back-btn">
          ← 返回{{ isEditMode ? '我的计划' : '模板列表' }}
        </button>
        <div class="action-buttons">
          <!-- 编辑模式下的进度保存提示 -->
          <transition name="fade">
            <span v-if="progressSaved" class="progress-saved">✓ 进度已保存</span>
          </transition>
          <button @click="openSaveModal" :class="['action-btn', 'save-btn', { saved: isSaved }]">
            {{ isSaved ? '✓ 已保存' : '📋 使用此模板' }}
          </button>
          <button @click="showShareModal = true" class="action-btn share-btn">
            🔗 分享
          </button>
          <button @click="exportTemplate" class="action-btn export-btn">
            📥 导出
          </button>
        </div>
      </div>

      <!-- 成功提示 -->
      <transition name="fade">
        <div v-if="saveSuccess" class="success-toast">
          ✓ 模板已保存到我的计划
        </div>
      </transition>

      <!-- 编辑模式：显示当前计划信息 -->
      <div v-if="isEditMode && currentPlan" class="plan-info-bar">
        <div class="plan-info-content">
          <span class="plan-name">📋 {{ currentPlan.name }}</span>
          <div class="progress-info">
            <span class="progress-label">完成进度</span>
            <div class="progress-bar-container">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
              </div>
              <span class="progress-text">{{ progressPercentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 模板头部 -->
      <div class="template-header">
        <div class="template-meta">
          <span class="category-tag">
            {{ templateStore.getCategoryIcon(template.category) }} {{ template.category }}
          </span>
          <span v-if="isEditMode" class="edit-mode-badge">编辑模式</span>
        </div>
        <h1 class="template-title">{{ template.name }}</h1>
        <p class="template-description">{{ template.description }}</p>
      </div>

      <!-- 任务列表 -->
      <div class="template-sections">
        <!-- 简单任务列表 -->
        <div v-if="parsedContent.tasks" class="task-section">
          <div class="section-header">
            <h2 class="section-title">📝 任务清单</h2>
            <span v-if="isEditMode" class="section-hint">点击复选框标记任务完成</span>
          </div>
          <div class="task-list">
            <div
              v-for="(task, index) in parsedContent.tasks"
              :key="index"
              :class="['task-item', { completed: isTaskCompleted(`task-${index}`) }]"
            >
              <div class="task-checkbox">
                <input
                  type="checkbox"
                  :id="`task-${index}`"
                  :checked="isTaskCompleted(`task-${index}`)"
                  :disabled="!isEditMode"
                  @change="toggleTask(`task-${index}`)"
                />
                <label :for="`task-${index}`"></label>
              </div>
              <div class="task-content">
                <h3 class="task-title">{{ task.title }}</h3>
                <p v-if="task.description" class="task-description">{{ task.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 疫苗接种时间表 -->
        <div v-else-if="parsedContent.schedule" class="schedule-section">
          <div class="section-header">
            <h2 class="section-title">💉 疫苗接种时间表</h2>
            <span v-if="isEditMode" class="section-hint">点击标记完成状态</span>
          </div>
          <div class="schedule-list">
            <div
              v-for="(item, index) in parsedContent.schedule"
              :key="index"
              :class="['schedule-item', { completed: isTaskCompleted(`schedule-${index}`) }]"
            >
              <div class="schedule-checkbox" v-if="isEditMode">
                <input
                  type="checkbox"
                  :id="`schedule-${index}`"
                  :checked="isTaskCompleted(`schedule-${index}`)"
                  @change="toggleTask(`schedule-${index}`)"
                />
                <label :for="`schedule-${index}`"></label>
              </div>
              <div class="schedule-age">{{ item.age }}</div>
              <div class="schedule-vaccine">{{ item.vaccine }}</div>
              <div class="schedule-status">
                <span :class="['status-badge', isTaskCompleted(`schedule-${index}`) ? 'done' : 'pending']">
                  {{ isTaskCompleted(`schedule-${index}`) ? '已完成' : '待完成' }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="parsedContent.reminders" class="reminders">
            <h3 class="reminders-title">💡 温馨提示</h3>
            <ul class="reminders-list">
              <li v-for="(reminder, index) in parsedContent.reminders" :key="index">
                {{ reminder }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 分类任务（年度/月度/日常） -->
        <div v-else-if="parsedContent.annual" class="categorized-tasks">
          <div v-if="parsedContent.annual" class="task-category">
            <div class="section-header">
              <h2 class="category-title">📅 年度任务</h2>
            </div>
            <div class="task-list">
              <div
                v-for="(task, index) in parsedContent.annual"
                :key="`annual-${index}`"
                :class="['task-item', { completed: isTaskCompleted(`annual-${index}`) }]"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :id="`annual-${index}`"
                    :checked="isTaskCompleted(`annual-${index}`)"
                    :disabled="!isEditMode"
                    @change="toggleTask(`annual-${index}`)"
                  />
                  <label :for="`annual-${index}`"></label>
                </div>
                <div class="task-content">
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="parsedContent.monthly" class="task-category">
            <div class="section-header">
              <h2 class="category-title">📆 月度任务</h2>
            </div>
            <div class="task-list">
              <div
                v-for="(task, index) in parsedContent.monthly"
                :key="`monthly-${index}`"
                :class="['task-item', { completed: isTaskCompleted(`monthly-${index}`) }]"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :id="`monthly-${index}`"
                    :checked="isTaskCompleted(`monthly-${index}`)"
                    :disabled="!isEditMode"
                    @change="toggleTask(`monthly-${index}`)"
                  />
                  <label :for="`monthly-${index}`"></label>
                </div>
                <div class="task-content">
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="parsedContent.weekly" class="task-category">
            <div class="section-header">
              <h2 class="category-title">📋 周任务</h2>
            </div>
            <div class="task-list">
              <div
                v-for="(task, index) in parsedContent.weekly"
                :key="`weekly-${index}`"
                :class="['task-item', { completed: isTaskCompleted(`weekly-${index}`) }]"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :id="`weekly-${index}`"
                    :checked="isTaskCompleted(`weekly-${index}`)"
                    :disabled="!isEditMode"
                    @change="toggleTask(`weekly-${index}`)"
                  />
                  <label :for="`weekly-${index}`"></label>
                </div>
                <div class="task-content">
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="parsedContent.daily" class="task-category">
            <div class="section-header">
              <h2 class="category-title">✅ 日常任务</h2>
            </div>
            <div class="task-list">
              <div
                v-for="(task, index) in parsedContent.daily"
                :key="`daily-${index}`"
                :class="['task-item', { completed: isTaskCompleted(`daily-${index}`) }]"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :id="`daily-${index}`"
                    :checked="isTaskCompleted(`daily-${index}`)"
                    :disabled="!isEditMode"
                    @change="toggleTask(`daily-${index}`)"
                  />
                  <label :for="`daily-${index}`"></label>
                </div>
                <div class="task-content">
                  <h3 class="task-title">{{ task.title }}</h3>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 通用内容 -->
        <div v-else-if="parsedContent.content" class="content-section">
          <div class="rich-content" v-html="parsedContent.content"></div>
        </div>
      </div>
    </div>

    <!-- 保存弹窗 -->
    <div v-if="showSaveModal" class="modal-overlay" @click="showSaveModal = false">
      <div class="modal-content small" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">📋 保存到我的计划</h3>
          <button @click="showSaveModal = false" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">计划名称</label>
            <input
              v-model="planName"
              type="text"
              class="form-input"
              placeholder="给这个计划起个名字"
            />
          </div>
          <div class="modal-actions">
            <button @click="showSaveModal = false" class="btn-secondary">
              取消
            </button>
            <button
              @click="saveTemplate"
              :disabled="saving || !planName.trim()"
              class="btn-primary"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false">
      <div class="modal-content small" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">🔗 分享模板</h3>
          <button @click="showShareModal = false" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p class="share-text">复制链接分享给朋友：</p>
          <div class="share-link-box">
            <input :value="shareUrl" readonly class="share-input" />
            <button @click="copyShareLink" class="copy-btn">复制</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-detail-page {
  background: var(--color-bg-page);
  padding: 1rem 1rem 100px;
}

@media (min-width: 768px) {
  .template-detail-page {
    padding: 1rem 1rem 80px;
  }
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.template-content {
  max-width: 900px;
  margin: 0 auto;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.back-btn {
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

.back-btn:hover {
  background: var(--color-bg-page);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.action-btn {
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

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn.saved {
  background: #ecfdf5;
  border-color: var(--color-success);
  color: var(--color-success);
}

.progress-saved {
  padding: 0.5rem 1rem;
  background: #ecfdf5;
  color: var(--color-success);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.success-toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  background: #ecfdf5;
  border: 1px solid var(--color-success);
  border-radius: 0.5rem;
  color: var(--color-success);
  font-weight: 500;
  z-index: 100;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 计划信息栏 */
.plan-info-bar {
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, #ffedd5 100%);
  border: 1px solid #fdba74;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.plan-info-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.plan-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.progress-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
}

.progress-label {
  font-size: 0.875rem;
  color: #9a3412;
  white-space: nowrap;
}

.progress-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--color-primary-medium);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-dark);
  min-width: 3rem;
  text-align: right;
}

/* 模板头部 */
.template-header {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.template-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.category-tag {
  padding: 0.375rem 0.875rem;
  background: var(--color-bg-cream);
  color: var(--color-primary-dark);
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
}

.edit-mode-badge {
  padding: 0.375rem 0.875rem;
  background: #dbeafe;
  color: var(--color-info);
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
}

.template-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem 0;
}

.template-description {
  color: var(--color-text-regular);
  font-size: 1.125rem;
  line-height: 1.6;
  margin: 0;
}

/* 模板区块 */
.template-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.section-hint {
  font-size: 0.875rem;
  color: var(--color-text-placeholder);
}

.task-section,
.schedule-section,
.categorized-tasks {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-category {
  margin-bottom: 2rem;
}

.task-category:last-child {
  margin-bottom: 0;
}

.category-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-bg-block-hover);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-page);
  border-radius: 0.75rem;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.task-item:hover {
  background: var(--color-bg-block-hover);
}

.task-item.completed {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: #86efac;
}

.task-checkbox {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.task-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.task-checkbox label {
  display: block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border-light);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.task-checkbox input[type="checkbox"]:checked + label {
  background: var(--color-success);
  border-color: var(--color-success);
}

.task-checkbox input[type="checkbox"]:checked + label::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 3px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.task-checkbox input[type="checkbox"]:disabled + label {
  cursor: not-allowed;
  opacity: 0.5;
}

.task-content {
  flex: 1;
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
}

.task-description {
  font-size: 0.875rem;
  color: var(--color-text-regular);
  margin: 0;
  line-height: 1.5;
}

/* 疫苗接种时间表 */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-page);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.schedule-item:hover {
  background: var(--color-bg-block-hover);
}

.schedule-item.completed {
  background: #f0fdf4;
}

.schedule-checkbox {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.schedule-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.schedule-checkbox label {
  display: block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border-light);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.schedule-checkbox input[type="checkbox"]:checked + label {
  background: var(--color-success);
  border-color: var(--color-success);
}

.schedule-checkbox input[type="checkbox"]:checked + label::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 3px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.schedule-age {
  min-width: 80px;
  font-size: 0.875rem;
  color: var(--color-text-regular);
  font-weight: 500;
}

.schedule-vaccine {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.schedule-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
}

.status-badge.done {
  background: #f0fdf4;
  color: var(--color-success);
}

.status-badge.pending {
  background: #fef3c7;
  color: var(--color-warning);
}

.reminders {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #fffbeb;
  border-radius: 0.75rem;
  border: 1px solid #fcd34d;
}

.reminders-title {
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 1rem 0;
}

.reminders-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reminders-list li {
  padding: 0.5rem 0;
  color: #78350f;
  font-size: 0.9375rem;
  position: relative;
  padding-left: 1.5rem;
}

.reminders-list li::before {
  content: '•';
  position: absolute;
  left: 0.5rem;
  font-weight: bold;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  animation: modalIn 0.2s ease;
}

.modal-content.small {
  max-width: 400px;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-block-hover);
  border-radius: 0.5rem;
  font-size: 1.5rem;
  color: var(--color-text-regular);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--color-border-light);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-secondary,
.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: white;
  border: 2px solid var(--color-border-light);
  color: var(--color-text-regular);
}

.btn-secondary:hover {
  background: var(--color-bg-page);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-text {
  font-size: 0.9375rem;
  color: var(--color-text-regular);
  margin: 0;
}

.share-link-box {
  display: flex;
  gap: 0.5rem;
}

.share-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  background: var(--color-bg-page);
}

.copy-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

.copy-btn:hover {
  background: var(--color-primary-dark);
}

/* 通用内容 */
.content-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rich-content {
  line-height: 1.8;
  color: var(--color-text-primary);
}

.rich-content :deep(h1),
.rich-content :deep(h2),
.rich-content :deep(h3) {
  color: var(--color-text-primary);
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.rich-content :deep(p) {
  margin-bottom: 1rem;
}

.rich-content :deep(ul),
.rich-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .template-detail {
    padding: 12px;
    padding-bottom: 80px;
  }

  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 16px;
  }

  .back-btn,
  .action-buttons {
    width: 100%;
  }

  .back-btn {
    padding: 10px 16px;
    font-size: 13px;
  }

  .back-btn svg {
    width: 16px;
    height: 16px;
  }

  .action-buttons {
    justify-content: space-between;
    gap: 8px;
  }

  .action-buttons .btn {
    flex: 1;
    padding: 10px 16px;
    font-size: 13px;
  }

  .plan-info {
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 16px;
  }

  .plan-info-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .plan-title {
    font-size: 18px;
  }

  .plan-meta {
    font-size: 13px;
  }

  .progress-info {
    width: 100%;
    gap: 12px;
  }

  .progress-item {
    font-size: 12px;
  }

  .rich-content {
    font-size: 15px;
    line-height: 1.7;
    padding: 16px;
    border-radius: 16px;
  }

  .rich-content :deep(h1),
  .rich-content :deep(h2),
  .rich-content :deep(h3),
  .rich-content :deep(h4),
  .rich-content :deep(h5),
  .rich-content :deep(h6) {
    font-size: 1.1em;
    margin-top: 1.2rem;
  }

  .rich-content :deep(p) {
    margin-bottom: 0.8rem;
  }

  .rich-content :deep(ul),
  .rich-content :deep(ol) {
    padding-left: 1.2rem;
    margin-bottom: 0.8rem;
  }

  .rich-content :deep(li) {
    margin-bottom: 0.4rem;
  }

  .rich-content :deep(code) {
    font-size: 0.9em;
    padding: 0.15rem 0.4rem;
  }

  .rich-content :deep(pre) {
    padding: 0.75rem;
    font-size: 13px;
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px);
    border-radius: 0;
  }

  .rich-content :deep(blockquote) {
    padding: 12px;
    margin: 1rem -16px;
    width: calc(100% + 32px);
    border-radius: 0;
  }

  .rich-content :deep(img) {
    margin: 1rem -16px;
    width: calc(100% + 32px);
    max-width: calc(100% + 32px);
    border-radius: 12px;
  }

  .rich-content :deep(table) {
    display: block;
    overflow-x: auto;
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px);
    border-radius: 0;
  }

  .rich-content :deep(th),
  .rich-content :deep(td) {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap;
  }
}

@media (max-width: 375px) {
  .template-detail {
    padding: 8px;
  }

  .plan-title {
    font-size: 16px;
  }

  .rich-content {
    font-size: 14px;
    padding: 12px;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCatStore } from '../../stores/cat'
import type { Stage, Task } from '../../types/cat'

const catStore = useCatStore()
const selectedStage = ref<Stage | null>(null)
const activeTab = ref<'overview' | 'tasks' | 'vaccines'>('overview')

// 任务状态管理（前端本地）
const taskStates = ref<Record<string, boolean>>({})

onMounted(async () => {
  await catStore.fetchStages()
  if (catStore.stages.length > 0) {
    selectedStage.value = catStore.stages[0]
  }
})

// 选择阶段
function selectStage(stage: Stage) {
  selectedStage.value = stage
  activeTab.value = 'overview'
}

// 切换任务完成状态
function toggleTask(taskId: string) {
  taskStates.value[taskId] = !taskStates.value[taskId]
  // 保存到localStorage
  localStorage.setItem('catTaskStates', JSON.stringify(taskStates.value))
}

// 从localStorage加载任务状态
onMounted(() => {
  const saved = localStorage.getItem('catTaskStates')
  if (saved) {
    taskStates.value = JSON.parse(saved)
  }
})

// 计算任务完成进度
const taskProgress = computed(() => {
  if (!selectedStage.value?.tasks) return { completed: 0, total: 0, percentage: 0 }
  const total = selectedStage.value.tasks.length
  const completed = selectedStage.value.tasks.filter(
    t => taskStates.value[t.id]
  ).length
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
})

// 任务分类
const taskCategories = {
  health: { name: '健康', icon: '🏥', color: 'bg-red-100 text-red-700' },
  feeding: { name: '喂养', icon: '🍽️', color: 'bg-blue-100 text-blue-700' },
  training: { name: '训练', icon: '🎾', color: 'bg-green-100 text-green-700' },
  care: { name: '护理', icon: '🧼', color: 'bg-purple-100 text-purple-700' }
}
</script>

<template>
  <div class="timeline-page">
    <div class="page-header">
      <h1 class="page-title">🐱 猫咪养成时间线</h1>
      <p class="page-subtitle">从新生到成年的完整成长路径</p>
    </div>

    <div class="timeline-container">
      <!-- 阶段导航 -->
      <aside class="stage-nav">
        <h2 class="nav-title">成长阶段</h2>
        <div class="stage-list">
          <button
            v-for="stage in catStore.stages"
            :key="stage.id"
            :class="['stage-item', { active: selectedStage?.id === stage.id }]"
            @click="selectStage(stage)"
          >
            <div class="stage-indicator">
              <span class="stage-number">{{ stage.order }}</span>
            </div>
            <div class="stage-info">
              <h3 class="stage-name">{{ stage.name }}</h3>
              <p class="stage-age">{{ stage.ageRange }}</p>
            </div>
          </button>
        </div>
      </aside>

      <!-- 阶段详情 -->
      <main class="stage-detail" v-if="selectedStage">
        <!-- 详情头部 -->
        <div class="detail-header">
          <div class="stage-badge">
            <span class="badge-emoji">📋</span>
            <span class="badge-text">第 {{ selectedStage.order }} 阶段</span>
          </div>
          <h2 class="detail-title">{{ selectedStage.name }}</h2>
          <p class="detail-age">{{ selectedStage.ageRange }}</p>
          <p class="detail-description">{{ selectedStage.description }}</p>
        </div>

        <!-- 标签页 -->
        <div class="tabs">
          <button
            :class="['tab', { active: activeTab === 'overview' }]"
            @click="activeTab = 'overview'"
          >
            <span class="tab-icon">📊</span>
            概览
          </button>
          <button
            :class="['tab', { active: activeTab === 'tasks' }]"
            @click="activeTab = 'tasks'"
          >
            <span class="tab-icon">✅</span>
            任务清单
            <span class="tab-badge" v-if="taskProgress.total > 0">
              {{ taskProgress.completed }}/{{ taskProgress.total }}
            </span>
          </button>
          <button
            :class="['tab', { active: activeTab === 'vaccines' }]"
            @click="activeTab = 'vaccines'"
            :disabled="!selectedStage.vaccines || selectedStage.vaccines.length === 0"
          >
            <span class="tab-icon">💉</span>
            疫苗接种
          </button>
        </div>

        <!-- 概览内容 -->
        <div v-show="activeTab === 'overview'" class="tab-content">
          <!-- 里程碑 -->
          <section class="section" v-if="selectedStage.milestones && selectedStage.milestones.length > 0">
            <h3 class="section-title">
              <span class="section-icon">🏆</span>
              里程碑
            </h3>
            <div class="milestones">
              <div
                v-for="milestone in selectedStage.milestones"
                :key="milestone.id"
                class="milestone-card"
              >
                <span class="milestone-icon">{{ milestone.icon || '🎯' }}</span>
                <div class="milestone-content">
                  <h4 class="milestone-title">{{ milestone.title }}</h4>
                  <p class="milestone-description">{{ milestone.description }}</p>
                  <span class="milestone-age">{{ milestone.ageWeeks }}周</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 任务预览 -->
          <section class="section">
            <h3 class="section-title">
              <span class="section-icon">📝</span>
              重要任务
            </h3>
            <div class="task-preview">
              <div
                v-for="task in selectedStage.tasks?.slice(0, 3)"
                :key="task.id"
                class="task-preview-item"
              >
                <span class="task-dot" :class="taskCategories[task.category].color">
                  {{ taskCategories[task.category].icon }}
                </span>
                <span class="task-name">{{ task.title }}</span>
              </div>
              <button class="view-all-btn" @click="activeTab = 'tasks'">
                查看全部任务 →
              </button>
            </div>
          </section>
        </div>

        <!-- 任务清单内容 -->
        <div v-show="activeTab === 'tasks'" class="tab-content">
          <!-- 进度条 -->
          <div class="progress-section" v-if="taskProgress.total > 0">
            <div class="progress-header">
              <span class="progress-label">完成进度</span>
              <span class="progress-percentage">{{ taskProgress.percentage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: taskProgress.percentage + '%' }"></div>
            </div>
          </div>

          <!-- 任务列表 -->
          <div class="tasks-list">
            <div
              v-for="category in ['health', 'feeding', 'training', 'care'] as const"
              :key="category"
              class="task-category"
              v-if="selectedStage.tasks?.some(t => t.category === category)"
            >
              <h4 class="category-title">
                <span :class="['category-badge', taskCategories[category].color]">
                  {{ taskCategories[category].icon }}
                  {{ taskCategories[category].name }}
                </span>
              </h4>
              <div class="category-tasks">
                <label
                  v-for="task in selectedStage.tasks?.filter(t => t.category === category)"
                  :key="task.id"
                  class="task-item"
                  :class="{ completed: taskStates[task.id] }"
                >
                  <input
                    type="checkbox"
                    :checked="taskStates[task.id]"
                    @change="toggleTask(task.id)"
                    class="task-checkbox"
                  />
                  <div class="task-content">
                    <span class="task-title">{{ task.title }}</span>
                    <p v-if="task.description" class="task-description">{{ task.description }}</p>
                  </div>
                  <span class="priority-badge" :class="`priority-${task.priority}`">
                    {{ task.priority === 1 ? '高' : task.priority === 2 ? '中' : '低' }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 疫苗接种内容 -->
        <div v-show="activeTab === 'vaccines'" class="tab-content">
          <div v-if="selectedStage.vaccines && selectedStage.vaccines.length > 0" class="vaccines-list">
            <div
              v-for="vaccine in selectedStage.vaccines"
              :key="vaccine.id"
              class="vaccine-card"
            >
              <div class="vaccine-icon">💉</div>
              <div class="vaccine-content">
                <h4 class="vaccine-name">{{ vaccine.name }}</h4>
                <p v-if="vaccine.description" class="vaccine-description">{{ vaccine.description }}</p>
                <span class="vaccine-age">接种时间：{{ vaccine.ageWeeks }}周</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p class="empty-text">此阶段无需接种特殊疫苗</p>
          </div>
        </div>
      </main>
    </div>

    <!-- 加载状态 -->
    <div v-if="catStore.loading" class="loading">
      <span class="loading-spinner"></span>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="catStore.error" class="error">
      <p>{{ catStore.error }}</p>
      <button @click="catStore.fetchStages" class="retry-btn">重试</button>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
}

.timeline-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

/* 阶段导航 */
.stage-nav {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 6rem;
}

.nav-title {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 1rem 0;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.stage-item:hover {
  background: #f8fafc;
}

.stage-item.active {
  border-color: #f97316;
  background: #fff7ed;
}

.stage-indicator {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.stage-info {
  flex: 1;
}

.stage-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stage-age {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* 阶段详情 */
.stage-detail {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  margin-bottom: 1rem;
}

.badge-emoji {
  font-size: 1.25rem;
}

.badge-text {
  font-weight: 600;
  color: #92400e;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.detail-age {
  font-size: 1.25rem;
  color: #f97316;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.detail-description {
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 2rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;
  margin-bottom: -2px;
}

.tab:hover:not(:disabled) {
  color: #f97316;
}

.tab.active {
  color: #f97316;
  border-bottom-color: #f97316;
}

.tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-badge {
  background: #f97316;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
}

/* 内容区 */
.tab-content {
  animation: tabFadeIn 0.3s ease;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.section-icon {
  font-size: 1.5rem;
}

/* 里程碑 */
.milestones {
  display: grid;
  gap: 1rem;
}

.milestone-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
  border-radius: 0.75rem;
}

.milestone-icon {
  font-size: 2rem;
}

.milestone-content {
  flex: 1;
}

.milestone-title {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.milestone-description {
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.milestone-age {
  display: inline-block;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  color: #f97316;
  font-weight: 500;
}

/* 任务预览 */
.task-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.task-dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.task-name {
  color: #475569;
}

.view-all-btn {
  color: #f97316;
  background: transparent;
  border: none;
  padding: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  text-align: left;
}

.view-all-btn:hover {
  text-decoration: underline;
}

/* 进度条 */
.progress-section {
  margin-bottom: 2rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-label {
  color: #64748b;
}

.progress-percentage {
  font-weight: 600;
  color: #f97316;
}

.progress-bar {
  height: 0.75rem;
  background: #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
  transition: width 0.3s ease;
}

/* 任务列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.task-category {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-title {
  margin: 0;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.category-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  border-color: #f97316;
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-title {
  text-decoration: line-through;
}

.task-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.25rem;
  accent-color: #f97316;
  cursor: pointer;
}

.task-content {
  flex: 1;
}

.task-title {
  font-weight: 500;
  color: #1e293b;
}

.task-description {
  color: #64748b;
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-1 {
  background: #fef2f2;
  color: #dc2626;
}

.priority-2 {
  background: #fef3c7;
  color: #d97706;
}

.priority-3 {
  background: #f0fdf4;
  color: #16a34a;
}

/* 疫苗列表 */
.vaccines-list {
  display: grid;
  gap: 1rem;
}

.vaccine-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 0.75rem;
}

.vaccine-icon {
  font-size: 2rem;
}

.vaccine-content {
  flex: 1;
}

.vaccine-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.vaccine-description {
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.vaccine-age {
  display: inline-block;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  color: #2563eb;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-text {
  color: #94a3b8;
  margin: 0;
}

/* 加载和错误状态 */
.loading,
.error {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

/* 响应式 */
@media (max-width: 968px) {
  .timeline-container {
    grid-template-columns: 1fr;
  }

  .stage-nav {
    position: static;
  }
}
</style>

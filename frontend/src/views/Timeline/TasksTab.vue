<script setup lang="ts">
import { useTimelineState } from './composables/useTimelineState'
import type { Task } from '../../types/cat'

const {
  selectedStage,
  taskStates,
  taskProgress,
} = useTimelineState()

const emit = defineEmits<{
  (e: 'open-task', task: Task): void
}>()

type TaskCategory = 'health' | 'feeding' | 'training' | 'care'

interface TaskCategoryInfo {
  name: string
  icon: string
  color: string
}

// 任务分类
const taskCategories: Record<TaskCategory, TaskCategoryInfo> = {
  health: { name: '健康', icon: 'health', color: 'category-health' },
  feeding: { name: '喂养', icon: 'feeding', color: 'category-feeding' },
  training: { name: '训练', icon: 'training', color: 'category-training' },
  care: { name: '护理', icon: 'care', color: 'category-care' }
}

// 暴力清洗任务标题 - 彻底切除开头所有的英文字母和附带的空格
function cleanTaskTitle(title: string): string {
  if (!title) return ''
  const cleaned = title.replace(/^[a-zA-Z]+\s*/, '')
  return cleaned.trim() || title
}
</script>

<template>
  <!-- 任务清单内容 -->
  <div class="tab-content">
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
    <div class="tasks-list" v-if="selectedStage">
      <template v-for="category in ['health', 'feeding', 'training', 'care'] as const" :key="category">
        <div
          class="task-category"
          v-if="selectedStage!.tasks?.some((t: Task) => t.category === category)"
        >
          <h4 class="category-title">
            <span :class="['category-badge', category]">
              <span class="category-icon">
                <svg v-if="category === 'health'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <svg v-else-if="category === 'feeding'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                </svg>
                <svg v-else-if="category === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <svg v-else-if="category === 'care'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </span>
              {{ taskCategories[category].name }}
            </span>
          </h4>

          <div class="category-tasks">
            <div
              v-for="task in selectedStage!.tasks?.filter((t: Task) => t.category === category)"
              :key="task.id"
              class="task-item"
              :class="{ completed: taskStates[task.id]?.completed }"
              @click="emit('open-task', task)"
            >
              <div class="task-icon-box" :class="task.category">
                <svg v-if="task.category === 'health'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <svg v-else-if="task.category === 'feeding'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                </svg>
                <svg v-else-if="task.category === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <svg v-else-if="task.category === 'care'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>

              <div class="task-content">
                <span class="task-title">{{ cleanTaskTitle(task.title) }}</span>
                <p v-if="task.description" class="task-description">{{ task.description }}</p>
              </div>

              <div class="task-checkbox-wrapper" @click.stop>
                <input
                  type="checkbox"
                  :checked="taskStates[task.id]?.completed"
                  @change="emit('open-task', task)"
                  class="task-checkbox custom-checkbox"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
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
  color: var(--color-text-regular);
}

.progress-percentage {
  font-weight: 600;
  color: var(--color-primary);
}

.progress-bar {
  height: 0.75rem;
  background: var(--color-border-light);
  border-radius: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  transition: width 0.3s ease;
}

/* 任务列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 任务分类基础 */
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
  gap: 6px;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
}

.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.category-icon svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

/* 分类徽章颜色 */
.category-badge.health { background: #fef2f2; color: var(--color-danger); }
.category-badge.feeding { background: #eff6ff; color: var(--color-info); }
.category-badge.training { background: #f3e8ff; color: #8A2BE2; }
.category-badge.care { background: #faf5ff; color: #9333ea; }

/* ================= 核心：任务卡片布局 ================= */
.category-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  background: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.task-item:hover {
  background-color: var(--color-bg-cream);
  transform: translateX(6px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);
}

.task-item.completed {
  opacity: 0.6;
  background: var(--color-bg-page);
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: #9E968F;
}

/* 左侧：分类图标 */
.task-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-icon-box.health {
  background-color: #FEF2F2;
  color: var(--color-danger);
}

.task-icon-box.feeding {
  background-color: #EFF6FF;
  color: var(--color-info);
}

.task-icon-box.training {
  background-color: #F3E8FF;
  color: #8A2BE2;
}

.task-icon-box.care {
  background-color: #FAF5FF;
  color: #9333EA;
}

.task-icon-box svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 2;
}

/* 中间：文字内容占据剩余全部空间 */
.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.task-title {
  font-size: 15px;
  font-weight: 500;
  color: #5C544E;
}

.task-description {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #9E968F;
}

/* 右侧：Checkbox 定制样式 */
.task-checkbox-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary-medium);
}
</style>

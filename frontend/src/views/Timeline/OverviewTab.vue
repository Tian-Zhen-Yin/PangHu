<script setup lang="ts">
import { useTimelineState } from './composables/useTimelineState'
import { sectionIcons } from './composables/sectionIcons'
import type { Task } from '../../types/cat'

const {
  selectedStage,
} = useTimelineState()

const emit = defineEmits<{
  (e: 'switch-tab', tab: 'tasks'): void
  (e: 'open-task', task: Task): void
}>()

// 暴力清洗任务标题 - 彻底切除开头所有的英文字母和附带的空格
function cleanTaskTitle(title: string): string {
  if (!title) return ''
  const cleaned = title.replace(/^[a-zA-Z]+\s*/, '')
  return cleaned.trim() || title
}
</script>

<template>
  <!-- 概览内容 -->
  <div class="tab-content">
    <!-- 里程碑 -->
    <section class="milestones-section" v-if="selectedStage && selectedStage.milestones && selectedStage.milestones.length > 0">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="section-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <h3 class="section-title">重要里程碑</h3>
      </div>

      <div class="milestones-grid">
        <div
          v-for="milestone in selectedStage!.milestones"
          :key="milestone.id"
          class="milestone-premium-card"
        >
          <div class="card-header">
            <div class="title-with-icon">
              <div class="icon-plate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h4 class="milestone-title">{{ milestone.title }}</h4>
            </div>

            <span class="time-badge">{{ milestone.ageWeeks }}周</span>
          </div>

          <p class="milestone-desc">{{ milestone.description }}</p>
        </div>
      </div>
    </section>

    <!-- 任务预览 -->
    <section class="section" v-if="selectedStage">
      <h3 class="section-title">
        <span class="section-icon" v-html="sectionIcons.task"></span>
        重要任务
      </h3>
      <div class="overview-tasks-preview">
        <div
          v-for="task in selectedStage!.tasks?.slice(0, 3)"
          :key="task.id"
          class="overview-task-card"
          @click="emit('open-task', task)"
        >
          <div class="otc-icon-wrapper" :class="task.category">
            <!-- 健康类 -->
            <svg v-if="task.category === 'health'" viewBox="0 0 24 24" fill="none" class="otc-icon">
              <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 12H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 16H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <!-- 喂养类 -->
            <svg v-else-if="task.category === 'feeding'" viewBox="0 0 24 24" fill="none" class="otc-icon">
              <path d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M21 3V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M16.5 7.5L21 3L16.5 7.5ZM16.5 7.5L21 12L16.5 7.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <!-- 训练类 -->
            <svg v-else-if="task.category === 'training'" viewBox="0 0 24 24" fill="none" class="otc-icon">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 3V12L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <!-- 护理类 -->
            <svg v-else viewBox="0 0 24 24" fill="none" class="otc-icon">
              <path d="M8 3L4 7V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V7L16 3H8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 12V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 21H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="otc-title">{{ cleanTaskTitle(task.title) }}</span>
          <svg class="otc-arrow" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <button class="view-all-btn" @click="emit('switch-tab', 'tasks')">
          查看全部任务 →
        </button>
      </div>
    </section>
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

.section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.section-icon {
  font-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 6px;
}

.section-icon :deep(svg) {
  width: 18px;
  height: 18px;
  stroke: var(--color-primary);
}

/* ================= 里程碑模块 - 高级奶油风 ================= */
.milestones-section {
  margin-top: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-header .section-icon {
  width: 20px;
  height: 20px;
  color: #FBBF24;
  flex-shrink: 0;
}

.section-header .section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.milestones-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 核心：高级奶油风卡片 */
.milestone-premium-card {
  position: relative;
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border: 1px solid #FFFFFF;
  border-radius: 20px;
  padding: 20px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.02),
    0 8px 32px rgba(244, 162, 97, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.milestone-premium-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.03),
    0 12px 40px rgba(244, 162, 97, 0.06);
}

.milestone-premium-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 替代 Emoji 的精致图标底座 */
.icon-plate {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--color-bg-cream);
  color: var(--color-primary);
  border-radius: 10px;
  flex-shrink: 0;
}

.icon-plate svg {
  width: 18px;
  height: 18px;
}

.milestone-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-regular);
}

/* 时间胶囊标签 */
.time-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background: #FFFFFF;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  border-radius: 100px;
  box-shadow: 0 2px 6px rgba(244, 162, 97, 0.15);
  flex-shrink: 0;
}

.milestone-desc {
  margin: 0;
  padding-left: 44px;
  font-size: 14px;
  color: var(--color-text-placeholder);
  line-height: 1.5;
}

/* ========== Overview 任务预览 - 奶油风悬浮卡片 ========== */
.overview-tasks-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-task-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: #FFFFFF;
  border: 2px solid #F5F0E8;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.overview-task-card:hover {
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-warm) 100%);
  border-color: var(--color-primary-medium);
  transform: translateX(8px) translateY(-2px);
  box-shadow: 0 8px 20px rgba(244, 162, 97, 0.15);
}

.otc-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.otc-icon-wrapper.health {
  background: linear-gradient(135deg, #FFE5E5 0%, #FFDBDB 100%);
  color: var(--color-danger);
}

.otc-icon-wrapper.feeding {
  background: linear-gradient(135deg, #FFF4E5 0%, #FFEED5 100%);
  color: var(--color-primary);
}

.otc-icon-wrapper.training {
  background: linear-gradient(135deg, #E5F4FF 0%, #D5EAFF 100%);
  color: var(--color-info);
}

.otc-icon-wrapper.care {
  background: linear-gradient(135deg, #E5FFE9 0%, #D5FFDD 100%);
  color: var(--color-success);
}

.otc-icon {
  width: 22px;
  height: 22px;
}

.otc-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.otc-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.overview-task-card:hover .otc-arrow {
  color: var(--color-primary);
  transform: translateX(3px);
}

.view-all-btn {
  color: var(--color-primary);
  background: linear-gradient(135deg, #FFF4E5 0%, #FFEED5 100%);
  border: none;
  padding: 14px 18px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(244, 162, 97, 0.1);
}

.view-all-btn:hover {
  background: linear-gradient(135deg, #FFEED5 0%, #FFE5C5 100%);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.2);
  transform: translateY(-1px);
}
</style>

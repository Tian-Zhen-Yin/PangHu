<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CatSelector from '../../components/cat/CatSelector.vue'
import HorizontalStageTimeline from '../../components/growth/HorizontalStageTimeline.vue'
import { useTimelineState } from './composables/useTimelineState'
import { usePetStore } from '../../stores/pet'

const route = useRoute()
const petStore = usePetStore()
const {
  catStore,
  authStore,
  myCatStore,
  currentCat,
  selectedStage,
  stages,
  filteredStages,
  pageSubtitle,
  taskProgress,
  loadTaskStates,
} = useTimelineState()

onMounted(async () => {
  await catStore.fetchStages()
  await myCatStore.fetchCats()

  if (currentCat.value) {
    loadTaskStates(currentCat.value.id)
  }

  if (authStore.isAuthenticated) {
    await petStore.fetchRecords(currentCat.value?.id)
  }

  if (filteredStages.value.length > 0 && !selectedStage.value) {
    selectedStage.value = filteredStages.value[0]!
  }
})

watch(filteredStages, (stages) => {
  if (stages.length > 0 && (!selectedStage.value || !stages.find(s => s.id === selectedStage.value!.id))) {
    selectedStage.value = stages[0]!
  }
})

watch(currentCat, async (newCat) => {
  if (newCat) loadTaskStates(newCat.id)
  if (authStore.isAuthenticated) {
    await petStore.fetchRecords(newCat?.id)
  }
})

const activeTab = computed(() => {
  const path = route.path
  if (path.includes('/tasks')) return 'tasks'
  if (path.includes('/vaccines')) return 'vaccines'
  if (path.includes('/growth')) return 'growth'
  return 'overview'
})
</script>

<template>
  <div class="timeline-page">
    <!-- 紧凑型头部布局 -->
    <div class="timeline-header-compact" v-if="authStore.isAuthenticated">
      <!-- 左侧：标题区域 -->
      <div class="header-left">
        <div class="title-group">
          <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
          <div class="title-text">
            <h1 class="page-title">{{ currentCat?.timelineTitle || '猫咪养成时间线' }}</h1>
            <p class="page-subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>
      </div>

      <!-- 右侧：猫咪选择器 -->
      <div class="header-right">
        <CatSelector />
      </div>
    </div>

    <!-- 未登录时显示简单头部 -->
    <div class="page-header" v-else>
      <h1 class="page-title">
        <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
        {{ currentCat?.timelineTitle || '猫咪养成时间线' }}
      </h1>
      <p class="page-subtitle">{{ pageSubtitle }}</p>
    </div>

    <div class="timeline-container">
      <!-- 横向时间轴导航 -->
      <HorizontalStageTimeline
        v-model="selectedStage"
        :stages="filteredStages"
      />

      <!-- 阶段详情 -->
      <main class="stage-detail" v-if="selectedStage">
        <!-- 标签页 - 悬浮胶囊分段控制器 -->
        <div class="premium-tabs-container">

          <router-link
            to="/timeline/overview"
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'overview' }"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span class="tab-text">概览</span>
          </router-link>

          <router-link
            to="/timeline/tasks"
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'tasks' }"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span class="tab-text">任务清单</span>
            <span v-if="taskProgress.total > 0" class="tab-badge">{{ taskProgress.completed }}/{{ taskProgress.total }}</span>
          </router-link>

          <router-link
            to="/timeline/vaccines"
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'vaccines' }"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span class="tab-text">疫苗接种</span>
            <span v-if="selectedStage?.vaccines?.length" class="tab-badge warning">{{ selectedStage.vaccines.length }}</span>
          </router-link>

          <router-link
            to="/timeline/growth"
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'growth' }"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="tab-text">成长记录</span>
            <span v-if="petStore.recordCount > 0" class="tab-badge">{{ petStore.recordCount }}</span>
          </router-link>

        </div>

        <!-- 子路由渲染 -->
        <router-view />
      </main>
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

/* ========== 紧凑型头部布局 ========== */
.timeline-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg) var(--space-xl);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-normal);
}

.header-left {
  flex: 1;
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.title-text {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: var(--space-xs) 0 0 0;
}

.header-right {
  flex-shrink: 0;
}

/* 未登录时的简单头部 */
.page-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.page-header .page-title {
  font-size: 2rem;
}

/* ========== 响应式：移动端 ========== */
@media (max-width: 640px) {
  .timeline-header-compact {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--space-md);
  }

  .title-group {
    gap: var(--space-sm);
  }

  .title-mascot {
    width: 32px;
    height: 32px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .page-subtitle {
    font-size: 0.75rem;
  }

  .header-right {
    width: 100%;
  }

  .header-right :deep(.cat-selector) {
    width: 100%;
  }

  .header-right :deep(.current-cat) {
    width: 100%;
  }
}

/* ========== 横向布局容器 ========== */
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 阶段详情 - 奶油风大卡片 */
.stage-detail {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-card-normal);
  width: 100%;
}

/* ================= 悬浮胶囊 Tab ================= */
.premium-tabs-container {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-block);
  border-radius: var(--radius-full);
  padding: var(--space-sm);
  gap: var(--space-xs);
  margin: var(--space-md) 0 var(--space-xl) 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 10px 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-placeholder);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tab-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  transition: transform 0.2s ease;
}

.tab-text {
  font-size: 14px;
  font-weight: 500;
}

/* 默认微标样式 (灰色) */
.tab-badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  background: var(--color-border-light);
  color: var(--color-text-regular);
  transition: all 0.3s ease;
}

/* ================= 激活态视觉 (Active State) ================= */

/* 1. 滑块变身：纯白背景 + 物理悬浮投影 */
.tab-btn.is-active {
  background: #FFFFFF;
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* 2. 文字提亮加粗 */
.tab-btn.is-active .tab-text {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 3. 选中态的图标微微放大 */
.tab-btn.is-active .tab-icon {
  transform: scale(1.1);
}

/* 4. 微标变化：变成浅橘色底 + 深橘色字 */
.tab-btn.is-active .tab-badge {
  background: var(--color-bg-cream);
  color: var(--color-primary);
}

/* 如果有需要特别警告的微标 (比如疫苗待打)，反向高亮 */
.tab-btn.is-active .tab-badge.warning {
  background: var(--color-primary-medium);
  color: #FFFFFF;
}

/* 标题吉祥物 */
.title-mascot {
  margin-right: 8px;
  vertical-align: middle;
}
</style>

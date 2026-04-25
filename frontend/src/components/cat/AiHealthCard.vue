<template>
  <div class="health-card-wrapper">
    <div class="health-card">

      <div class="card-header">
        <div class="header-titles">
          <h3 class="main-title">AI 健康分析</h3>
          <p class="sub-title">胖虎医生的专业建议</p>
        </div>

        <button class="refresh-btn" aria-label="重新生成" @click="handleRefresh">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>

      <div class="divider"></div>

      <div class="card-content">
        <div v-if="status" class="status-badge" :class="statusClass">
          <span class="badge-icon">{{ statusIcon }}</span>
          {{ statusText }}
        </div>

        <div v-if="analysis" class="analysis-text">
          {{ analysis }}
        </div>

        <div v-if="recommendations && recommendations.length > 0" class="recommendations">
          <div v-for="(rec, index) in recommendations" :key="index" class="rec-item">
            {{ rec }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status?: 'perfect' | 'normal' | 'warning' | 'concern'
  analysis?: string
  recommendations?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  status: 'normal',
  analysis: '',
  recommendations: () => []
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

function handleRefresh() {
  emit('refresh')
}

const statusIcon = computed(() => {
  switch (props.status) {
    case 'perfect': return '✨'
    case 'normal': return '💚'
    case 'warning': return '⚠️'
    case 'concern': return '❗'
    default: return '💚'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'perfect': return '完美体型'
    case 'normal': return '健康状况良好'
    case 'warning': return '需要关注'
    case 'concern': return '建议检查'
    default: return '健康状况良好'
  }
})

const statusClass = computed(() => props.status)
</script>

<style scoped>
/* 外层包裹器 */
.health-card-wrapper {
  margin: 16px;
}

/* 主卡片：大圆角，干净的白底和极弱的阴影 */
.health-card {
  position: relative;
  background-color: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); /* 治愈系 UI 的阴影一定要轻 */
  border: 1px solid rgba(0, 0, 0, 0.04);
}

/* --- 头部布局 --- */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.main-title {
  font-size: 18px;
  font-weight: 600;
  color: #2C3E50;
  margin: 0;
  line-height: 1.2;
}

.sub-title {
  font-size: 13px;
  color: #8898AA;
  margin: 0;
}

/* 刷新按钮：弱化背景，强调交互态 */
.refresh-btn {
  background: #F4F6F8;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.refresh-btn:hover {
  background: #E2E8F0;
  color: var(--color-text-primary);
  transform: rotate(15deg); /* 加一点活泼的微动效 */
}

.refresh-btn:active {
  transform: rotate(30deg) scale(0.95);
}

/* --- 分割线 --- */
.divider {
  border-top: 1px dashed rgba(0, 0, 0, 0.06); /* 非常淡的虚线，不抢视觉 */
  margin: 20px 0;
}

/* --- 内容区与标签 --- */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 状态标签：采用低饱和底色 + 高饱和文字的经典组合 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px; /* 全圆角胶囊 */
  font-size: 14px;
  font-weight: 600;
  align-self: flex-start;
}

/* 状态主题色 */
.status-badge.perfect {
  background-color: #E8F5E9; /* 清透的浅绿底色 */
  color: #2E7D32; /* 沉稳的深绿文字 */
}

.status-badge.normal {
  background-color: #E3F2FD; /* 清透的浅蓝底色 */
  color: #1565C0; /* 沉稳的深蓝文字 */
}

.status-badge.warning {
  background-color: #FFF3E0; /* 清透的浅橙底色 */
  color: #E65100; /* 沉稳的深橙文字 */
}

.status-badge.concern {
  background-color: #FFEBEE; /* 清透的浅红底色 */
  color: #C62828; /* 沉稳的深红文字 */
}

.badge-icon {
  font-size: 14px;
}

/* 分析文本 */
.analysis-text {
  font-size: 14px;
  line-height: 1.6;
  color: #4A5568;
}

/* 建议列表 */
.recommendations {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.rec-item {
  font-size: 13px;
  line-height: 1.5;
  color: #5A67D8;
  padding-left: 16px;
  position: relative;
}

.rec-item::before {
  content: '•';
  position: absolute;
  left: 4px;
  color: #5A67D8;
  font-weight: bold;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .health-card-wrapper {
    margin: 12px;
  }

  .health-card {
    padding: 20px;
  }

  .main-title {
    font-size: 16px;
  }

  .sub-title {
    font-size: 12px;
  }
}
</style>

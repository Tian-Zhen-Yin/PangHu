<template>
  <div class="ai-health-advice">
    <!-- 简化头部 -->
    <div class="advice-header">
      <div class="header-left">
        <div class="icon-badge">
          <svg class="robot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8V4H8"/>
            <path d="M8 8v4"/>
            <path d="M18 8h-2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 16h-2a2 2 0 0 0-2-2v-6a2 2 0 0 0 2-2h2"/>
            <path d="M12 22c-1.1 0-2-.9-2-2V6"/>
            <path d="M6 18c-1.1 0-2-.9-2-2V8"/>
          </svg>
        </div>
        <div class="header-text">
          <h3>健康洞察</h3>
          <p class="header-subtitle">基于近30天数据分析</p>
        </div>
      </div>
      <button v-if="!loading" class="refresh-btn" @click="fetchAdvice" title="刷新">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6"/>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M21 12a9 9 0 0 1-9 9"/>
          <path d="M21 3v9h-9"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>分析中...</p>
    </div>

    <div v-else-if="error" class="error">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="advice" class="advice-content-wrapper">
      <div class="advice-content">
      <!-- 体重状态卡片 -->
      <div v-if="advice.weightAdvice" class="status-card" :class="advice.weightAdvice.status">
        <div class="status-icon-large">
          <svg v-if="advice.weightAdvice.status === 'normal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <svg v-else-if="advice.weightAdvice.status === 'thin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v18"/>
            <path d="M8 8l4-4 4 4"/>
            <path d="M8 16l4 4 4-4"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
          </svg>
        </div>
        <div class="status-info">
          <p class="status-title">{{ getWeightText(advice.weightAdvice.status) }}</p>
          <p class="status-desc">{{ advice.weightAdvice.suggestion }}</p>
        </div>
      </div>

      <!-- 疫苗提醒 -->
      <div v-if="advice.vaccineAdvice" class="info-card">
        <div class="card-header-small">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 2 4 4"/>
            <path d="m17 7 3-3"/>
            <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/>
            <path d="m9 11 4 4"/>
            <path d="m5 19-3 3"/>
          </svg>
          <span class="header-title">疫苗提醒</span>
        </div>
        <p class="card-text">{{ advice.vaccineAdvice.nextAction }}</p>
        <div v-if="advice.vaccineAdvice.upcoming.length > 0" class="upcoming-list">
          <div
            v-for="vaccine in advice.vaccineAdvice.upcoming"
            :key="vaccine.name"
            :class="['upcoming-item', { urgent: vaccine.daysLeft <= 7, overdue: vaccine.daysLeft < 0 }]"
          >
            <span class="vaccine-name">{{ vaccine.name }}</span>
            <span class="vaccine-date">
              {{ vaccine.daysLeft < 0 ? `已过期 ${Math.abs(vaccine.daysLeft)} 天` : vaccine.daysLeft === 0 ? '今天' : `${vaccine.date}` }}
            </span>
          </div>
        </div>
      </div>

      <!-- 养护要点 -->
      <div v-if="advice.ageAdvice" class="info-card">
        <p class="section-label">{{ advice.ageAdvice.stage }}养护要点</p>
        <div class="tips-grid">
          <div
            v-for="tip in advice.ageAdvice.tips"
            :key="tip"
            class="tip-item"
          >
            <span class="tip-dot"></span>
            <span class="tip-text">{{ tip }}</span>
          </div>
        </div>
      </div>

      <!-- 综合建议 -->
      <div v-if="advice.generalAdvice" class="highlight-card">
        <svg class="quote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 .37-.948l2.855-.725a1.5 1.5 0 0 0 1.06-1.06l-.72-2.855a.5.5 0 0 1 .948-.37l1.583 6.135A2 2 0 0 0 11.063 7.063l6.135 1.581a.5.5 0 0 1 .37.948l-2.855.725a1.5 1.5 0 0 0-1.06 1.06l.72 2.855a.5.5 0 0 1-.948.37l-1.583-6.135A2 2 0 0 0 12.937 15.5Z"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <p class="highlight-text">{{ advice.generalAdvice }}</p>
      </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M18 17V9"/>
        <path d="M13 17V5"/>
        <path d="M8 17v-3"/>
      </svg>
      <p>暂无分析数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ProactiveAdvice } from '../../types/proactive'
import { getProactiveAdvice } from '../../api/proactive'

interface Props {
  catId: string
  types?: ('weight' | 'vaccine' | 'age' | 'general')[]
}

const props = defineProps<Props>()

const advice = ref<ProactiveAdvice | null>(null)
const loading = ref(true)
const error = ref('')

async function fetchAdvice() {
  loading.value = true
  error.value = ''

  try {
    advice.value = await getProactiveAdvice(props.catId, props.types)
  } catch (err: any) {
    error.value = err.message || '获取健康建议失败'
  } finally {
    loading.value = false
  }
}

function getWeightText(status: string): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '完美体型'
    case 'overweight': return '超重'
    default: return '未知'
  }
}

onMounted(() => {
  fetchAdvice()
})
</script>

<style scoped>
.ai-health-advice {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 6px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

/* 简化头部 - 增加呼吸感 */
.advice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-bg-block-hover);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-badge {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.robot-icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.header-text h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-subtitle {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: var(--color-text-regular);
}

.refresh-btn {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--color-text-regular);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: var(--color-bg-block-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}

.refresh-btn svg {
  width: 16px;
  height: 16px;
}

/* 状态卡片 - 增强对比度 */
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--color-bg-block-hover);
  border: 1px solid var(--color-border-light);
}

.status-card.normal {
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  border-color: #86EFAC;
}

.status-card.thin {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border-color: #FCD34D;
}

.status-card.overweight {
  background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
  border-color: #FCA5A5;
}

.status-icon-large {
  width: 36px;
  height: 36px;
  background: #FFFFFF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.status-icon-large svg {
  width: 18px;
  height: 18px;
}

.status-card.normal .status-icon-large svg {
  color: var(--color-success);
}

.status-card.thin .status-icon-large svg {
  color: var(--color-warning);
}

.status-card.overweight .status-icon-large svg {
  color: var(--color-danger);
}

.status-info {
  flex: 1;
}

.status-title {
  margin: 0 0 3px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-card.normal .status-title {
  color: var(--color-success);
}

.status-card.thin .status-title {
  color: #B45309;
}

.status-card.overweight .status-title {
  color: #B91C1C;
}

.status-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-regular);
  line-height: 1.5;
}

/* 信息卡片 - 增强对比度 */
.info-card {
  background: linear-gradient(135deg, #FFFFFF 0%, var(--color-bg-page) 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--color-border-light);
}

.card-header-small {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.header-icon {
  width: 15px;
  height: 15px;
  color: var(--color-primary);
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-text {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--color-text-regular);
  line-height: 1.6;
}

.section-label {
  margin: 0 0 12px 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-regular);
  letter-spacing: 0.3px;
}

/* 提示网格 - 2x2布局 */
.tips-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tip-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #FFFFFF 0%, var(--color-bg-page) 100%);
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: default;
  border: 1px solid var(--color-border-light);
}

.tip-item:hover {
  background: var(--color-bg-block-hover);
  border-color: var(--color-text-secondary);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-medium);
  flex-shrink: 0;
}

.tip-text {
  font-size: 12px;
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* 移动端保持单列 */
@media (max-width: 640px) {
  .tips-grid {
    grid-template-columns: 1fr;
  }
}

/* 高亮卡片 - 增强对比度 */
.highlight-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border-radius: 12px;
  border: 1px solid #FDBA74;
}

.quote-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.8;
  color: var(--color-primary);
}

.highlight-text {
  margin: 0;
  font-size: 12px;
  color: #7C2D12;
  line-height: 1.6;
}

/* 即将到来的列表 */
.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  font-size: 11px;
}

.upcoming-item.urgent {
  background: #FEF3C7;
  border-color: #FCD34D;
  color: #B45309;
}

.upcoming-item.overdue {
  background: #FEE2E2;
  border-color: #FCA5A5;
  color: #B91C1C;
  font-weight: 600;
}

.vaccine-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 内容区域包装器 - 自动填充剩余空间 */
.advice-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.advice-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

/* 让高亮卡片在底部 */
.highlight-card {
  margin-top: auto;
}

/* 加载/错误/空状态 */
.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  gap: 10px;
  color: var(--color-text-placeholder);
  flex: 1;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border-light);
  border-top-color: var(--color-primary-medium);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-regular);
}

.loading p,
.error p,
.empty-state p {
  margin: 0;
  font-size: 13px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .ai-health-advice {
    padding: 16px;
    border-radius: 16px;
  }

  .icon-badge {
    width: 36px;
    height: 36px;
  }

  .robot-icon {
    font-size: 16px;
  }

  .header-text h3 {
    font-size: 15px;
  }
}
</style>
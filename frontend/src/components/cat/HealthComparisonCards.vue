<template>
  <div class="health-comparison-cards">
    <div class="cards-header">
      <div class="header-left">
        <h3>健康状态对比</h3>
        <span class="header-subtitle">基于体重标准分析</span>
      </div>
      <div v-if="catsWithAnalysis.length > 1" class="header-insight">
        <svg class="insight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <span class="insight-text">{{ getComparativeInsight() }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>分析健康数据中...</p>
    </div>

    <div v-else-if="error" class="error">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="32" height="32">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <p>{{ error }}</p>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="(cat, index) in cats"
        :key="cat.cat.id"
        class="health-card"
        :class="{ 'best-health': isBestHealth(cat) }"
        :style="{ '--card-accent': CAT_COLORS[index % CAT_COLORS.length] }"
      >
        <div class="card-header">
          <div class="cat-info">
            <div class="cat-avatar">
              <img v-if="cat.cat.avatarData || cat.cat.avatar" :src="getAvatarUrl(cat.cat)" :alt="cat.cat.name" />
              <span v-else class="avatar-placeholder">{{ cat.cat.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="cat-details">
              <span class="cat-name">{{ cat.cat.name }}</span>
              <span v-if="cat.cat.breed" class="cat-breed">{{ cat.cat.breed }}</span>
            </div>
          </div>
          <div v-if="cat.analysis && isBestHealth(cat)" class="best-badge">
            <svg class="best-icon" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="best-text">最健康</span>
          </div>
        </div>

        <div v-if="cat.analysis" class="card-body">
          <!-- 健康状态仪表盘 -->
          <div class="health-score-section">
            <div class="gauge-container" :class="cat.analysis.status">
              <svg viewBox="0 0 200 120" class="gauge-svg">
                <!-- 仪表盘背景 -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--color-border-light)"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <!-- 仪表盘渐变进度 -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  :stroke="getGaugeColor(cat.analysis)"
                  stroke-width="12"
                  stroke-linecap="round"
                  class="gauge-progress"
                  :style="{ strokeDasharray: getGaugeDashArray(cat.analysis) }"
                />
                <!-- 刻度线 -->
                <g class="gauge-ticks">
                  <line x1="25" y1="95" x2="30" y2="90" stroke="var(--color-text-light)" stroke-width="1" />
                  <line x1="50" y1="65" x2="55" y2="62" stroke="var(--color-text-light)" stroke-width="1" />
                  <line x1="100" y1="25" x2="100" y2="35" stroke="var(--color-text-light)" stroke-width="1" />
                  <line x1="150" y1="65" x2="145" y2="62" stroke="var(--color-text-light)" stroke-width="1" />
                  <line x1="175" y1="95" x2="170" y2="90" stroke="var(--color-text-light)" stroke-width="1" />
                </g>
                <!-- 刻度标签 -->
                <g class="gauge-labels" fill="var(--color-text-secondary)" font-size="8">
                  <text x="20" y="112" text-anchor="middle">偏瘦</text>
                  <text x="100" y="20" text-anchor="middle">完美</text>
                  <text x="180" y="112" text-anchor="middle">超重</text>
                </g>
                <!-- 指针 -->
                <g class="gauge-pointer" :style="{ transform: `rotate(${getPointerAngle(cat.analysis.percentage)}deg)`, transformOrigin: '100px 100px' }">
                  <polygon points="100,35 95,100 100,105 105,100" :fill="getGaugeColor(cat.analysis)" />
                  <circle cx="100" cy="100" r="6" fill="white" stroke="var(--color-text-regular)" stroke-width="2" />
                </g>
              </svg>
              <div class="gauge-center">
                <span class="gauge-value">{{ formatWeightValue(cat.analysis.current) }}</span>
                <span class="gauge-unit">kg</span>
              </div>
            </div>
          </div>

          <!-- 状态徽章 -->
          <div class="status-section">
            <div class="status-badge" :class="cat.analysis.status">
              <svg v-if="cat.analysis.status === 'thin'" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6 6"/>
              </svg>
              <svg v-else-if="cat.analysis.status === 'normal'" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <svg v-else-if="cat.analysis.status === 'overweight'" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6 6"/>
              </svg>
              <span class="status-text">{{ getStatusText(cat.analysis.status) }}</span>
            </div>
          </div>

          <!-- 体重信息卡片 -->
          <div class="weight-info-cards">
            <div class="info-card primary">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a2 2 0 002 2h10a2 2 0 002-2l-3-9m0 0l-3 1m3-1v12"/>
              </svg>
              <div class="info-content">
                <span class="info-label">当前体重</span>
                <span class="info-value">{{ formatWeightValue(cat.analysis.current) }}<small>kg</small></span>
              </div>
            </div>
            <div class="info-card secondary">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v7a2 2 0 01-2 2zm-9-3V9a2 2 0 114 0v4"/>
              </svg>
              <div class="info-content">
                <span class="info-label">标准范围</span>
                <span class="info-value range">{{ formatWeightValue(cat.analysis.min) }}-{{ formatWeightValue(cat.analysis.max) }}<small>kg</small></span>
              </div>
            </div>
          </div>

          <!-- 偏差指示条 -->
          <div v-if="cat.analysis.deviation !== 0" class="deviation-section">
            <div class="deviation-label">偏离标准</div>
            <div class="deviation-bar">
              <div
                class="deviation-fill"
                :class="cat.analysis.deviation > 0 ? 'over' : 'under'"
                :style="getDeviationStyle(cat.analysis)"
              ></div>
            </div>
            <div class="deviation-value" :class="cat.analysis.deviation > 0 ? 'over' : 'under'">
              {{ cat.analysis.deviation > 0 ? '+' : '' }}{{ formatWeightValue(cat.analysis.deviation) }}kg
            </div>
          </div>

          <!-- 分析建议 -->
          <div class="analysis-card" :class="cat.analysis.status">
            <svg v-if="cat.analysis.status === 'normal'" class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="card-text">
              <template v-if="cat.analysis.status === 'normal'">
                体重控制得非常棒，请继续保持！
              </template>
              <template v-else-if="cat.analysis.status === 'thin'">
                体重偏轻，建议适当增加营养摄入
              </template>
              <template v-else-if="cat.analysis.status === 'overweight'">
                体重超标，建议适当控制饮食增加运动
              </template>
              <template v-else>
                {{ cat.analysis.message }}
              </template>
            </div>
          </div>
        </div>

        <div v-else class="card-body no-data">
          <div class="no-data-illustration">
            <svg class="illustration-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <p class="no-data-text">暂无健康分析数据</p>
          <p class="no-data-hint">添加体重记录后即可查看健康分析</p>
          <button class="btn-add-record" @click="handleAddRecord(cat.cat)">
            <span>添加记录</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 对比洞察面板 -->
    <div v-if="catsWithAnalysis.length > 1 && !loading && !error" class="insights-panel">
      <h4 class="insights-title">对比洞察</h4>
      <div class="insights-grid">
        <div class="insight-card">
          <div class="insight-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a2 2 0 002 2h10a2 2 0 002-2l-3-9m0 0l-3 1m3-1v12"/>
            </svg>
          </div>
          <span class="insight-label">吨位担当</span>
          <span class="insight-value">{{ getWeightRangeCat().max.name }}</span>
          <span class="insight-sub">{{ formatWeightValue(getWeightRangeCat().maxWeight) }}kg · 比{{ getWeightRangeCat().min.name }}重 {{ formatWeightValue(getWeightRangeCat().maxWeight - getWeightRangeCat().minWeight) }}kg</span>
        </div>
        <div class="insight-card highlight">
          <div class="insight-icon-wrapper star">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span class="insight-label">健康标兵</span>
          <span class="insight-value">{{ getBestHealthCat().cat.name }}</span>
          <span class="insight-sub">{{ getStatusText(getBestHealthCat().analysis!.status) }} · 完美体型</span>
        </div>
        <div class="insight-card">
          <div class="insight-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <span class="insight-label">管家建议</span>
          <span class="insight-value" :class="{ 'warning': getWarningCat() }">{{ getWarningCat() ? getWarningCat()!.cat.name + '需关注' : '状态极佳' }}</span>
          <span class="insight-sub">{{ getWarningCat() ? getStatusText(getWarningCat()!.analysis!.status) + ' · 偏离 ' + formatWeightValue(Math.abs(getWarningCat()!.analysis!.deviation)) + 'kg' : '无需调整当前喂养方案' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CatComparisonData } from '../../types/weight'
import { formatWeightValue, getAvatarUrl } from '../../utils/format'

interface Props {
  cats: CatComparisonData[]
  loading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: ''
})

const CAT_COLORS = [
  '#FF8A4C', // 橙色（主色 - 珊瑚橘）
  '#10B981', // 薄荷绿
  '#38BDF8', // 天空蓝
  '#A78BFA', // 薰衣草紫
  '#F472B6', // 柔粉
]

// 有分析数据的猫咪
const catsWithAnalysis = computed(() => {
  return props.cats.filter(cat => cat.analysis !== null)
})

function getStatusText(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '完美体型'
    case 'overweight': return '超重'
    default: return '未知'
  }
}


// 仪表盘相关函数
function getGaugeColor(analysis: any): string {
  if (analysis.status === 'normal') return '#10B981'
  if (analysis.status === 'thin') return '#F59E0B'
  if (analysis.status === 'overweight') return 'var(--color-danger)'
  return '#10B981'
}

function getGaugeDashArray(analysis: any): string {
  // 仪表盘弧长约 251 (π * 80)
  const arcLength = 251
  const progress = (analysis.percentage / 100) * arcLength
  return `${progress} ${arcLength}`
}

function getPointerAngle(percentage: number): number {
  // 0% = -90度(最左边), 50% = 0度(中间), 100% = 90度(最右边)
  return (percentage - 50) * 1.8
}

function getDeviationStyle(analysis: any) {
  const maxDeviation = Math.max(
    Math.abs(analysis.max - analysis.current),
    Math.abs(analysis.min - analysis.current)
  )
  const percentage = (Math.abs(analysis.deviation) / maxDeviation) * 100
  return {
    width: `${Math.min(percentage, 100)}%`,
    backgroundColor: analysis.deviation > 0 ? 'var(--color-danger)' : '#F59E0B'
  }
}

function isBestHealth(cat: CatComparisonData): boolean {
  if (!cat.analysis) return false
  const catsWithAnalysis = props.cats.filter(c => c.analysis)
  if (catsWithAnalysis.length === 0) return false
  const best = catsWithAnalysis.reduce((best, current) =>
    current.analysis!.percentage > best.analysis!.percentage ? current : best
  )
  return cat.cat.id === best.cat.id
}

function getBestHealthCat(): CatComparisonData {
  const catsWithAnalysis = props.cats.filter(c => c.analysis)
  return catsWithAnalysis.reduce((best, current) =>
    current.analysis!.percentage > best.analysis!.percentage ? current : best
  )
}

function getWeightRangeCat() {
  const catsWithWeight = props.cats.filter(c => c.analysis)
  const weights = catsWithWeight.map(c => ({ name: c.cat.name, weight: c.analysis!.current }))
  const max = weights.reduce((max, current) => current.weight > max.weight ? current : max)
  const min = weights.reduce((min, current) => current.weight < min.weight ? current : min)
  return { max, min, maxWeight: max.weight, minWeight: min.weight }
}

function getWarningCat(): CatComparisonData | null {
  const catsWithAbnormal = props.cats.filter(c => c.analysis && c.analysis.status !== 'normal')
  if (catsWithAbnormal.length === 0) return null
  return catsWithAbnormal.reduce((worst, current) =>
    Math.abs(current.analysis!.deviation) > Math.abs(worst.analysis!.deviation) ? current : worst
  )
}

function getComparativeInsight(): string {
  const warningCat = getWarningCat()
  if (warningCat) {
    return `${warningCat.cat.name} 需要特别关注`
  }
  return '所有猫咪健康状态良好'
}

function handleAddRecord(cat: any) {
  // 触发添加记录事件
  console.log('Add record for:', cat.name)
}
</script>

<style scoped>
.health-comparison-cards {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card-normal);
}

.cards-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.header-left h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.header-insight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--color-warning-bg);
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.insight-icon {
  flex-shrink: 0;
  color: inherit;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
  gap: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-bg-muted);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  color: var(--color-warning);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.health-card {
  border: 2px solid var(--color-border-light);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #ffffff 0%, var(--color-bg-block) 100%);
}

.health-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--card-accent, var(--color-primary));
}

.health-card.best-health {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, #ffffff 0%, var(--color-primary-light) 100%);
  box-shadow: 0 4px 16px rgba(255, 138, 76, 0.15);
}

.card-header {
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-muted);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-regular);
}

.cat-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.cat-breed {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.best-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-primary-gradient);
  border-radius: 20px;
  font-size: 11px;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 138, 76, 0.3);
}

.best-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 健康评分仪表盘 */
.health-score-section {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.gauge-container {
  position: relative;
  width: 180px;
  height: 110px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.gauge-progress {
  transition: stroke-dasharray 0.8s ease;
}

.gauge-pointer {
  transition: transform 0.8s ease;
}

.gauge-center {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.gauge-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.gauge-unit {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* 状态徽章 */
.status-section {
  display: flex;
  justify-content: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.thin {
  background: var(--color-warning-bg);
  color: #92400e;
  border: 1px solid var(--color-warning-light);
}

.status-badge.normal {
  background: var(--color-success-bg);
  color: #065f46;
  border: 1px solid var(--color-success-light);
}

.status-badge.overweight {
  background: var(--color-danger-bg);
  color: #991b1b;
  border: 1px solid var(--color-danger-light);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 体重信息卡片 */
.weight-info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.info-card.primary {
  background: var(--color-info-bg);
  border: 1px solid var(--color-info-light);
}

.info-card.secondary {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-light);
}

.info-card:hover {
  transform: translateY(-2px);
}

.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-text-regular);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 10px;
  color: var(--color-text-regular);
  font-weight: 500;
}

.info-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.info-value small {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-regular);
}

/* 偏差指示条 */
.deviation-section {
  padding: 12px;
  background: var(--color-bg-block);
  border-radius: 10px;
}

.deviation-label {
  font-size: 11px;
  color: var(--color-text-regular);
  margin-bottom: 8px;
  font-weight: 500;
}

.deviation-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.deviation-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.deviation-fill.over {
  background: linear-gradient(90deg, var(--color-danger-light) 0%, var(--color-danger) 100%);
}

.deviation-fill.under {
  background: linear-gradient(90deg, var(--color-warning-light) 0%, var(--color-warning) 100%);
}

.deviation-value {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.deviation-value.over {
  color: var(--color-danger);
}

.deviation-value.under {
  color: var(--color-warning);
}

/* 分析卡片 */
.analysis-card {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: var(--color-success-bg);
  border-radius: 10px;
  border-left: 3px solid var(--color-success);
}

.analysis-card.normal {
  background: var(--color-success-bg);
  border-left-color: var(--color-success);
}

.analysis-card.normal .card-icon {
  color: var(--color-success);
}

.analysis-card.thin {
  background: var(--color-warning-bg);
  border-left-color: var(--color-warning);
}

.analysis-card.thin .card-icon {
  color: var(--color-warning);
}

.analysis-card.overweight {
  background: var(--color-danger-bg);
  border-left-color: var(--color-danger);
}

.analysis-card.overweight .card-icon {
  color: var(--color-danger);
}

.card-text {
  font-size: 12px;
  color: var(--color-text-regular);
  line-height: 1.6;
}

/* 无数据状态 */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  min-height: 250px;
}

.no-data-illustration {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.illustration-icon-svg {
  color: var(--color-text-light);
}

.no-data-text {
  color: var(--color-text-regular);
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 6px 0;
}

.no-data-hint {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 0 0 16px 0;
}

.btn-add-record {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-primary-gradient);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-record:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary-btn);
}

/* 对比洞察面板 */
.insights-panel {
  margin-top: 24px;
  padding: 20px;
  background: var(--color-bg-block);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.insights-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.insight-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  background: white;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.insight-card.highlight {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, #ffffff 0%, var(--color-primary-light) 100%);
}

.insight-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-input);
}

.insight-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-bg-muted);
  color: var(--color-text-regular);
  margin-bottom: 8px;
}

.insight-icon-wrapper.star {
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-action-orange) 100%);
  color: var(--color-primary);
}

.insight-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-bottom: 6px;
}

.insight-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.insight-value.warning {
  color: var(--color-danger);
}

.insight-sub {
  font-size: 11px;
  color: var(--color-text-regular);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .health-comparison-cards {
    padding: 16px;
    border-radius: 12px;
  }

  .cards-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-insight {
    width: 100%;
    justify-content: center;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .health-card {
    border-radius: 12px;
  }

  .weight-info-cards {
    grid-template-columns: 1fr;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>

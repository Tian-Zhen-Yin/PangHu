<template>
  <div class="health-comparison-cards">
    <div class="cards-header">
      <h3>健康状态对比</h3>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="cat in cats"
        :key="cat.cat.id"
        class="health-card"
      >
        <div class="card-header">
          <div class="cat-info">
            <div class="cat-avatar">
              <img v-if="cat.cat.avatar" :src="getAvatarUrl(cat.cat)" :alt="cat.cat.name" />
              <span v-else class="avatar-placeholder">{{ cat.cat.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="cat-name">{{ cat.cat.name }}</span>
          </div>
        </div>

        <div v-if="cat.analysis" class="card-body">
          <div class="status-section">
            <div class="status-badge" :class="cat.analysis.status">
              <span class="status-icon">{{ getStatusIcon(cat.analysis.status) }}</span>
              <span class="status-text">{{ getStatusText(cat.analysis.status) }}</span>
            </div>
          </div>

          <div class="weight-info">
            <div class="weight-row">
              <span class="label">当前体重</span>
              <span class="value">{{ cat.analysis.current.toFixed(1) }}kg</span>
            </div>
            <div class="weight-row">
              <span class="label">标准范围</span>
              <span class="value standard">{{ cat.analysis.min }}kg - {{ cat.analysis.max }}kg</span>
            </div>
            <div v-if="cat.analysis.deviation !== 0" class="weight-row">
              <span class="label">偏差</span>
              <span class="value" :class="cat.analysis.deviation > 0 ? 'over' : 'under'">
                {{ cat.analysis.deviation > 0 ? '+' : '' }}{{ cat.analysis.deviation.toFixed(1) }}kg
              </span>
            </div>
          </div>

          <div class="analysis-message">
            {{ cat.analysis.message }}
          </div>
        </div>

        <div v-else class="card-body no-data">
          <p class="no-data-text">暂无健康分析数据</p>
          <p class="no-data-hint">请先添加体重记录</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '../common/LoadingSpinner.vue'
import type { CatComparisonData } from '../../types/weight'
import type { Cat } from '../../types/cat'

interface Props {
  cats: CatComparisonData[]
  loading?: boolean
  error?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: ''
})

function getAvatarUrl(cat: Cat): string {
  if (!cat.avatar) return ''
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  if (cat.avatar.startsWith('http')) return cat.avatar
  return `${baseURL}${cat.avatar}`
}

function getStatusIcon(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '📉'
    case 'normal': return '✅'
    case 'overweight': return '📈'
    default: return '❓'
  }
}

function getStatusText(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '正常'
    case 'overweight': return '超重'
    default: return '未知'
  }
}
</script>

<style scoped>
.health-comparison-cards {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cards-header h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.loading,
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  color: #999;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.health-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.health-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 16px;
  color: #666;
}

.cat-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.card-body {
  padding: 16px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  text-align: center;
}

.no-data-text {
  color: #999;
  font-size: 13px;
  margin: 0;
}

.no-data-hint {
  color: #bbb;
  font-size: 11px;
  margin: 4px 0 0 0;
}

.status-section {
  margin-bottom: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.thin {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.status-badge.normal {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-badge.overweight {
  background: #fff2e8;
  color: #fa541c;
  border: 1px solid #ffbb96;
}

.status-icon {
  margin-right: 4px;
  font-size: 14px;
}

.weight-info {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.weight-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.weight-row:last-child {
  margin-bottom: 0;
}

.weight-row .label {
  font-size: 12px;
  color: #666;
}

.weight-row .value {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.weight-row .value.standard {
  font-weight: 500;
  color: #52c41a;
}

.weight-row .value.over {
  color: #fa541c;
}

.weight-row .value.under {
  color: #fa8c16;
}

.analysis-message {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  padding: 10px 12px;
  background: #fff9f5;
  border-radius: 8px;
  border-left: 3px solid #f5a623;
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>

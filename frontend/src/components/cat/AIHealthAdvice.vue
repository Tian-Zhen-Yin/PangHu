<template>
  <div class="ai-health-advice">
    <div class="advice-header">
      <span class="icon">🤖</span>
      <h3>AI 健康分析</h3>
      <button v-if="!loading" class="refresh-btn" @click="fetchAdvice" title="刷新">
        ↻
      </button>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="advice" class="advice-content">
      <!-- 体重建议 -->
      <div v-if="advice.weightAdvice" class="advice-item">
        <div class="status-badge" :class="advice.weightAdvice.status">
          <span class="icon">{{ getWeightIcon(advice.weightAdvice.status) }}</span>
          <span class="text">{{ getWeightText(advice.weightAdvice.status) }}</span>
        </div>
        <p class="advice-text">{{ advice.weightAdvice.suggestion }}</p>
      </div>

      <!-- 疫苗建议 -->
      <div v-if="advice.vaccineAdvice" class="advice-item">
        <div class="advice-title">💉 疫苗提醒</div>
        <p class="advice-text">{{ advice.vaccineAdvice.nextAction }}</p>
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

      <!-- 年龄阶段建议 -->
      <div v-if="advice.ageAdvice" class="advice-item">
        <div class="advice-title">📋 {{ advice.ageAdvice.stage }}养护要点</div>
        <ul class="tips-list">
          <li v-for="tip in advice.ageAdvice.tips" :key="tip">
            {{ tip }}
          </li>
        </ul>
      </div>

      <!-- 综合建议 -->
      <div v-if="advice.generalAdvice" class="advice-item general">
        <p class="advice-text">{{ advice.generalAdvice }}</p>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无分析数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ProactiveAdvice } from '../../types/proactive'
import { getProactiveAdvice } from '../../api/proactive'
import LoadingSpinner from '../common/LoadingSpinner.vue'

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

function getWeightIcon(status: string): string {
  switch (status) {
    case 'thin': return '📉'
    case 'normal': return '✅'
    case 'overweight': return '📈'
    default: return '❓'
  }
}

function getWeightText(status: string): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '正常'
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
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.advice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.advice-header .icon {
  font-size: 20px;
}

.advice-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  flex: 1;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: #999;
}

.advice-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.advice-item {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.advice-item.general {
  background: #fff7e6;
  border-left: 3px solid #f5a623;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.status-badge.thin {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.normal {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.overweight {
  background: #fff2e8;
  color: #fa541c;
}

.advice-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.advice-text {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: white;
  border-radius: 6px;
  font-size: 12px;
}

.upcoming-item.urgent {
  background: #fff1f0;
  color: #ff4d4f;
}

.upcoming-item.overdue {
  background: #ffebeb;
  color: #d9363e;
  font-weight: 500;
}

.vaccine-name {
  font-weight: 500;
}

.tips-list {
  margin: 8px 0 0 0;
  padding-left: 18px;
}

.tips-list li {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 4px;
}
</style>

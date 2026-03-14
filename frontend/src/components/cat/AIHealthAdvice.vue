<template>
  <div class="ai-health-advice">
    <!-- 对话气泡风格头部 -->
    <div class="advice-header-bubble">
      <div class="mascot-avatar">
        <MascotCharacter expression="focused" size="medium" :animated="true" />
      </div>
      <div class="header-content">
        <h3>AI 健康分析</h3>
        <p class="header-subtitle">胖虎医生的专业建议</p>
      </div>
      <button v-if="!loading" class="refresh-btn" @click="fetchAdvice" title="刷新">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading">
      <MascotCharacter expression="yawning" size="medium" :animated="true" />
      <p>胖虎正在分析中...</p>
    </div>

    <div v-else-if="error" class="error">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p>{{ error }}</p>
    </div>

    <div v-else-if="advice" class="advice-content">
      <!-- 体重建议 -->
      <div v-if="advice.weightAdvice" class="advice-bubble">
        <div class="bubble-indicator"></div>
        <div class="status-pill" :class="advice.weightAdvice.status">
          <MascotCharacter
            :expression="advice.weightAdvice.status === 'normal' ? 'happy' : 'confused'"
            size="small"
            :animated="advice.weightAdvice.status === 'normal'"
          />
          <span>{{ getWeightText(advice.weightAdvice.status) }}</span>
        </div>
        <p class="bubble-text">{{ advice.weightAdvice.suggestion }}</p>
      </div>

      <!-- 疫苗建议 -->
      <div v-if="advice.vaccineAdvice" class="advice-bubble">
        <div class="bubble-indicator"></div>
        <div class="bubble-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
          </svg>
          疫苗提醒
        </div>
        <p class="bubble-text">{{ advice.vaccineAdvice.nextAction }}</p>
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
      <div v-if="advice.ageAdvice" class="advice-bubble">
        <div class="bubble-indicator"></div>
        <div class="bubble-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          {{ advice.ageAdvice.stage }}养护要点
        </div>
        <ul class="tips-list">
          <li v-for="tip in advice.ageAdvice.tips" :key="tip">
            {{ tip }}
          </li>
        </ul>
      </div>

      <!-- 综合建议 -->
      <div v-if="advice.generalAdvice" class="advice-bubble highlight">
        <div class="bubble-indicator"></div>
        <p class="bubble-text">{{ advice.generalAdvice }}</p>
      </div>
    </div>

    <div v-else class="empty-state">
      <MascotCharacter expression="waiting" size="medium" :animated="false" />
      <p>暂无分析数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ProactiveAdvice } from '../../types/proactive'
import { getProactiveAdvice } from '../../api/proactive'
import MascotCharacter from '../mascot/MascotCharacter.vue'
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
  background: linear-gradient(145deg, #FFFFFF 0%, #FFFBF7 100%);
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 4px 20px rgba(244, 162, 97, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.03);
  border: 1px solid #FDF3E9;
}

/* 对话气泡头部 */
.advice-header-bubble {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #E5E7EB;
}

.mascot-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.2);
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #374151;
}

.header-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #9CA3AF;
}

.refresh-btn {
  background: #F3F4F6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #6B7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #E5E7EB;
  color: #F4A261;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
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
  gap: 12px;
  color: #9CA3AF;
}

.loading p,
.error p,
.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* 对话气泡内容 */
.advice-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.advice-bubble {
  position: relative;
  padding: 16px 16px 16px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F3F4F6;
  margin-left: 10px;
}

.advice-bubble::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 20px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid #F3F4F6;
}

.advice-bubble.highlight {
  background: linear-gradient(135deg, #FFF7ED 0%, #FFFBF7 100%);
  border-color: #FED7AA;
}

.advice-bubble.highlight::before {
  border-right-color: #FED7AA;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.status-pill.normal {
  background: #DCFCE7;
  color: #16A34A;
}

.status-pill.thin {
  background: #FEF3C7;
  color: #D97706;
}

.status-pill.overweight {
  background: #FEE2E2;
  color: #DC2626;
}

.bubble-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.title-icon {
  width: 16px;
  height: 16px;
  color: #F4A261;
}

.bubble-text {
  margin: 0;
  font-size: 14px;
  color: #4B5563;
  line-height: 1.6;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #F9FAFB;
  border-radius: 8px;
  font-size: 13px;
}

.upcoming-item.urgent {
  background: #FEF2F2;
  color: #DC2626;
}

.upcoming-item.overdue {
  background: #FEF2F2;
  color: #B91C1C;
  font-weight: 600;
}

.vaccine-name {
  font-weight: 500;
  color: #374151;
}

.tips-list {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.tips-list li {
  font-size: 13px;
  color: #4B5563;
  line-height: 1.7;
  margin-bottom: 6px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .ai-health-advice {
    padding: 16px;
    border-radius: 20px;
  }

  .mascot-avatar {
    width: 44px;
    height: 44px;
  }

  .header-content h3 {
    font-size: 16px;
  }

  .advice-bubble {
    padding: 12px 12px 12px 16px;
    margin-left: 6px;
  }

  .advice-bubble::before {
    left: -4px;
    top: 16px;
  }
}
</style>
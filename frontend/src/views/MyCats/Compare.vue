<template>
  <div class="compare-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="$router.back()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          返回
        </button>
        <div class="header-titles">
          <h1 class="page-title">多猫健康对比</h1>
          <p class="page-subtitle">对比您猫咪的健康数据和成长趋势</p>
        </div>
      </div>
      <div class="header-stats" v-if="comparisonData.length > 0">
        <div class="stat-item">
          <span class="stat-value">{{ comparisonData.length }}</span>
          <span class="stat-label">只猫咪</span>
        </div>
      </div>
    </div>

    <div class="compare-content">
      <!-- 猫咪选择区域 -->
      <div class="selector-section" :class="{ 'has-results': comparisonData.length > 0 }">
        <div class="section-header">
          <div class="section-title-group">
            <h2 class="section-title">选择猫咪</h2>
            <span class="section-subtitle">最多可选择 5 只猫咪进行对比</span>
          </div>
          <div class="selection-counter" :class="{ 'valid': selectedCats.length >= 2 }">
            <span class="counter-number">{{ selectedCats.length }}</span>
            <span class="counter-divider">/</span>
            <span class="counter-max">5</span>
          </div>
        </div>

        <CatMultiSelector v-model="selectedCats" :max="5" />

        <div class="action-buttons">
          <button
            @click="startCompare"
            class="btn-compare"
            :disabled="selectedCats.length < 2 || loading"
            :class="{ 'loading': loading }"
          >
            <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" class="spin">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ loading ? '对比中...' : selectedCats.length >= 2 ? '开始对比' : '请至少选择2只猫咪' }}
          </button>
          <button
            v-if="comparisonData.length > 0"
            @click="clearSelection"
            class="btn-clear"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            清除
          </button>
        </div>

        <!-- 提示信息 -->
        <transition name="fade">
          <div v-if="selectedCats.length > 0 && selectedCats.length < 2" class="hint-warning">
            <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>至少选择 2 只猫咪进行对比</span>
          </div>
        </transition>

        <transition name="fade">
          <div v-if="error" class="error-message">
            <svg class="error-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span>{{ error }}</span>
          </div>
        </transition>
      </div>

      <!-- 对比结果区域 -->
      <transition name="slide-up">
        <div v-if="comparisonData.length > 0" class="comparison-result">
          <!-- 对比概览卡片 -->
          <div class="comparison-overview">
            <div class="overview-card">
              <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <div class="overview-content">
                <span class="overview-label">对比猫咪</span>
                <span class="overview-value">{{ comparisonData.map(c => c.cat.name).join('、') }}</span>
              </div>
            </div>
            <div class="overview-card">
              <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3-3M16 12l3 3-3-3M5 12h14"/>
              </svg>
              <div class="overview-content">
                <span class="overview-label">数据记录</span>
                <span class="overview-value">{{ getTotalRecords() }} 条体重记录</span>
              </div>
            </div>
          </div>

          <!-- 对比选项卡 -->
          <div class="comparison-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-button"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" v-if="tab.key === 'trend'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" v-else-if="tab.key === 'health'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" v-else>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          </div>

          <!-- 选项卡内容 -->
          <div class="comparison-content">
            <transition name="fade" mode="out-in">
              <WeightTrendComparison
                v-if="activeTab === 'trend'"
                :cats="comparisonData"
                :loading="loading"
                :error="error"
                key="trend"
              />

              <HealthComparisonCards
                v-else-if="activeTab === 'health'"
                :cats="comparisonData"
                :loading="loading"
                :error="error"
                key="health"
              />

              <CatInfoComparisonTable
                v-else-if="activeTab === 'info'"
                :cats="comparisonData"
                :loading="loading"
                :error="error"
                key="info"
              />
            </transition>
          </div>
        </div>
      </transition>

      <!-- 空状态 -->
      <transition name="fade">
        <div v-if="comparisonData.length === 0 && !loading && selectedCats.length >= 2" class="empty-result">
          <div class="empty-illustration">
            <span class="illustration-bg"></span>
            <svg class="illustration-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h3 class="empty-title">准备开始对比</h3>
          <p class="empty-text">已选择 {{ selectedCats.length }} 只猫咪</p>
          <p class="empty-hint">点击"开始对比"按钮查看详细分析</p>
          <div class="empty-features">
            <div class="feature-item">
              <svg class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <span class="feature-text">体重趋势对比</span>
            </div>
            <div class="feature-item">
              <svg class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <span class="feature-text">健康状态分析</span>
            </div>
            <div class="feature-item">
              <svg class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="feature-text">基本信息对比</span>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import CatMultiSelector from '../../components/cat/CatMultiSelector.vue'
import WeightTrendComparison from '../../components/cat/WeightTrendComparison.vue'
import HealthComparisonCards from '../../components/cat/HealthComparisonCards.vue'
import CatInfoComparisonTable from '../../components/cat/CatInfoComparisonTable.vue'
import { getBatchWeightAnalysis, getBatchWeightHistory } from '../../api/weightStandard'
import type { CatComparisonData } from '../../types/weight'
import type { Cat } from '../../types/cat'
import { useMyCatStore } from '../../stores/myCat'

const catStore = useMyCatStore()

const selectedCats = ref<string[]>([])
const comparisonData = ref<CatComparisonData[]>([])
const activeTab = ref<'trend' | 'health' | 'info'>('trend')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  await catStore.fetchCats()
})

const tabs = [
  { key: 'trend' as const, label: '体重趋势' },
  { key: 'health' as const, label: '健康状态' },
  { key: 'info' as const, label: '基本信息' }
]

function getTotalRecords(): number {
  return comparisonData.value.reduce((total, cat) => {
    return total + (cat.history?.length || 0)
  }, 0)
}

async function startCompare() {
  if (selectedCats.value.length < 2) return

  loading.value = true
  error.value = ''

  try {
    await catStore.fetchCats()
    const selectedCatsData = catStore.cats.filter(cat => selectedCats.value.includes(cat.id))

    if (selectedCatsData.length === 0) {
      error.value = '未找到选中的猫咪数据'
      return
    }

    const [analysisData, historyData] = await Promise.all([
      getBatchWeightAnalysis(selectedCats.value),
      getBatchWeightHistory(selectedCats.value)
    ])

    comparisonData.value = selectedCatsData.map(cat => ({
      cat: {
        id: cat.id,
        name: cat.name,
        avatar: cat.avatar,
        avatarData: cat.avatarData,
        breed: cat.breed,
        ageFormatted: cat.ageFormatted,
        gender: cat.gender
      },
      analysis: analysisData?.[cat.id] || null,
      history: historyData?.[cat.id] || []
    }))

    // 智能选择初始标签页
    const hasHistory = comparisonData.value.some(cat => cat.history && cat.history.length > 0)
    const hasAnalysis = comparisonData.value.some(cat => cat.analysis)
    if (hasHistory) {
      activeTab.value = 'trend'
    } else if (hasAnalysis) {
      activeTab.value = 'health'
    } else {
      activeTab.value = 'info'
    }
  } catch (err: any) {
    error.value = err.message || '获取对比数据失败'
  } finally {
    loading.value = false
  }
}

function clearSelection() {
  selectedCats.value = []
  comparisonData.value = []
  error.value = ''
  activeTab.value = 'trend'
}
</script>

<style scoped>
.compare-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: #fef3f7;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  border: 1px solid #fbbf24;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #92400e;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #b45309;
  font-weight: 600;
  margin-top: 4px;
}

/* 内容区域 */
.compare-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 选择区域 */
.selector-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 2px solid #f3f4f6;
  transition: all 0.3s ease;
}

.selector-section.has-results {
  border-color: #dbeafe;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.overview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 10px;
  color: #6b7280;
  flex-shrink: 0;
}

.section-subtitle {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.selection-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.selection-counter.valid {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid #34d399;
}

.counter-number {
  font-size: 16px;
  font-weight: 800;
}

.counter-divider {
  opacity: 0.5;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-compare {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
}

.btn-compare:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35);
}

.btn-compare:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-compare.loading {
  pointer-events: none;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: #fef2f2;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 提示信息 */
.hint-warning,
.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.warning-icon,
.error-icon-svg {
  flex-shrink: 0;
  color: inherit;
}

.hint-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.error-message {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #f87171;
}

/* 对比结果区域 */
.comparison-result {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 2px solid #f3f4f6;
}

.comparison-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.overview-card:hover {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, #ffedd5 100%);
}

.overview-icon {
  font-size: 28px;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.overview-value {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

/* 对比选项卡 */
.comparison-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.tab-button.active {
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, #ffedd5 100%);
  color: #c2410c;
  border: 1px solid #fdba74;
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comparison-content {
  min-height: 350px;
}

/* 空状态 */
.empty-result {
  text-align: center;
  padding: 60px 40px;
  background: white;
  border-radius: 16px;
  border: 2px dashed #e5e7eb;
}

.empty-illustration {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.illustration-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 50%;
  opacity: 0.3;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.5; }
}

.illustration-icon-svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #9ca3af;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.empty-text {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #4b5563;
}

.empty-hint {
  margin: 0 0 24px 0;
  font-size: 13px;
  color: #9ca3af;
}

.empty-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.feature-icon-svg {
  flex-shrink: 0;
  color: #6b7280;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .compare-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .btn-back {
    padding: 8px 14px;
    font-size: 13px;
  }

  .page-title {
    font-size: 22px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .header-stats {
    width: 100%;
    justify-content: flex-start;
  }

  .stat-item {
    flex: 1;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .selector-section {
    padding: 20px;
  }

  .comparison-result {
    padding: 20px;
  }

  .comparison-tabs {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1;
    min-width: 100px;
    padding: 10px 14px;
    font-size: 13px;
  }

  .empty-features {
    flex-direction: column;
    gap: 8px;
  }

  .feature-item {
    width: 100%;
  }
}
</style>

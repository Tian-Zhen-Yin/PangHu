<template>
  <div class="compare-page">
    <div class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="$router.back()">
          ← 返回
        </button>
        <h1 class="page-title">多猫对比</h1>
      </div>
    </div>

    <div class="compare-content">
      <!-- 猫咪选择区域 -->
      <div class="selector-section">
        <h2 class="section-title">选择猫咪</h2>
        <CatMultiSelector v-model="selectedCats" :max="5" />

        <div class="action-buttons">
          <button
            @click="startCompare"
            class="btn-compare"
            :disabled="selectedCats.length < 2 || loading"
          >
            {{ loading ? '对比中...' : '开始对比' }} (已选 {{ selectedCats.length }}/2)
          </button>
          <button
            v-if="comparisonData.length > 0"
            @click="clearSelection"
            class="btn-clear"
          >
            清除选择
          </button>
        </div>

        <div v-if="selectedCats.length > 0 && selectedCats.length < 2" class="hint-warning">
          ⚠️ 至少选择 2 只猫咪进行对比
        </div>

        <div v-if="error" class="error-message">
          ❌ {{ error }}
        </div>
      </div>

      <!-- 对比结果区域 -->
      <div v-if="comparisonData.length > 0" class="comparison-result">
        <!-- 对比选项卡 -->
        <div class="comparison-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 选项卡内容 -->
        <div class="comparison-content">
          <WeightTrendComparison
            v-if="activeTab === 'trend'"
            :cats="comparisonData"
            :loading="loading"
            :error="error"
          />

          <HealthComparisonCards
            v-if="activeTab === 'health'"
            :cats="comparisonData"
            :loading="loading"
            :error="error"
          />

          <CatInfoComparisonTable
            v-if="activeTab === 'info'"
            :cats="comparisonData"
            :loading="loading"
            :error="error"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && selectedCats.length >= 2" class="empty-result">
        <div class="empty-icon">📊</div>
        <p class="empty-text">选择猫咪后点击"开始对比"</p>
        <p class="empty-hint">可以对比体重趋势、健康状态和基本信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

    if (comparisonData.value.some(cat => cat.history && cat.history.length > 0)) {
      activeTab.value = 'trend'
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
}
</script>

<style scoped>
.compare-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.compare-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.selector-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn-compare {
  flex: 1;
  padding: 12px 24px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-compare:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.btn-compare:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clear {
  padding: 12px 24px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.hint-warning {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 6px;
  font-size: 12px;
  color: #fa8c16;
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: #ffe0e0;
  border-radius: 6px;
  font-size: 12px;
  color: #e53e3e;
}

.comparison-result {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.comparison-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.tab-button {
  padding: 8px 20px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #f5f5f5;
  color: #333;
}

.tab-button.active {
  background: #fff5f0;
  color: #ff6b35;
  font-weight: 600;
}

.comparison-content {
  min-height: 300px;
}

.empty-result {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

@media (max-width: 640px) {
  .compare-page {
    padding: 16px;
  }

  .page-title {
    font-size: 18px;
  }

  .comparison-tabs {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1;
    min-width: 80px;
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>

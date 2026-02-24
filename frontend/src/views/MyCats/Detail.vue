<template>
  <div class="cat-detail-page">
    <div class="page-header">
      <button class="btn-back" @click="$router.back()">
        ← 返回
      </button>
      <div class="header-actions">
        <button class="btn-action" @click="$router.push(`/my-cats/${cat?.id}/edit`)">
          编辑档案
        </button>
        <button class="btn-action" @click="$router.push(`/my-cats/${cat?.id}/vaccines`)">
          疫苗记录
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="cat" class="detail-content">
      <!-- 猫咪基本信息卡片 -->
      <div class="cat-info-card">
        <div class="cat-avatar-section">
          <div class="cat-avatar-large">
            <img v-if="cat.avatar" :src="cat.avatar" :alt="cat.name" />
            <span v-else class="avatar-placeholder">🐱</span>
          </div>
          <div class="cat-names">
            <h2>{{ cat.name }}</h2>
            <p class="cat-subtitle">{{ cat.breed || '未知品种' }}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="label">性别</span>
            <span class="value">{{ genderText }}</span>
          </div>
          <div class="info-item">
            <span class="label">年龄</span>
            <span class="value">{{ cat.ageFormatted }}</span>
          </div>
          <div class="info-item" v-if="cat.weight">
            <span class="label">体重</span>
            <span class="value">{{ cat.weight }} kg</span>
          </div>
          <div class="info-item">
            <span class="label">绝育状态</span>
            <span class="value">{{ cat.isNeutered ? '已绝育' : '未绝育' }}</span>
          </div>
          <div class="info-item" v-if="cat.adoptDate">
            <span class="label">领养日期</span>
            <span class="value">{{ formatDate(cat.adoptDate) }}</span>
          </div>
          <div class="info-item" v-if="cat.color">
            <span class="label">毛色</span>
            <span class="value">{{ cat.color }}</span>
          </div>
        </div>

        <div v-if="cat.allergies || cat.diseases || cat.features" class="health-notes">
          <div v-if="cat.allergies" class="note-item">
            <span class="note-label">过敏信息：</span>
            <span>{{ cat.allergies }}</span>
          </div>
          <div v-if="cat.diseases" class="note-item">
            <span class="note-label">既往病史：</span>
            <span>{{ cat.diseases }}</span>
          </div>
          <div v-if="cat.features" class="note-item">
            <span class="note-label">特征描述：</span>
            <span>{{ cat.features }}</span>
          </div>
        </div>
      </div>

      <!-- 体重趋势图 -->
      <WeightTrend :cat-id="cat.id" :cat-name="cat.name" />

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <button class="action-card" @click="$router.push('/timeline')">
          <span class="action-icon">📝</span>
          <div class="action-content">
            <h4>添加成长记录</h4>
            <p>记录今天的体重、饮食和活动情况</p>
          </div>
        </button>

        <button class="action-card" @click="$router.push('/ai-chat')">
          <span class="action-icon">💬</span>
          <div class="action-content">
            <h4>AI 咨询</h4>
            <p>关于 {{ cat.name }} 的健康问题，问问 AI</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import WeightTrend from '../../components/cat/WeightTrend.vue'
import { getMyCatById } from '../../api/myCat'
import type { Cat } from '../../types/cat'

const route = useRoute()

const cat = ref<Cat | null>(null)
const loading = ref(true)
const error = ref('')

const genderText = computed(() => {
  if (!cat.value) return ''
  return cat.value.gender === 'male' ? '公猫' :
         cat.value.gender === 'female' ? '母猫' : '未知'
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function fetchCatDetail() {
  const catId = route.params.id as string
  console.log('[Detail] Fetching cat detail for catId:', catId)
  loading.value = true
  error.value = ''

  try {
    const response = await getMyCatById(catId)
    console.log('[Detail] Cat detail response:', response)
    cat.value = response.data
    console.log('[Detail] Cat object:', cat.value)
    console.log('[Detail] Cat id:', cat.value?.id)
  } catch (err: any) {
    console.error('[Detail] Error fetching cat detail:', err)
    error.value = err.message || '获取猫咪详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCatDetail()
})
</script>

<style scoped>
.cat-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-back {
  background: transparent;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
}

.btn-back:hover {
  color: #ff6b35;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-action {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-action:hover {
  background: #e55a2b;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #888;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cat-info-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cat-avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.cat-avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  flex-shrink: 0;
}

.cat-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 48px;
}

.cat-names h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
}

.cat-subtitle {
  margin: 0;
  color: #888;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #888;
}

.info-item .value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.health-notes {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.note-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.note-label {
  color: #888;
  flex-shrink: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.action-card {
  background: white;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.action-card:hover {
  border-color: #ffb89a;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1);
}

.action-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.action-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  font-size: 13px;
  color: #888;
}
</style>

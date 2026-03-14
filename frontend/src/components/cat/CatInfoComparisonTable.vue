<template>
  <div class="cat-info-comparison-table">
    <div class="table-header">
      <h3>基本信息对比</h3>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else class="table-container">
      <table class="comparison-table">
        <thead>
          <tr>
            <th class="attribute-column">属性</th>
            <th v-for="cat in cats" :key="cat.cat.id" class="cat-column">
              <div class="cat-header">
                <div class="cat-avatar">
                  <img v-if="cat.cat.avatarData || cat.cat.avatar" :src="getAvatarUrl(cat.cat)" :alt="cat.cat.name" />
                  <span v-else class="avatar-placeholder">{{ cat.cat.name?.charAt(0) || '?' }}</span>
                </div>
                <span class="cat-name">{{ cat.cat.name }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="attribute-column">品种</td>
            <td v-for="cat in cats" :key="cat.cat.id" class="value-column">
              {{ cat.cat.breed || '未知' }}
            </td>
          </tr>
          <tr>
            <td class="attribute-column">性别</td>
            <td v-for="cat in cats" :key="cat.cat.id" class="value-column">
              {{ getGenderText(cat.cat.gender) }}
            </td>
          </tr>
          <tr>
            <td class="attribute-column">年龄</td>
            <td v-for="cat in cats" :key="cat.cat.id" class="value-column">
              {{ cat.cat.ageFormatted }}
            </td>
          </tr>
          <tr>
            <td class="attribute-column">当前体重</td>
            <td v-for="cat in cats" :key="cat.cat.id" class="value-column">
              <span v-if="cat.analysis">{{ cat.analysis.current.toFixed(1) }}kg</span>
              <span v-else class="no-data">-</span>
            </td>
          </tr>
          <tr>
            <td class="attribute-column">健康状态</td>
            <td v-for="cat in cats" :key="cat.cat.id" class="value-column">
              <span v-if="cat.analysis" class="status-badge" :class="cat.analysis.status">
                {{ getStatusText(cat.analysis.status) }}
              </span>
              <span v-else class="no-data">-</span>
            </td>
          </tr>
        </tbody>
      </table>
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
  // 优先使用 base64 头像数据
  if (cat.avatarData) {
    return cat.avatarData
  }
  // 其次使用文件路径
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  // 移除 /api 前缀，添加斜杠
  const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace('/api', '')
  return `${baseURL}/${cat.avatar}`
}

function getGenderText(gender: string): string {
  switch (gender) {
    case 'male': return '公'
    case 'female': return '母'
    default: return '未知'
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
.cat-info-comparison-table {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.table-header h3 {
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

.table-container {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.comparison-table thead {
  background: #fafafa;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.attribute-column {
  font-weight: 600;
  color: #666;
  min-width: 80px;
  position: sticky;
  left: 0;
  background: #fafafa;
  z-index: 10;
}

.cat-column {
  min-width: 140px;
  text-align: center;
}

.cat-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.cat-header .cat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.cat-header .cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cat-header .avatar-placeholder {
  font-size: 16px;
  color: #666;
}

.cat-header .cat-name {
  font-weight: 600;
  color: #333;
  font-size: 12px;
}

.value-column {
  text-align: center;
  color: #333;
}

.no-data {
  color: #ccc;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
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

@media (max-width: 640px) {
  .comparison-table th,
  .comparison-table td {
    padding: 10px 12px;
    font-size: 12px;
  }

  .cat-column {
    min-width: 120px;
  }
}
</style>

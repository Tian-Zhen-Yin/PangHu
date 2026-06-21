<script setup lang="ts">
/**
 * 成长记录卡片
 * 对应工具：get_growth_records
 *
 * 接收 toolOutput（{ success, total, records: [...] }），
 * 在对话流中内联渲染成长记录列表。
 */
import { computed } from 'vue'
import { getImageUrl } from '../../../utils/format.js'

const props = defineProps<{
  toolOutput: any
}>()

interface GrowthRecordItem {
  id: string
  type: string
  notes: string
  photos: string[]
  weight: number | null
  isAdoptionDay: boolean
  recordDate: string
}

const TYPE_LABEL: Record<string, string> = {
  daily: '日常',
  free: '自由',
  vaccine: '疫苗',
  deworm: '驱虫',
  healthCheck: '体检',
}

const records = computed<GrowthRecordItem[]>(() => {
  const list = props.toolOutput?.records
  return Array.isArray(list) ? list : []
})

const total = computed<number>(() => props.toolOutput?.total ?? records.value.length)

function resolveUrl(url: string): string {
  return getImageUrl(url)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div v-if="records.length > 0" class="growth-record-card">
    <div class="card-header">
      <span class="card-icon">📖</span>
      <h3 class="card-title">成长记录</h3>
      <span class="card-count">共 {{ total }} 条</span>
    </div>

    <div class="record-list">
      <div v-for="rec in records" :key="rec.id" class="record-item">
        <div class="record-meta">
          <span class="record-type">{{ TYPE_LABEL[rec.type] || rec.type }}</span>
          <span v-if="rec.isAdoptionDay" class="record-badge">领养纪念日</span>
          <span class="record-date">{{ formatDate(rec.recordDate) }}</span>
        </div>

        <p v-if="rec.notes" class="record-notes">{{ rec.notes }}</p>

        <div v-if="rec.photos && rec.photos.length > 0" class="record-photos">
          <img
            v-for="(photo, idx) in rec.photos.slice(0, 3)"
            :key="idx"
            :src="resolveUrl(photo)"
            class="record-photo"
            alt="成长记录照片"
          />
          <span v-if="rec.photos.length > 3" class="photo-more">+{{ rec.photos.length - 3 }}</span>
        </div>

        <div v-if="rec.weight" class="record-weight">⚖️ {{ rec.weight }} kg</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.growth-record-card {
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 2px solid #FFF5DC;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 22px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #8B7355;
  margin: 0;
}

.card-count {
  margin-left: auto;
  font-size: 12px;
  color: #BC8F6F;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #FFF5DC;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.record-type {
  font-size: 11px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 100%);
  color: #8B7355;
  border-radius: 10px;
}

.record-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(244, 162, 97, 0.15);
  color: #D2691E;
  border-radius: 10px;
}

.record-date {
  margin-left: auto;
  font-size: 11px;
  color: #999999;
}

.record-notes {
  font-size: 13px;
  color: #5D4E37;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.record-photos {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.record-photo {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}

.photo-more {
  font-size: 12px;
  color: #999999;
}

.record-weight {
  font-size: 12px;
  color: #8B7355;
}
</style>

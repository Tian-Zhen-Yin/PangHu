<script setup lang="ts">
import type { DashboardRecentRecord } from '../types/index.js'
import { getRecordIcon, getRecordTypeLabel } from '../utils/recordHelpers.js'
import { formatWeight, getWeightValue } from '../utils/formatters.js'

defineProps<{
  record: DashboardRecentRecord
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div class="timeline-item" @click="emit('click')">
    <div class="timeline-left">
      <div class="timeline-line" :class="{ first: isFirst, last: isLast }"></div>
      <div class="type-icon" :class="`icon-bg-${record.type}`">
        <span class="svg-icon" v-html="getRecordIcon(record.type)"></span>
      </div>
    </div>

    <div class="timeline-card">
      <div class="card-top">
        <span class="record-type" :class="`type-${record.type}`">
          {{ getRecordTypeLabel(record.originalType || record.type) }}
        </span>
        <span v-if="record.isAdoptionDay" class="anniversary-tag">纪念日</span>
        <span class="record-date">{{ record.date }}</span>
      </div>

      <div class="card-main">
        <span v-if="record.type === 'weight'" class="value-text">
          {{ getWeightValue(record) }}<span class="unit">kg</span>
        </span>
        <span v-else class="title-text">{{ record.title }}</span>

        <span v-if="record.weightChange" class="trend" :class="record.weightChange.direction">
          <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path v-if="record.weightChange.direction === 'up'" d="M12 19V5M5 12l7-7 7 7" />
            <path v-else d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          {{ formatWeight(record.weightChange.value) }}kg
        </span>

        <div v-if="record.photos && record.photos.length > 0" class="photo-strip">
          <img
            v-for="(photo, idx) in record.photos.slice(0, 2)"
            :key="idx"
            :src="photo"
            class="mini-photo"
            alt="记录照片"
          />
          <span v-if="record.photos.length > 2" class="more-photos">+{{ record.photos.length - 2 }}</span>
        </div>
      </div>

      <p v-if="record.notes" class="notes-text">{{ record.notes }}</p>
    </div>
  </div>
</template>

<style scoped>
.timeline-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
  cursor: pointer;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-left {
  position: relative;
  flex-shrink: 0;
  width: 28px;
  display: flex;
  justify-content: center;
}

.timeline-line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  bottom: -14px;
  width: 2px;
  background: var(--color-border-light);
}

.timeline-line.first { top: 14px; }
.timeline-line.last { bottom: auto; height: 14px; }

.type-icon {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--color-bg-page);
  margin-top: 2px;
}

.type-icon .svg-icon svg {
  width: 14px;
  height: 14px;
}

.type-icon.icon-bg-weight { background: var(--color-action-green); color: var(--color-success); }
.type-icon.icon-bg-vaccine { background: var(--color-action-blue); color: var(--color-info); }
.type-icon.icon-bg-general { background: var(--color-action-orange); color: var(--color-primary); }
.type-icon.icon-bg-medical { background: var(--color-action-pink); color: var(--color-danger); }

.timeline-card {
  flex: 1;
  min-width: 0;
  background: var(--color-bg-card);
  border-radius: var(--radius-xs);
  padding: 10px 12px;
  box-shadow: var(--shadow-card-normal);
  transition: all 0.2s ease;
  border: 1px solid var(--color-border-light);
}

.timeline-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary-light);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.record-type {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  line-height: 1.5;
}

.record-type.type-weight { background: var(--color-action-green); color: var(--color-success); }
.record-type.type-vaccine { background: var(--color-action-blue); color: var(--color-info); }
.record-type.type-general { background: var(--color-action-orange); color: var(--color-primary); }
.record-type.type-medical { background: var(--color-action-pink); color: var(--color-danger); }

.anniversary-tag {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: var(--color-danger);
  font-size: var(--text-xs);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.record-date {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  font-weight: var(--font-medium);
  flex-shrink: 0;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-text {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.unit {
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-text-regular);
  margin-left: 1px;
}

.title-text {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.trend .trend-icon { width: 11px; height: 11px; flex-shrink: 0; }

.trend.up { background: rgba(255, 138, 76, 0.12); color: var(--color-primary); }
.trend.down { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }

.photo-strip {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.mini-photo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--color-border-light);
}

.more-photos {
  font-size: 10px;
  color: var(--color-text-secondary);
  background: var(--color-bg-block);
  padding: 0 5px;
  height: 32px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  font-weight: var(--font-medium);
}

.notes-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: 4px 0 0 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

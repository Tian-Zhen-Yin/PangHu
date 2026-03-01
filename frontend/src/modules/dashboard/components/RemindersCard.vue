<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DashboardReminder } from '../types'
import HealthAdviceCard from '../../../components/mascot/HealthAdviceCard.vue'

defineProps<{
  reminders: DashboardReminder[]
}>()

// 默认健康小贴士
const healthTips = [
  { icon: '💧', title: '记得补水', desc: '确保猫咪有充足的干净饮用水' },
  { icon: '🧹', title: '清理环境', desc: '定期清理猫砂，保持环境干净' },
  { icon: '🐟', title: '均衡饮食', desc: '注意猫咪的饮食均衡和适量' },
  { icon: '🎾', title: '适量运动', desc: '每天陪猫咪玩耍，保持活力' }
]

const tipIndex = ref(Math.floor(Math.random() * healthTips.length))
const dailyTip = computed(() => healthTips[tipIndex.value] ?? { icon: '💡', title: '健康提示', desc: '关注猫咪健康' })
</script>

<template>
  <div class="reminders-card">
    <h3 class="card-title">📋 今日提醒</h3>

    <div v-if="reminders.length === 0" class="empty-state">
      <span class="empty-icon">✨</span>
      <span class="empty-text">今日暂无紧急提醒</span>

      <!-- 健康建议卡片 - 内嵌吉祥物 -->
      <HealthAdviceCard
        :title="dailyTip.title"
        :description="dailyTip.desc"
      />
    </div>

    <div v-else class="reminders-list">
      <div
        v-for="reminder in reminders"
        :key="reminder.id"
        class="reminder-item"
        :class="`urgency-${reminder.urgency}`"
      >
        <span class="reminder-icon">{{ reminder.icon }}</span>
        <div class="reminder-content">
          <span class="reminder-title">{{ reminder.title }}</span>
          <span class="reminder-desc">{{ reminder.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminders-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-sub);
  margin: 0 0 var(--space-md) 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg) 0;
  color: var(--color-text-sub);
}

.empty-icon {
  font-size: var(--text-2xl);
}

.empty-text {
  font-size: var(--text-xs);
  color: var(--color-text-light);
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  border-left: 3px solid transparent;
  transition: background var(--transition-base);
}

.reminder-item.urgency-high {
  border-left-color: var(--color-error);
  background: var(--color-error-light);
  opacity: 0.9;
}

.reminder-item.urgency-medium {
  border-left-color: var(--color-warning);
  background: var(--color-warning-light);
  opacity: 0.85;
}

.reminder-item.urgency-low {
  border-left-color: var(--color-success);
  background: var(--color-success-light);
  opacity: 0.8;
}

.reminder-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.reminder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.reminder-title {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.reminder-desc {
  font-size: 11px;
  color: var(--color-text-sub);
}
</style>

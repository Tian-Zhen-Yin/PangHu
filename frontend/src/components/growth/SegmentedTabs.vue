<script setup lang="ts">
import { computed } from 'vue'

interface TabItem {
  id: string
  label: string
  icon?: string
  badge?: string | number
  badgeType?: 'primary' | 'warning'
}

const props = defineProps<{
  tabs: TabItem[]
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue', 'change'])

// 计算当前激活的索引
const activeIndex = computed(() => {
  const index = props.tabs.findIndex(t => t.id === props.modelValue)
  return index === -1 ? 0 : index
})

const handleTabClick = (id: string) => {
  emit('update:modelValue', id)
  emit('change', id)
}
</script>

<template>
  <div class="segmented-tabs-container">
    <div
      class="tab-indicator"
      :style="{
        transform: `translateX(${activeIndex * 100}%)`,
        width: `${100 / tabs.length}%`
      }"
    ></div>

    <button
      v-for="(tab, index) in tabs"
      :key="tab.id"
      class="tab-btn"
      :class="{ 'is-active': activeIndex === index }"
      @click="handleTabClick(tab.id)"
    >
      <span v-if="tab.icon" class="tab-icon" v-html="tab.icon"></span>
      <span class="tab-label">{{ tab.label }}</span>

      <span v-if="tab.badge" class="tab-badge" :class="tab.badgeType">
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.segmented-tabs-container {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--color-bg);
  border-radius: 100px;
  padding: 4px;
  width: 100%;
  margin-bottom: 24px;
  user-select: none;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  height: calc(100% - 8px);
  background-color: #FFFFFF;
  border-radius: 100px;
  box-shadow: var(--shadow-xs);
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 1;
}

.tab-btn {
  flex: 1;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  background: transparent;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  transition: color 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.tab-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-icon :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.tab-btn.is-active {
  color: var(--color-text-main);
  font-weight: 600;
}

.tab-btn.is-active .tab-icon :deep(svg) {
  color: var(--color-primary);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 700;
  color: #FFF;
  background: var(--color-text-muted);
}

.tab-badge.primary {
  background: var(--color-primary);
}

.tab-badge.warning {
  background: var(--color-warning);
}
</style>
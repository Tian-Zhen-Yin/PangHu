<script setup lang="ts">
export interface GrowthStage {
  id: string
  name: string
  duration: string
}

const props = defineProps<{
  stages: GrowthStage[]
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const handleStageSelect = (id: string) => {
  if (props.modelValue !== id) {
    emit('update:modelValue', id)
    emit('change', id)
  }
}
</script>

<template>
  <div class="stage-timeline-sidebar">
    <div
      v-for="(stage, index) in stages"
      :key="stage.id"
      class="timeline-node-wrapper"
      :class="{ 'is-active': modelValue === stage.id }"
      @click="handleStageSelect(stage.id)"
    >
      <div class="axis-column">
        <div class="node-circle">{{ index + 1 }}</div>
        <div v-if="index !== stages.length - 1" class="connecting-line"></div>
      </div>

      <div class="stage-content-card">
        <h5 class="stage-name">{{ stage.name }}</h5>
        <span class="stage-duration">{{ stage.duration }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage-timeline-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.timeline-node-wrapper {
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-height: 80px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s ease;
}

.timeline-node-wrapper:hover:not(.is-active) {
  transform: translateX(4px);
}

/* 轴线系统 */
.axis-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 36px;
  flex-shrink: 0;
}

.node-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  background-color: var(--color-bg);
  color: var(--color-text-muted);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.connecting-line {
  flex: 1;
  width: 2px;
  background-color: var(--color-primary-light);
  margin: 8px 0;
  border-radius: 2px;
}

/* 卡片系统 */
.stage-content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 20px;
  border-radius: 16px;
  margin-bottom: 12px;
  background-color: transparent;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.stage-name {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-main);
  transition: color 0.3s ease;
}

.stage-duration {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 激活态 */
.timeline-node-wrapper.is-active .node-circle {
  background-color: var(--color-primary);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
  transform: scale(1.1);
}

.timeline-node-wrapper.is-active .stage-content-card {
  background-color: #FFFFFF;
  box-shadow: var(--shadow-sm);
  border-color: rgba(244, 162, 97, 0.1);
}

.timeline-node-wrapper.is-active .stage-name {
  color: var(--color-primary);
}
</style>
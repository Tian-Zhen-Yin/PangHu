<script setup lang="ts">
import MascotCharacter from '../mascot/MascotCharacter.vue'
import type { MascotExpression } from '../mascot/MascotCharacter.vue'

defineProps<{
  title: string
  description: string
  timeTag: string
  bgColor: string
  mascotExpression: MascotExpression
}>()
</script>

<template>
  <div class="milestone-card" :style="{ backgroundColor: bgColor }">
    <div class="card-content">
      <h4 class="title">{{ title }}</h4>
      <p class="description">{{ description }}</p>
      <div class="tag-row">
        <span class="week-tag">{{ timeTag }}</span>
      </div>
    </div>

    <div class="mascot-wrapper">
      <MascotCharacter
        :expression="mascotExpression"
        size="small"
        layout="inline"
        :animated="false"
      />
    </div>
  </div>
</template>

<style scoped>
.milestone-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-radius: 24px;
  padding: 20px 0 0 20px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.milestone-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.card-content {
  flex: 1;
  padding-bottom: 20px;
  padding-right: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-main);
  margin: 0 0 8px 0;
}

.description {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.week-tag {
  display: inline-block;
  background: #FFFFFF;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 100px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.mascot-wrapper {
  flex-shrink: 0;
  width: 72px;
  display: flex;
  justify-content: flex-end;
  transform: translate(8px, 4px);
}
</style>
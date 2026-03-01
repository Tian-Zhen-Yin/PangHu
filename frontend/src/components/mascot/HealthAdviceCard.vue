<script setup lang="ts">
import MascotCharacter from './MascotCharacter.vue'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="health-advice-card">
    <div class="card-content">
      <div class="card-header">
        <span class="icon">💡</span>
        <h4 class="title">{{ title }}</h4>
      </div>
      <p class="description">{{ description }}</p>
    </div>

    <div class="mascot-wrapper">
      <MascotCharacter
        expression="focused"
        size="medium"
        layout="inline"
        :animated="false"
      />
    </div>
  </div>
</template>

<style scoped>
.health-advice-card {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  /* 关键：让子元素沉底对齐，确保猫咪"坐"在卡片边框上 */
  align-items: flex-end;

  background-color: #DDF1E4;
  border-radius: var(--radius-xl);

  /* 关键：右侧和底部 padding 设为 0，让插画边缘贴合卡片 */
  padding: var(--space-lg) 0 0 var(--space-xl);
  margin-top: var(--space-lg);
  overflow: hidden;
}

.card-content {
  flex: 1;
  padding-bottom: var(--space-lg);
  padding-right: var(--space-md);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--space-sm);
}

.icon {
  font-size: var(--text-base);
}

.title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: #4A5D4E;
}

.description {
  margin: 0;
  font-size: 12px;
  color: #6B806F;
  line-height: 1.5;
}

.mascot-wrapper {
  /* 固定插画区域宽度，防止被左侧过长文本挤压 */
  flex-shrink: 0;
  width: 80px;
  display: flex;
  justify-content: flex-end;
  /* 略微右移和下移，让猫咪有一种"探出头"或自然坐落的视觉错觉 */
  transform: translate(8px, 4px);
}
</style>
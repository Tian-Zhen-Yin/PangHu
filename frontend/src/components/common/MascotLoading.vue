<script setup lang="ts">
import MascotCharacter from '../mascot/MascotCharacter.vue'

withDefaults(defineProps<{
  size?: 'small' | 'medium' | 'large'
  text?: string
}>(), {
  size: 'medium',
  text: ''
})
</script>

<template>
  <div class="mascot-loading" :class="[`size-${size}`]">
    <MascotCharacter
      expression="yawning"
      :size="size"
      :animated="true"
      :float-animation="true"
    />
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.mascot-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.loading-text {
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  margin: 0;
}

.size-small .loading-text {
  font-size: var(--text-xs);
}

.size-large .loading-text {
  font-size: var(--text-base);
}
</style>
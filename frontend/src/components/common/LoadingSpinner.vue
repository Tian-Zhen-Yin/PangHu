<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'small' | 'medium' | 'large'
  text?: string
}>(), {
  size: 'medium',
  text: ''
})
</script>

<template>
  <div class="loading-spinner" :class="[`size-${size}`]">
    <div class="spinner-ring"></div>
    <p v-if="text" class="spinner-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner-ring {
  border-radius: 50%;
  border: 3px solid #e2e8f0;
  border-top-color: #f97316;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.size-small .spinner-ring {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.size-medium .spinner-ring {
  width: 40px;
  height: 40px;
}

.size-large .spinner-ring {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.spinner-text {
  color: #64748b;
  font-size: 0.9375rem;
  margin: 0;
}

.size-small .spinner-text {
  font-size: 0.8125rem;
}

.size-large .spinner-text {
  font-size: 1rem;
}
</style>

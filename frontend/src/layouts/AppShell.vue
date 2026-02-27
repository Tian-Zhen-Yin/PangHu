<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoints } from '../composables/useBreakpoints'
import DesktopLayout from './DesktopLayout.vue'
import MobileLayout from './MobileLayout.vue'

const { isMobile } = useBreakpoints()
const layoutComponent = computed(() => isMobile.value ? MobileLayout : DesktopLayout)
</script>

<template>
  <component :is="layoutComponent">
    <slot />
  </component>
</template>

<style scoped>
/* AppShell 是响应式布局容器，本身不添加样式 */
</style>

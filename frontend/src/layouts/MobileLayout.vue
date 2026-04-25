<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppTabbar from './components/AppTabbar.vue'

const route = useRoute()

const isAiChat = computed(() => route.name === 'AIChat')
</script>

<template>
  <div class="mobile-layout">
    <AppHeader v-if="!isAiChat" />
    <main class="main-content" :class="{ 'full-bleed': isAiChat }">
      <slot />
    </main>
    <AppTabbar v-if="!isAiChat" />
  </div>
</template>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  max-width: 430px;
  margin: 0 auto;
  background: var(--color-bg, #FFF8F3);
  position: relative;
}

.main-content {
  padding: 1rem;
  padding-top: calc(56px + 1rem);
  padding-bottom: 80px;
  min-height: calc(100vh - 56px - 64px);
}

.main-content.full-bleed {
  padding: 0;
  min-height: 100vh;
}
</style>

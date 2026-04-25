<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'

const route = useRoute()
const isAiChat = computed(() => route.name === 'AIChat')
</script>

<template>
  <div class="desktop-layout">
    <AppHeader v-if="!isAiChat" />
    <div class="layout-container">
      <AppSidebar v-if="!isAiChat" />
      <main class="main-content" :class="{ 'full-bleed': isAiChat }">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.desktop-layout {
  min-height: 100vh;
  background: var(--color-bg);
}

.layout-container {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 56px;
}

.main-content {
  flex: 1;
  padding: 32px;
  padding-top: 32px;
  min-height: calc(100vh - 64px);
}

.main-content.full-bleed {
  padding: 0;
  max-width: 100%;
  min-height: 100vh;
}
</style>

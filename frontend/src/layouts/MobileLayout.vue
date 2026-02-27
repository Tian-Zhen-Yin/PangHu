<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import AppTabbar from './components/AppTabbar.vue'
</script>

<template>
  <div class="mobile-layout">
    <AppHeader />
    <main class="main-content">
      <slot />
    </main>
    <AppTabbar />
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
  padding-bottom: 80px; /* 为 TabBar 留出空间 */
  min-height: calc(100vh - 56px - 64px); /* 减去 header 和 tabbar 高度 */
}
</style>

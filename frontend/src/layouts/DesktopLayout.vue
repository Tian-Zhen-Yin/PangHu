<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
</script>

<template>
  <div class="desktop-layout">
    <AppHeader />
    <div class="layout-container">
      <AppSidebar />
      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.desktop-layout {
  min-height: 100vh;
  background: var(--color-bg, #FFF8F3);
}

.layout-container {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
}

.main-content {
  flex: 1;
  padding: 2rem;
  min-height: calc(100vh - 64px);
}
</style>

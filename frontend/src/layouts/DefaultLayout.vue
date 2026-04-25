<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '../components/common/AppHeader.vue'
import AppFooter from '../components/common/AppFooter.vue'
</script>

<template>
  <div class="app-wrapper">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 2rem 1rem;
  padding-top: calc(56px + 2rem);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>

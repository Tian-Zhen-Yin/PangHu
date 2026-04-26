<script setup lang="ts">
import AppShell from './layouts/AppShell.vue'
import Toast from './components/common/Toast.vue'
import { toast } from './composables/useToast.js'
</script>

<template>
  <AppShell>
    <router-view />
  </AppShell>
  <Toast :toasts="toast.toasts.value" @remove="toast.remove" />
</template>

<style>
#app {
  min-height: 100vh;
  font-family: var(--font-family-base);
  color: var(--color-text-main);
  background-color: var(--color-bg-page);
}
</style>

<script setup lang="ts">
import DefaultLayout from './layouts/DefaultLayout.vue'
import Toast from './components/common/Toast.vue'
import { toast } from './composables/useToast'
</script>

<template>
  <DefaultLayout>
    <router-view />
  </DefaultLayout>
  <Toast :toasts="toast.toasts.value" @remove="toast.remove" />
</template>

<style>
#app {
  min-height: 100vh;
}
</style>

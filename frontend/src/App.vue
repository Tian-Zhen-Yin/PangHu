<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppShell from './layouts/AppShell.vue'
import Toast from './components/common/Toast.vue'
import PWAInstallPrompt from './components/PWAInstallPrompt.vue'
import OfflineIndicator from './components/OfflineIndicator.vue'
import PWAUpdatePrompt from './components/PWAUpdatePrompt.vue'
import PushNotificationManager from './components/PushNotificationManager.vue'
import { toast } from './composables/useToast.js'
import { useAuthStore } from './stores/auth.js'

const authStore = useAuthStore()
const showPushNotification = ref(false)

onMounted(() => {
  // 只对登录用户显示推送通知横幅
  if (authStore.isAuthenticated) {
    // 延迟3秒显示，避免与登录页面冲突
    setTimeout(() => {
      showPushNotification.value = true
    }, 3000)
  }
})
</script>

<template>
  <!-- PWA Components -->
  <PWAInstallPrompt />
  <OfflineIndicator />
  <PWAUpdatePrompt />

  <!-- Push Notification Manager (for authenticated users) -->
  <PushNotificationManager
    v-if="showPushNotification"
    :show-banner="true"
    @enabled="showPushNotification = false"
    @dismissed="showPushNotification = false"
  />

  <!-- Main App -->
  <AppShell>
    <router-view />
  </AppShell>

  <!-- Toast Notifications -->
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

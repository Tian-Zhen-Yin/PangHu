<template>
  <transition name="el-zoom-in-top">
    <div v-if="showPrompt" class="pwa-install-prompt">
      <div class="prompt-content">
        <div class="prompt-icon">
          <img :src="iconPath" alt="哈吉咪" @error="handleImageError" />
        </div>
        <div class="prompt-text">
          <div class="prompt-title">安装哈吉咪养成计划</div>
          <div class="prompt-description">添加到主屏幕，获得更好的使用体验</div>
        </div>
        <div class="prompt-actions">
          <el-button type="primary" size="small" @click="installApp">
            立即安装
          </el-button>
          <el-button size="small" text @click="dismissPrompt">
            暂不
          </el-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage } from 'element-plus'

// State
const showPrompt = ref(false)
const deferredPrompt = ref<any>(null)

// Icon path
const iconPath = computed(() => '/icons/icon-192.png')

// Install the PWA
const installApp = async () => {
  if (!deferredPrompt.value) {
    return
  }

  // Show the install prompt
  deferredPrompt.value.prompt()

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    ElMessage.success('安装成功！感谢您使用哈吉咪养成计划')
  } else {
    ElMessage.info('您可以稍后再安装')
  }

  // Clear the deferred prompt
  deferredPrompt.value = null
  showPrompt.value = false
}

// Dismiss the prompt
const dismissPrompt = () => {
  showPrompt.value = false
  // Store dismissal in localStorage to not show again for a while
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

// Handle beforeinstallprompt event
const handleBeforeInstallPrompt = (e: Event) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()

  // Stash the event so it can be triggered later
  deferredPrompt.value = e

  // Check if user has recently dismissed the prompt
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const daysSinceDismissal = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissal < 7) {
      return // Don't show if dismissed within last 7 days
    }
  }

  // Show the prompt
  setTimeout(() => {
    showPrompt.value = true
  }, 2000) // Show after 2 seconds
}

// Handle app installed event
const handleAppInstalled = () => {
  // Clear the deferred prompt
  deferredPrompt.value = null
  showPrompt.value = false
  ElMessage.success('安装完成！')
}

// Handle image error (fallback for missing icons)
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 400px;
  width: 90%;
}

.prompt-content {
  background: linear-gradient(135deg, #FF8A4C 0%, #FFB080 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(255, 138, 76, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.prompt-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
}

.prompt-icon img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.prompt-text {
  flex: 1;
  min-width: 0;
}

.prompt-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.prompt-description {
  font-size: 13px;
  opacity: 0.9;
}

.prompt-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.prompt-actions .el-button {
  border-color: rgba(255, 255, 255, 0.5);
}

.prompt-actions .el-button--primary {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
}

.prompt-actions .el-button--primary:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .pwa-install-prompt {
    top: 10px;
  }

  .prompt-content {
    padding: 12px;
    flex-direction: column;
    text-align: center;
  }

  .prompt-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>

<template>
  <transition name="el-fade-in-linear">
    <div v-if="showUpdatePrompt" class="pwa-update-prompt">
      <div class="update-content">
        <div class="update-icon">
          <el-icon :size="24" color="#FF8A4C">
            <RefreshRight />
          </el-icon>
        </div>
        <div class="update-text">
          <div class="update-title">发现新版本</div>
          <div class="update-description">
            哈吉咪养成计划有新内容可用，点击更新按钮获取最新功能
          </div>
        </div>
        <div class="update-actions">
          <el-button type="primary" size="small" @click="updateApp" :loading="isUpdating">
            {{ isUpdating ? '更新中...' : '立即更新' }}
          </el-button>
          <el-button size="small" text @click="dismissUpdate">
            暂不
          </el-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// State
const showUpdatePrompt = ref(false)
const isUpdating = ref(false)
const updateCallback = ref<(() => void) | null>(null)

// 监听自定义更新事件
const handleUpdateAvailable = (event: Event) => {
  const customEvent = event as CustomEvent<() => void>
  updateCallback.value = customEvent.detail
  showUpdatePrompt.value = true

  // 自动显示提示（延迟2秒）
  setTimeout(() => {
    ElMessage.info('发现新版本可用，点击更新按钮获取最新功能')
  }, 2000)
}

// 更新应用
const updateApp = async () => {
  if (!updateCallback.value || isUpdating.value) return

  isUpdating.value = true

  try {
    await updateCallback.value()
    showUpdatePrompt.value = false
    ElMessage.success('更新成功！页面将重新加载...')

    // 延迟刷新，让用户看到成功消息
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    console.error('[PWA] Update failed:', error)
    ElMessage.error('更新失败，请刷新页面重试')
    isUpdating.value = false
  }
}

// 关闭更新提示
const dismissUpdate = () => {
  showUpdatePrompt.value = false
  // 记录用户选择，24小时内不再提示
  localStorage.setItem('pwa-update-dismissed', Date.now().toString())
}

// 检查是否应该显示更新提示
const shouldShowPrompt = () => {
  const dismissed = localStorage.getItem('pwa-update-dismissed')
  if (dismissed) {
    const hoursSinceDismissal = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60)
    return hoursSinceDismissal >= 24
  }
  return true
}

// 监听更新事件
onMounted(() => {
  window.addEventListener('sw-update-available', handleUpdateAvailable)

  // 检查是否应该显示提示
  if (!shouldShowPrompt()) {
    showUpdatePrompt.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('sw-update-available', handleUpdateAvailable)
})
</script>

<style scoped>
.pwa-update-prompt {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  width: calc(100% - 40px);
}

.update-content {
  background: linear-gradient(135deg, #FF8A4C 0%, #FFB080 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(255, 138, 76, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.update-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.update-text {
  flex: 1;
  min-width: 0;
}

.update-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.update-description {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.4;
}

.update-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.update-actions .el-button {
  border-color: rgba(255, 255, 255, 0.5);
}

.update-actions .el-button--primary {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
}

.update-actions .el-button--primary:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* 移动端优化 */
@media (max-width: 640px) {
  .pwa-update-prompt {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    width: auto;
  }

  .update-content {
    padding: 12px;
    flex-wrap: wrap;
  }

  .update-icon {
    width: 32px;
    height: 32px;
  }

  .update-title {
    font-size: 13px;
  }

  .update-description {
    font-size: 11px;
  }

  .update-actions {
    width: 100%;
    justify-content: stretch;
    margin-top: 8px;
  }

  .update-actions .el-button {
    flex: 1;
  }
}
</style>

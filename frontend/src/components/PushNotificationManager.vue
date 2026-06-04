<template>
  <div v-if="showBanner" class="notification-banner">
    <div class="notification-content">
      <div class="notification-icon">🔔</div>
      <div class="notification-text">
        <h3 class="notification-title">开启通知提醒</h3>
        <p class="notification-description">
          及时获取疫苗提醒、体重记录和重要健康提醒
        </p>
      </div>
    </div>
    <div class="notification-actions">
      <button @click="handleEnable" class="btn-enable" :disabled="isLoading">
        {{ isLoading ? '处理中...' : '开启通知' }}
      </button>
      <button @click="handleDismiss" class="btn-dismiss">
        暂不
      </button>
    </div>
  </div>

  <!-- 设置面板中的推送通知状态 -->
  <div v-if="showSettings" class="notification-settings">
    <div class="settings-header">
      <h4>推送通知设置</h4>
      <div :class="['status-badge', statusClass]">
        {{ statusText }}
      </div>
    </div>

    <div class="settings-content">
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-icon">🔔</span>
          <div class="setting-text">
            <div class="setting-title">疫苗提醒</div>
            <div class="setting-desc">疫苗接种时间提醒</div>
          </div>
        </div>
        <el-switch
          v-model="vaccineReminder"
          :disabled="!isSubscribed"
          @change="handleSettingChange"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-icon">⚖️</span>
          <div class="setting-text">
            <div class="setting-title">体重记录</div>
            <div class="setting-desc">定期体重测量提醒</div>
          </div>
        </div>
        <el-switch
          v-model="weightReminder"
          :disabled="!isSubscribed"
          @change="handleSettingChange"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-icon">🩺</span>
          <div class="setting-text">
            <div class="setting-title">健康建议</div>
            <div class="setting-desc">AI健康分析推送</div>
          </div>
        </div>
        <el-switch
          v-model="healthReminder"
          :disabled="!isSubscribed"
          @change="handleSettingChange"
        />
      </div>
    </div>

    <div v-if="!isSupported" class="not-supported-tip">
      您的浏览器不支持推送通知功能
    </div>
    <div v-else-if="isDenied" class="denied-tip">
      通知权限已被拒绝，请在浏览器设置中允许通知
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  getPushSubscriptionStatus
} from '../utils/pwa'

interface Props {
  showBanner?: boolean
  showSettings?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBanner: true,
  showSettings: false
})

const emit = defineEmits<{
  enabled: []
  dismissed: []
  settingsChange: [settings: NotificationSettings]
}>()

interface NotificationSettings {
  vaccineReminder: boolean
  weightReminder: boolean
  healthReminder: boolean
}

// 状态管理
const isLoading = ref(false)
const isSupported = ref(false)
const isDenied = ref(false)
const isSubscribed = ref(false)
const showBanner = ref(props.showBanner)

// 通知设置
const vaccineReminder = ref(true)
const weightReminder = ref(true)
const healthReminder = ref(true)

// 检查通知支持
onMounted(async () => {
  isSupported.value = 'Notification' in window &&
                      'serviceWorker' in navigator &&
                      'PushManager' in window

  if (!isSupported.value) {
    return
  }

  // 检查权限状态
  if (Notification.permission === 'denied') {
    isDenied.value = true
    showBanner.value = false
  } else if (Notification.permission === 'granted') {
    // 检查订阅状态
    const status = await getPushSubscriptionStatus()
    isSubscribed.value = status.isSubscribed
    showBanner.value = !status.isSubscribed
  }

  // 从本地存储加载设置
  loadSettings()
})

// 计算状态文本和样式
const statusText = computed(() => {
  if (!isSupported.value) return '不支持'
  if (isDenied.value) return '已拒绝'
  if (isSubscribed.value) return '已开启'
  return '未开启'
})

const statusClass = computed(() => {
  if (!isSupported.value || isDenied.value) return 'status-error'
  if (isSubscribed.value) return 'status-success'
  return 'status-default'
})

// 处理开启通知
async function handleEnable() {
  if (!isSupported.value) {
    emit('dismissed')
    return
  }

  isLoading.value = true

  try {
    // 请求权限
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) {
      isDenied.value = true
      showBanner.value = false
      emit('dismissed')
      return
    }

    // 订阅推送
    const subscription = await subscribeToPushNotifications()
    if (subscription) {
      isSubscribed.value = true
      showBanner.value = false
      emit('enabled')

      // 显示测试通知
      showTestNotification()
    }
  } catch (error) {
    console.error('[PushNotificationManager] Failed to enable notifications:', error)
  } finally {
    isLoading.value = false
  }
}

// 处理关闭横幅
function handleDismiss() {
  showBanner.value = false
  emit('dismissed')
}

// 处理设置变化
function handleSettingChange() {
  const settings: NotificationSettings = {
    vaccineReminder: vaccineReminder.value,
    weightReminder: weightReminder.value,
    healthReminder: healthReminder.value
  }

  // 保存到本地存储
  localStorage.setItem('notification-settings', JSON.stringify(settings))
  emit('settingsChange', settings)
}

// 加载设置
function loadSettings() {
  try {
    const saved = localStorage.getItem('notification-settings')
    if (saved) {
      const settings: NotificationSettings = JSON.parse(saved)
      vaccineReminder.value = settings.vaccineReminder ?? true
      weightReminder.value = settings.weightReminder ?? true
      healthReminder.value = settings.healthReminder ?? true
    }
  } catch (error) {
    console.error('[PushNotificationManager] Failed to load settings:', error)
  }
}

// 显示测试通知
function showTestNotification() {
  if (Notification.permission === 'granted') {
    new Notification('哈吉咪养成计划', {
      body: '通知已开启！您将收到疫苗、体重等重要提醒',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: 'test-notification'
    })
  }
}

// 暴露方法供外部调用
defineExpose({
  enable: handleEnable,
  dismiss: handleDismiss,
  isSubscribed: () => isSubscribed.value
})
</script>

<style scoped>
.notification-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-card);
  border-top: 2px solid var(--color-primary);
  padding: var(--space-lg) var(--space-xl);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  max-width: 600px;
}

.notification-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
}

.notification-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-xxs) 0;
}

.notification-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.notification-actions {
  display: flex;
  gap: var(--space-md);
}

.btn-enable,
.btn-dismiss {
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-enable {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.btn-enable:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-warm-sm);
}

.btn-enable:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-dismiss {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-dismiss:hover {
  color: var(--color-text-main);
  background: var(--color-bg-soft);
}

/* 设置面板样式 */
.notification-settings {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
}

.settings-header h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.status-badge {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.status-success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.status-error {
  background: var(--color-error-soft);
  color: var(--color-error);
}

.status-default {
  background: var(--color-bg-soft);
  color: var(--color-text-secondary);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: var(--color-bg-soft);
  border-radius: var(--radius-md);
}

.setting-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.setting-icon {
  font-size: 24px;
}

.setting-text {
  flex: 1;
}

.setting-title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
  margin-bottom: var(--space-xxs);
}

.setting-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.not-supported-tip,
.denied-tip {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--color-warning-soft);
  color: var(--color-warning-dark);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  text-align: center;
}

.denied-tip {
  background: var(--color-error-soft);
  color: var(--color-error-dark);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .notification-banner {
    padding: var(--space-md);
  }

  .notification-content {
    flex-direction: column;
    text-align: center;
  }

  .notification-actions {
    width: 100%;
  }

  .btn-enable,
  .btn-dismiss {
    flex: 1;
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-sm);
  }
}
</style>

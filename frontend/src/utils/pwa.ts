/**
 * PWA Service Worker Registration and Update Management
 *
 * This file handles Service Worker registration, update detection,
 * and offline status monitoring for the Progressive Web App.
 */

// Service Worker update callback types
type UpdateCallback = (registration: ServiceWorkerRegistration) => void
type OfflineCallback = (online: boolean) => void

// Update checking interval (5 minutes)
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000

/**
 * 检查是否在生产环境
 */
const isProduction = import.meta.env.PROD

/**
 * 创建开发模式下的 mock PWA 实现
 */
function createMockPWAImplementation(): {
  updateServiceWorker: () => Promise<void>
  closeUpdatePrompt: () => void
  notifyUpdateAvailable: (updateFn: () => void) => void
} {
  console.log('[PWA] Running in development mode - using mock implementation')

  let updateReadyCallback: UpdateCallback | null = null

  return {
    updateServiceWorker: async () => {
      console.log('[PWA] Dev mode - Service Worker update skipped')
    },
    closeUpdatePrompt: () => {
      updateReadyCallback = null
    },
    notifyUpdateAvailable: (updateFn: () => void) => {
      console.log('[PWA] Dev mode - Update notification suppressed')
      updateReadyCallback = updateFn as any
    }
  }
}

/**
 * Register Service Worker with comprehensive update handling
 *
 * Note: Uses dynamic import to handle development mode where
 * virtual:pwa-register module may not be available
 */
export async function registerServiceWorker(): Promise<{
  updateServiceWorker: () => Promise<void>
  closeUpdatePrompt: () => void
  notifyUpdateAvailable: (updateFn: () => void) => void
}> {
  // 开发模式下直接返回 mock 实现
  if (!isProduction) {
    return createMockPWAImplementation()
  }

  let updateReadyCallback: UpdateCallback | null = null

  try {
    // 动态导入 PWA 注册模块（仅在生产环境）
    const { registerSW } = await import('virtual:pwa-register')

    const updateSW = registerSW({
    onNeedRefresh() {
      console.log('[PWA] New content available, refresh required')
      // Trigger update prompt callback
      if (updateReadyCallback) {
        updateReadyCallback(true as any)
      }
      // Also dispatch custom event for PWAUpdatePrompt component
      window.dispatchEvent(new CustomEvent('sw-update-available', {
        detail: async () => {
          await updateSW(true)
        }
      }))
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline')
      // Show offline ready notification
      showNotification('离线模式已启用', '您现在可以离线使用应用')
    },
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('[PWA] Service Worker registered successfully')

      // Set up periodic update checking
      if (registration) {
        setInterval(() => {
          console.log('[PWA] Checking for updates...')
          registration.update()
        }, UPDATE_CHECK_INTERVAL)
      }
    },
    onRegisterError(error: any) {
      console.error('[PWA] Service Worker registration failed:', error)
    }
  })

    return {
      updateServiceWorker: async () => {
        await updateSW(true)
      },
      closeUpdatePrompt: () => {
        updateReadyCallback = null
      },
      notifyUpdateAvailable: (updateFn: () => void) => {
        updateReadyCallback = updateFn as any
      }
    }
  } catch (error) {
    // 如果动态导入失败（开发模式下模块不可用），返回模拟实现
    console.warn('[PWA] Service Worker not available in this environment:', error)

    return {
      updateServiceWorker: async () => {
        console.log('[PWA] Update skipped - SW not available')
      },
      closeUpdatePrompt: () => {
        updateReadyCallback = null
      },
      notifyUpdateAvailable: (updateFn: () => void) => {
        console.log('[PWA] Update notification suppressed - SW not available')
      }
    }
  }
}

/**
 * Monitor online/offline status
 */
export function monitorOnlineStatus(callback: OfflineCallback): () => void {
  const handleOnline = () => {
    console.log('[PWA] Connection restored')
    callback(true)
  }

  const handleOffline = () => {
    console.log('[PWA] Connection lost')
    callback(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Check if app is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Get Service Worker registration if available
 */
export async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration || null
  }
  return null
}

/**
 * Force immediate SW update check
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    const registration = await getSWRegistration()
    if (registration) {
      await registration.update()
      return true
    }
  } catch (error) {
    console.error('[PWA] Failed to check for updates:', error)
  }
  return false
}

/**
 * Show browser notification (if permission granted)
 */
function showNotification(title: string, body: string) {
  // Check if Notification API is available
  if ('Notification' in window && Notification.permission === 'granted') {
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-512.png',
      tag: 'pwa-notification',
      renotify: true
    }

    try {
      const notification = new Notification(title, options)
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('[PWA] Notification failed:', error)
    }
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notification API not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const registration = await getSWRegistration()
    if (!registration) {
      console.error('[PWA] No Service Worker registration found')
      return null
    }

    // Check if push manager is available
    if (!registration.pushManager) {
      console.error('[PWA] Push Manager not available')
      return null
    }

    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('[PWA] Already subscribed to push notifications')
      return existingSubscription
    }

    // Create new subscription
    // Note: In production, you need to use real VAPID keys from your server
    const applicationServerKey = urlBase64ToUint8Array(
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib37-Y8XLwfQ6gThfCy-3q9fWCPO5_PZ8q15JI0oJvLqUEQiVTL0GB6SL_w' // Placeholder VAPID key
    ) as ArrayBuffer

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })

    console.log('[PWA] Push notification subscription successful')

    // In production, send subscription to server here
    // await sendSubscriptionToServer(subscription)

    return subscription
  } catch (error) {
    console.error('[PWA] Push notification subscription failed:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await getSWRegistration()
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      console.log('[PWA] Unsubscribed from push notifications')

      // In production, notify server to remove subscription
      // await removeSubscriptionFromServer(subscription)

      return true
    }
    return false
  } catch (error) {
    console.error('[PWA] Failed to unsubscribe from push notifications:', error)
    return false
  }
}

/**
 * Get current push subscription status
 */
export async function getPushSubscriptionStatus(): Promise<{
  isSubscribed: boolean
  subscription: PushSubscription | null
}> {
  try {
    const registration = await getSWRegistration()
    if (!registration) {
      return { isSubscribed: false, subscription: null }
    }

    const subscription = await registration.pushManager.getSubscription()
    return {
      isSubscribed: !!subscription,
      subscription
    }
  } catch (error) {
    console.error('[PWA] Failed to get push subscription status:', error)
    return { isSubscribed: false, subscription: null }
  }
}

/**
 * Convert base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

/**
 * Get PWA installation status
 */
export function getPWAInstallStatus(): {
  isInstalled: boolean
  canInstall: boolean
  isRunningStandalone: boolean
} {
  const isInstalled = isPWAInstalled()
  const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iOS = /(iPad|iPhone|iPod)/.test(navigator.userAgent) && !(window as any).MSStream
  const isInApp = iOS && (window.navigator as any).standalone === true

  // Check if install prompt is available (approximate)
  const canInstall = !isInstalled && 'serviceWorker' in navigator && 'beforeinstallprompt' in window

  return {
    isInstalled,
    canInstall,
    isRunningStandalone: isRunningStandalone || isInApp
  }
}


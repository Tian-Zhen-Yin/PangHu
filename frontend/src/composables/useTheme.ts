/**
 * 主题管理 composable
 */

import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'app-theme'
const currentTheme = ref<Theme>(getStoredTheme())

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'light'
}

function applyTheme(theme: Theme): void {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

export function useTheme() {
  const theme = ref(currentTheme)

  // 设置主题
  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  // 切换主题（light <-> dark）
  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  // 获取当前实际应用的主题
  function getEffectiveTheme(): 'light' | 'dark' {
    if (theme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme.value
  }

  // 是否为深色模式
  const isDark = ref(getEffectiveTheme() === 'dark')

  // 监听主题变化
  watch(theme, () => {
    isDark.value = getEffectiveTheme() === 'dark'
  })

  // 监听系统主题变化
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'auto') {
        isDark.value = mediaQuery.matches
        applyTheme('auto')
      }
    })
  })

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    getEffectiveTheme
  }
}

// 导出全局单例
export const themeManager = useTheme()

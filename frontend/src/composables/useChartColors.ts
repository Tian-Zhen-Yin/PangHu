/**
 * 图表颜色 composable
 * 从 CSS 自定义属性中读取设计令牌，供 ECharts 使用
 */

export function useChartColors() {
  const root = document.documentElement
  const s = getComputedStyle(root)

  function get(name: string): string {
    return s.getPropertyValue(name).trim()
  }

  return {
    primary: get('--color-primary'),
    primaryMedium: get('--color-primary-medium'),
    primaryDark: get('--color-primary-dark'),
    success: get('--color-success'),
    danger: get('--color-danger'),
    warning: get('--color-warning'),
    info: get('--color-info'),
    textPrimary: get('--color-text-primary'),
    textSecondary: get('--color-text-secondary'),
    borderLight: get('--color-border-light'),
    bgPage: get('--color-bg-page'),
    bgCard: get('--color-bg-card'),
  }
}

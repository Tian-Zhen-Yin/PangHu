<script setup lang="ts">
import { computed } from 'vue'
import MascotCharacter from '../mascot/MascotCharacter.vue'
import type { MascotExpression } from '../mascot/MascotCharacter.vue'

// 提醒类型
export type ReminderType =
  | 'vaccine'      // 疫苗提醒
  | 'weight'       // 体重异常
  | 'health'       // 健康检查
  | 'record'       // 记录提醒
  | 'achievement'  // 成就解锁
  | 'custom'       // 自定义

// 趋势方向
export type TrendDirection = 'up' | 'down' | 'stable'

// 操作按钮
export interface ActionButton {
  label: string
  type?: 'primary' | 'secondary' | 'outline'
  handler: () => void
  icon?: string // SVG path string
}

// 趋势数据
export interface TrendData {
  direction: TrendDirection
  value: string // e.g. "+0.3kg", "-0.2kg"
  status: 'normal' | 'warning' | 'danger'
}

interface Props {
  type: ReminderType
  title: string
  message: string
  expression?: MascotExpression
  actions?: ActionButton[]
  trend?: TrendData
  priority?: 'low' | 'medium' | 'high'
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expression: 'default',
  actions: () => [],
  priority: 'medium',
  dismissible: true
})

const emit = defineEmits<{
  dismiss: []
}>()

// 根据类型获取默认表情
const defaultExpression = computed<MascotExpression>(() => {
  const expressions: Record<ReminderType, MascotExpression> = {
    vaccine: 'waiting',
    weight: 'confused',
    health: 'focused',
    record: 'waiting',
    achievement: 'excited',
    custom: 'default'
  }
  return expressions[props.type]
})

// 当前使用的表情
const currentExpression = computed(() => props.expression || defaultExpression.value)

// 优先级颜色映射
const priorityColors = {
  low: {
    border: '#E5E7EB',
    badge: '#F3F4F6',
    text: '#6B7280'
  },
  medium: {
    border: '#FED7AA',
    badge: '#FFF7ED',
    text: '#F4A261'
  },
  high: {
    border: '#FECACA',
    badge: '#FEF2F2',
    text: '#EF4444'
  }
}

// 趋势图标
const trendIcon = computed(() => {
  switch (props.trend?.direction) {
    case 'up':
      return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    case 'down':
      return 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
    case 'stable':
      return 'M5 12h14'
    default:
      return ''
  }
})

// 趋势颜色
const trendColor = computed(() => {
  if (!props.trend) return '#6B7280'
  switch (props.trend.status) {
    case 'normal':
      return '#22C55E'
    case 'warning':
      return '#F59E0B'
    case 'danger':
      return '#EF4444'
    default:
      return '#6B7280'
  }
})

// 优先级标签
const priorityLabel = computed(() => {
  const labels = {
    low: '提示',
    medium: '提醒',
    high: '重要'
  }
  return labels[props.priority]
})

// 卡片样式
const cardStyle = computed(() => ({
  borderColor: priorityColors[props.priority].border
}))

const badgeStyle = computed(() => ({
  backgroundColor: priorityColors[props.priority].badge,
  color: priorityColors[props.priority].text
}))
</script>

<template>
  <div class="scenario-reminder" :style="cardStyle">
    <!-- 关闭按钮 -->
    <button
      v-if="dismissible"
      class="dismiss-btn"
      @click="emit('dismiss')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>

    <!-- 左侧：吉祥物 -->
    <div class="reminder-mascot">
      <MascotCharacter
        :expression="currentExpression"
        size="large"
        :animated="true"
        :clickable="false"
      />
    </div>

    <!-- 右侧：内容 -->
    <div class="reminder-content">
      <!-- 标题行 -->
      <div class="reminder-header">
        <div class="header-left">
          <span class="priority-badge" :style="badgeStyle">{{ priorityLabel }}</span>
          <h3 class="reminder-title">{{ title }}</h3>
        </div>
        <!-- 趋势指示器 -->
        <div v-if="trend" class="trend-indicator" :style="{ color: trendColor }">
          <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
          <span class="trend-value">{{ trend.value }}</span>
        </div>
      </div>

      <!-- 消息内容 -->
      <p class="reminder-message">{{ message }}</p>

      <!-- 操作按钮 -->
      <div v-if="actions.length > 0" class="reminder-actions">
        <button
          v-for="(action, index) in actions"
          :key="index"
          :class="['action-btn', action.type || 'secondary']"
          @click="action.handler"
        >
          <svg v-if="action.icon" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenario-reminder {
  position: relative;
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(145deg, #FFFFFF 0%, #FFFBF7 100%);
  border: 1.5px solid;
  border-radius: 20px;
  box-shadow:
    0 4px 16px rgba(244, 162, 97, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.scenario-reminder:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(244, 162, 97, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 关闭按钮 */
.dismiss-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #F3F4F6;
  border-radius: 50%;
  cursor: pointer;
  color: #9CA3AF;
  transition: all 0.2s;
}

.dismiss-btn:hover {
  background: #E5E7EB;
  color: #6B7280;
}

.dismiss-btn svg {
  width: 14px;
  height: 14px;
}

/* 吉祥物区域 */
.reminder-mascot {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFFBF7 0%, #FFF7ED 100%);
  border-radius: 16px;
  border: 1px solid #FED7AA;
}

/* 内容区域 */
.reminder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 标题行 */
.reminder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.priority-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reminder-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 趋势指示器 */
.trend-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #FAF8F5;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.trend-icon {
  width: 14px;
  height: 14px;
}

.trend-value {
  font-weight: 700;
}

/* 消息内容 */
.reminder-message {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.6;
  margin: 0;
}

/* 操作按钮 */
.reminder-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1.5px solid;
}

.action-btn.primary {
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  border-color: #F4A261;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.25);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 162, 97, 0.35);
}

.action-btn.secondary {
  background: #FFFFFF;
  border-color: #F5F0E8;
  color: #374151;
}

.action-btn.secondary:hover {
  background: #FFF7ED;
  border-color: #F4A261;
  color: #F4A261;
}

.action-btn.outline {
  background: transparent;
  border-color: #E5E7EB;
  color: #6B7280;
}

.action-btn.outline:hover {
  border-color: #9CA3AF;
  color: #374151;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .scenario-reminder {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .reminder-mascot {
    width: 64px;
    height: 64px;
    align-self: center;
  }

  .reminder-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .trend-indicator {
    align-self: flex-start;
  }

  .reminder-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

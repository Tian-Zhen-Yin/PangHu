<script setup lang="ts">
/**
 * 健康周报卡片
 * 对应工具：GENERATE_health_report
 *
 * P2 核心版本：体重 SVG 折线图 + 评分环形图 + 本周亮点
 * P4 增强：健康建议列表 + 待办事项（带勾选、乐观更新、后端持久化）
 * 活动量维度显示"暂未接入"（数据源未就绪）
 */
import { computed, ref } from 'vue'
import type { HealthWeeklyReport } from '../../types/chat.js'

const props = defineProps<{
  toolOutput: any
}>()

const emit = defineEmits<{
  (e: 'todo', payload: { todoId: string; completed: boolean }): void
}>()

const report = computed<HealthWeeklyReport | null>(() => {
  const out = props.toolOutput
  if (!out || !out.success || !out.report) return null
  return out.report as HealthWeeklyReport
})

// ---- 本地待办状态（乐观更新） ----
const localTodoState = ref<Record<string, boolean>>({})

function getTodoCompleted(todo: { id: string; completed: boolean }): boolean {
  return localTodoState.value[todo.id] ?? todo.completed
}

function onTodoToggle(todo: { id: string; completed: boolean }) {
  const current = getTodoCompleted(todo)
  localTodoState.value[todo.id] = !current
  emit('todo', { todoId: todo.id, completed: !current })
}

// ---- 建议排序（高优先级 → 中 → 低） ----
const sortedSuggestions = computed(() => {
  const order = { high: 0, medium: 1, low: 2 }
  return [...(report.value?.suggestions || [])].sort((a, b) => order[a.priority] - order[b.priority])
})

// ---- 体重折线图计算 ----
const chartWidth = 280
const chartHeight = 120

const weightPoints = computed(() => {
  const records = report.value?.weightTrend?.dailyRecords
  if (!records || records.length === 0) return ''
  return records
    .map((r, idx) => `${getX(idx)},${getY(r.weight)}`)
    .join(' ')
})

const xLabels = computed(() => {
  const records = report.value?.weightTrend?.dailyRecords
  if (!records) return []
  return records.map((r, idx) => ({
    left: records.length > 1 ? (idx / (records.length - 1)) * 100 : 50,
    text: formatShortDate(r.date),
  }))
})

function getX(idx: number): number {
  const total = report.value?.weightTrend?.dailyRecords?.length || 1
  if (total <= 1) return chartWidth / 2
  return (idx / (total - 1)) * chartWidth
}

function getY(weight: number): number {
  const range = report.value?.weightTrend?.standardRange
  const records = report.value?.weightTrend?.dailyRecords || []
  const min = range?.min ?? Math.min(...records.map((r) => r.weight))
  const max = range?.max ?? Math.max(...records.map((r) => r.weight))
  const padding = 10
  const span = max - min || 1
  return chartHeight - padding - ((weight - min) / span) * (chartHeight - 2 * padding)
}

// ---- 评分环形图 ----
const scoreColor = computed(() => {
  const score = report.value?.healthScore.total ?? 0
  if (score >= 90) return '#4CAF50'
  if (score >= 75) return '#FFA726'
  if (score >= 60) return '#FF7043'
  return '#E53935'
})

const scoreDashLength = computed(() => {
  return ((report.value?.healthScore.total ?? 0) / 100) * 314
})

const scoreLevelText = computed(() => {
  switch (report.value?.healthScore.level) {
    case 'excellent': return '优秀'
    case 'good': return '良好'
    case 'fair': return '一般'
    case 'poor': return '需关注'
    default: return ''
  }
})

// ---- 体重趋势文本 ----
const trendText = computed(() => {
  const wt = report.value?.weightTrend
  if (!wt) return null
  const sign = (wt.changePercent ?? 0) >= 0 ? '+' : ''
  return {
    change: `${sign}${(wt.changePercent ?? 0).toFixed(2)}%`,
    direction: wt.trend === 'up' ? '上升' : wt.trend === 'down' ? '下降' : '稳定',
  }
})

// ---- 日期格式化 ----
function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

function formatShortDate(date: string): string {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---- 评分项标签 ----
const scoreItemLabel: Record<string, string> = {
  weight: '体重指标',
  vaccine: '疫苗状态',
  allergy: '过敏状况',
}

// ---- 优先级中文映射 ----
const priorityLabel: Record<string, { text: string; cls: string }> = {
  high: { text: '高优先', cls: 'priority-high' },
  medium: { text: '中优先', cls: 'priority-medium' },
  low: { text: '低优先', cls: 'priority-low' },
}

// ---- 分类图标映射 ----
const categoryIcon: Record<string, string> = {
  diet: '🍽️',
  exercise: '🏃',
  vaccine: '💉',
  allergy: '🤧',
  general: '📌',
  checkup: '🏥',
}
</script>

<template>
  <div v-if="report" class="health-report-card">
    <!-- 头部 -->
    <div class="report-header">
      <div class="report-title">
        <span class="report-icon">📊</span>
        <span>{{ report.catInfo.name }}的健康周报</span>
      </div>
      <div class="report-date">
        {{ formatDateRange(report.timeRange.startDate, report.timeRange.endDate) }}
      </div>
    </div>

    <!-- 体重趋势图 -->
    <div v-if="report.weightTrend" class="weight-section">
      <div class="section-label">📈 体重趋势</div>
      <div class="weight-chart-wrapper">
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="weight-chart">
          <rect
            v-if="report.weightTrend.standardRange"
            :x="0"
            :y="getY(report.weightTrend.standardRange.max)"
            :width="chartWidth"
            :height="getY(report.weightTrend.standardRange.min) - getY(report.weightTrend.standardRange.max)"
            fill="rgba(255, 228, 181, 0.2)"
            stroke="#FFD8A8"
            stroke-dasharray="4,4"
          />
          <polyline
            :points="weightPoints"
            fill="none"
            stroke="#E8924A"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="(point, idx) in report.weightTrend.dailyRecords"
            :key="idx"
            :cx="getX(idx)"
            :cy="getY(point.weight)"
            r="3.5"
            fill="#E8924A"
          />
        </svg>
        <div class="x-labels">
          <span
            v-for="(label, idx) in xLabels"
            :key="idx"
            :style="{ left: `${label.left}%` }"
          >{{ label.text }}</span>
        </div>
      </div>
      <div v-if="trendText" class="weight-summary">
        当前 {{ report.weightTrend.currentWeight }}{{ report.weightTrend.unit }}
        <span class="trend-badge" :class="report.weightTrend.trend">{{ trendText.change }} · {{ trendText.direction }}</span>
      </div>
      <div v-if="report.weightTrend.standardRange" class="weight-standard">
        标准范围：{{ report.weightTrend.standardRange.min }} - {{ report.weightTrend.standardRange.max }}{{ report.weightTrend.unit }}
      </div>
    </div>

    <!-- 评分 + 活动量 -->
    <div class="score-row">
      <div class="score-card">
        <div class="section-label">🎯 健康评分</div>
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#F8E8D8" stroke-width="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              :stroke="scoreColor" stroke-width="10"
              :stroke-dasharray="`${scoreDashLength} 314`"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div class="score-text">
            <span class="score-value">{{ report.healthScore.total }}</span>
            <span class="score-max">/100</span>
            <span class="score-level">{{ scoreLevelText }}</span>
          </div>
        </div>
        <div class="breakdown-list">
          <div
            v-for="(item, key) in report.healthScore.breakdown"
            :key="key"
            class="breakdown-item"
          >
            <span class="breakdown-label">{{ scoreItemLabel[key] || key }}</span>
            <div class="breakdown-bar">
              <div class="bar-bg">
                <div class="bar-fill" :style="{ width: `${(item.score / item.maxScore) * 100}%` }"></div>
              </div>
              <span class="breakdown-score">{{ item.score }}/{{ item.maxScore }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="activity-card">
        <div class="section-label">🏃 活动量</div>
        <div class="activity-placeholder">
          <span class="placeholder-icon">📋</span>
          <span class="placeholder-text">暂未接入活动量数据</span>
          <span class="placeholder-hint">评分已按体重/疫苗/过敏动态计算</span>
        </div>
      </div>
    </div>

    <!-- 本周亮点 -->
    <div v-if="report.highlights.length > 0" class="highlights-section">
      <div class="section-label">🔔 本周亮点</div>
      <div class="highlights-list">
        <div
          v-for="(item, idx) in report.highlights"
          :key="idx"
          :class="['highlight-item', item.type]"
        >
          <span class="highlight-icon">
            {{ item.type === 'positive' ? '✅' : item.type === 'warning' ? '⚠️' : 'ℹ️' }}
          </span>
          <div class="highlight-body">
            <div class="highlight-title">{{ item.title }}</div>
            <div class="highlight-detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- P4: 健康建议 -->
    <div v-if="sortedSuggestions.length > 0" class="suggestions-section">
      <div class="section-label">💡 本周健康建议</div>
      <div class="suggestions-list">
        <div
          v-for="(item, idx) in sortedSuggestions"
          :key="idx"
          class="suggestion-item"
        >
          <span class="suggestion-icon">{{ categoryIcon[item.category] || '📌' }}</span>
          <div class="suggestion-body">
            <div class="suggestion-header">
              <span class="suggestion-title">{{ item.title }}</span>
              <span :class="['priority-badge', priorityLabel[item.priority]?.cls]">
                {{ priorityLabel[item.priority]?.text }}
              </span>
            </div>
            <div class="suggestion-detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- P4: 待办事项 -->
    <div v-if="report.toDoList.length > 0" class="todo-section">
      <div class="section-label">✅ 本周待办</div>
      <div class="todo-list">
        <div
          v-for="(item, idx) in report.toDoList"
          :key="item.id"
          class="todo-item"
        >
          <button
            class="todo-checkbox"
            :class="{ checked: getTodoCompleted(item) }"
            @click="onTodoToggle(item)"
            :title="getTodoCompleted(item) ? '标记未完成' : '标记完成'"
          >
            <span v-if="getTodoCompleted(item)" class="check-icon">✓</span>
          </button>
          <span class="todo-icon">{{ categoryIcon[item.category] || '📌' }}</span>
          <span class="todo-text" :class="{ done: getTodoCompleted(item) }">
            {{ item.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.health-report-card {
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  border-radius: 16px;
  padding: 20px;
  border: 1.5px solid #FFE8D6;
  box-shadow: 0 4px 12px rgba(255, 200, 150, 0.15);
  grid-column: 1 / -1;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.report-title {
  font-size: 16px;
  font-weight: 700;
  color: #5D4E37;
  display: flex;
  align-items: center;
  gap: 6px;
}
.report-icon { font-size: 18px }
.report-date {
  font-size: 12px;
  color: #BC8F6F;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #8B7355;
  margin-bottom: 10px;
}

/* 体重图表 */
.weight-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.weight-chart-wrapper { position: relative }
.weight-chart { width: 100%; height: auto; display: block }
.x-labels {
  position: relative;
  height: 16px;
  margin-top: 4px;
}
.x-labels span {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  color: #B59E82;
}
.weight-summary {
  margin-top: 8px;
  font-size: 13px;
  color: #5D4E37;
}
.trend-badge {
  margin-left: 8px;
  font-weight: 600;
  font-size: 12px;
}
.trend-badge.up { color: #FF7043 }
.trend-badge.down { color: #42A5F5 }
.trend-badge.stable { color: #66BB6A }
.weight-standard {
  font-size: 11px;
  color: #BC8F6F;
  margin-top: 2px;
}

/* 评分行 */
.score-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.score-card, .activity-card {
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  border-radius: 12px;
}

/* 评分环形图 */
.score-ring {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 6px 0;
}
.score-ring svg { width: 100px; height: 100px }
.score-text {
  position: absolute;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-value { font-size: 24px; font-weight: 700; color: #5D4E37 }
.score-max { font-size: 12px; color: #BC8F6F }
.score-level { font-size: 11px; color: #8B7355; margin-top: 2px }

/* 评分明细 */
.breakdown-list { margin-top: 8px }
.breakdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
}
.breakdown-label {
  color: #8B7355;
  width: 60px;
  flex-shrink: 0;
}
.breakdown-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.bar-bg {
  flex: 1;
  height: 6px;
  background: #F8E8D8;
  border-radius: 3px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8924A, #FFA726);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.breakdown-score {
  color: #8B7355;
  font-weight: 600;
  font-size: 10px;
}

/* 活动量占位 */
.activity-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
  gap: 4px;
  text-align: center;
}
.placeholder-icon { font-size: 24px; opacity: 0.6 }
.placeholder-text {
  font-size: 12px;
  color: #BC8F6F;
  font-weight: 500;
}
.placeholder-hint {
  font-size: 10px;
  color: #D7CCC8;
}

/* 亮点 */
.highlights-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.highlights-list { display: flex; flex-direction: column; gap: 8px }
.highlight-item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
}
.highlight-item.positive { background: rgba(76, 175, 80, 0.06) }
.highlight-item.warning { background: rgba(229, 57, 53, 0.06) }
.highlight-item.neutral { background: rgba(255, 167, 38, 0.06) }
.highlight-icon { flex-shrink: 0 }
.highlight-body {}
.highlight-title {
  font-weight: 600;
  color: #5D4E37;
  margin-bottom: 2px;
}
.highlight-detail { color: #8B7355; font-size: 11px }

/* P4: 健康建议 */
.suggestions-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.suggestions-list { display: flex; flex-direction: column; gap: 8px }
.suggestion-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 228, 181, 0.3);
}
.suggestion-icon { flex-shrink: 0; font-size: 14px }
.suggestion-body { flex: 1; min-width: 0 }
.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.suggestion-title {
  font-size: 13px;
  font-weight: 600;
  color: #5D4E37;
}
.suggestion-detail {
  font-size: 11px;
  color: #8B7355;
  line-height: 1.5;
}
.priority-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}
.priority-high {
  background: rgba(229, 57, 53, 0.1);
  color: #E53935;
}
.priority-medium {
  background: rgba(255, 167, 38, 0.12);
  color: #E8924A;
}
.priority-low {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

/* P4: 待办事项 */
.todo-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 14px;
  border-radius: 12px;
}
.todo-list { display: flex; flex-direction: column; gap: 6px }
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.todo-item:hover { background: rgba(255, 228, 181, 0.15) }
.todo-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #E8D5C0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
}
.todo-checkbox:hover {
  border-color: #E8924A;
  background: rgba(232, 146, 74, 0.08);
}
.todo-checkbox.checked {
  background: #4CAF50;
  border-color: #4CAF50;
}
.check-icon {
  color: white;
  font-size: 11px;
  font-weight: 700;
}
.todo-icon { font-size: 12px; flex-shrink: 0 }
.todo-text {
  font-size: 12px;
  color: #5D4E37;
  transition: color 0.2s;
}
.todo-text.done {
  color: #B59E82;
  text-decoration: line-through;
}

/* 响应式 */
@media (max-width: 640px) {
  .score-row { grid-template-columns: 1fr }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import MascotCharacter, { type MascotExpression } from '../mascot/MascotCharacter.vue'
import WeightSparkline from '../record/WeightSparkline.vue'

interface RecordItem {
  id: string
  catId: string
  catName: string
  type: string
  title: string
  date: string
  icon: string
}

interface Props {
  records: RecordItem[]
  catName?: string
}

const props = withDefaults(defineProps<Props>(), {
  catName: '猫咪'
})

// 提取体重数据用于趋势图
const weightData = computed(() => {
  return props.records
    .filter(r => {
      if (r.type === 'weight') return true
      if (r.title.includes('体重') || r.title.includes('kg')) return true
      return false
    })
    .slice(0, 10)
    .map(r => {
      const match = r.title.match(/(\d+\.?\d*)\s*kg/)
        || r.title.match(/体重[：:]\s*(\d+\.?\d*)/)
        || r.title.match(/(\d+\.?\d*)/)
      const weight = match?.[1] ? parseFloat(match[1]) : 0
      return {
        weight: isNaN(weight) ? 0 : weight,
        date: r.date
      }
    })
    .filter(r => r.weight > 0)
})

// 最新体重
const latestWeight = computed(() => {
  if (weightData.value.length === 0) return '--'
  const lastItem = weightData.value[weightData.value.length - 1]
  return lastItem ? lastItem.weight.toFixed(1) : '--'
})

// 最大最小值
const minWeight = computed(() => {
  if (weightData.value.length === 0) return 0
  return Math.min(...weightData.value.map(w => w.weight))
})

const maxWeight = computed(() => {
  if (weightData.value.length === 0) return 0
  return Math.max(...weightData.value.map(w => w.weight))
})

// 计算体重变化和表情
const recordsWithDiff = computed(() => {
  return props.records.slice(0, 8).map((r, index) => {
    let weight = 0
    let diff = 0
    let expression: MascotExpression = 'default'

    const match = r.title.match(/(\d+\.?\d*)\s*kg/)
      || r.title.match(/体重[：:]\s*(\d+\.?\d*)/)
      || r.title.match(/(\d+\.?\d*)/)
    weight = match?.[1] ? parseFloat(match[1]) : 0

    if (index < props.records.length - 1) {
      const nextRecord = props.records[index + 1]
      const nextMatch = nextRecord?.title.match(/(\d+\.?\d*)\s*kg/)
        || nextRecord?.title.match(/体重[：:]\s*(\d+\.?\d*)/)
        || nextRecord?.title.match(/(\d+\.?\d*)/)
      const nextWeight = nextMatch?.[1] ? parseFloat(nextMatch[1]) : weight
      diff = weight - nextWeight

      if (diff > 0.3) expression = 'happy'
      else if (diff < -0.3) expression = 'confused'
      else expression = 'default'
    } else {
      expression = 'focused'
    }

    return { ...r, weight, diff, expression }
  })
})

// AI 提示
const aiTip = computed(() => {
  if (weightData.value.length < 2) return '记录体重变化，了解成长轨迹'
  const lastItem = weightData.value[weightData.value.length - 1]
  const firstItem = weightData.value[0]
  if (!lastItem || !firstItem) return '记录体重变化，了解成长轨迹'
  const latest = lastItem.weight
  const first = firstItem.weight
  const change = latest - first

  if (change > 1) return `${props.catName}最近长肉肉啦！体重增加了 ${change.toFixed(1)}kg`
  if (change < -1) return `${props.catName}体重下降了 ${Math.abs(change).toFixed(1)}kg，要注意营养补充哦`
  return `${props.catName}的体重保持得很稳定，继续加油！`
})

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    weight: '体重',
    vaccine: '疫苗',
    general: '日常'
  }
  return labels[type] || '日常'
}
</script>

<template>
  <div class="refined-record-module">
    <div class="module-header">
      <h3 class="title">成长足迹</h3>
      <MascotCharacter expression="focused" size="small" :animated="false" />
    </div>

    <div class="dual-pane-layout">
      <!-- 左侧：智能看板 -->
      <aside class="dashboard-pane">
        <div class="trend-summary-card">
          <div class="card-inner">
            <header>
              <span class="label">体重成长趋势</span>
              <div class="current-val">{{ latestWeight }}<small>kg</small></div>
            </header>

            <div class="sparkline-wrapper">
              <WeightSparkline
                v-if="weightData.length > 0"
                :data="weightData"
              />
              <div v-else class="no-data-placeholder">
                <MascotCharacter expression="confused" size="small" :animated="false" />
                <span>暂无体重记录</span>
              </div>
            </div>

            <!-- 最大最小值标签 -->
            <div v-if="weightData.length > 1" class="range-labels">
              <span class="min-val">{{ minWeight.toFixed(1) }}kg</span>
              <span class="max-val">{{ maxWeight.toFixed(1) }}kg</span>
            </div>
          </div>

          <!-- AI 对话泡 -->
          <div class="ai-interaction">
            <MascotCharacter expression="default" size="small" class="mini-avatar" />
            <div class="speech-bubble">
              {{ aiTip }}
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧：叙事时间轴 -->
      <main class="timeline-pane">
        <div class="timeline-list">
          <div
            v-for="(record, index) in recordsWithDiff"
            :key="record.id"
            class="timeline-row"
          >
            <div class="axis-node">
              <!-- 表情节点 -->
              <MascotCharacter
                :expression="record.expression"
                size="small"
                :animated="false"
                class="node-mascot"
              />
              <div v-if="index !== recordsWithDiff.length - 1" class="stem-line"></div>
            </div>

            <div class="record-bubble-card">
              <div class="time-meta">{{ record.date }}</div>
              <div class="data-row">
                <span class="weight">{{ record.weight }}kg</span>
                <span
                  v-if="record.diff !== 0"
                  class="status-indicator"
                  :class="record.diff > 0 ? 'plus' : 'minus'"
                >
                  {{ record.diff > 0 ? '+' : '' }}{{ record.diff.toFixed(2) }}
                </span>
              </div>
              <div class="type-label">{{ getTypeLabel(record.type) }}</div>
            </div>
          </div>
        </div>

        <RouterLink to="/timeline" class="action-footer">
          查看完整轨迹 →
        </RouterLink>
      </main>
    </div>
  </div>
</template>

<style scoped>
.refined-record-module {
  background: var(--color-card);
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.dual-pane-layout {
  display: flex;
  gap: var(--space-xl);
  margin-top: var(--space-lg);
}

/* 左侧看板 */
.dashboard-pane {
  flex: 5;
}

.trend-summary-card {
  height: 100%;
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
}

.card-inner header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-main);
}

.current-val {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-primary);
}

.current-val small {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-sub);
  margin-left: 2px;
}

.sparkline-wrapper {
  flex: 1;
  min-height: 100px;
}

.no-data-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  height: 100px;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-xs);
  font-size: 10px;
  color: var(--color-text-muted);
}

.min-val::before {
  content: '↓ ';
  color: var(--color-accent);
}

.max-val::before {
  content: '↑ ';
  color: var(--color-primary);
}

/* AI 对话泡 */
.ai-interaction {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border-light);
}

.mini-avatar {
  flex-shrink: 0;
}

.speech-bubble {
  flex: 1;
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  font-size: 12px;
  color: var(--color-text-main);
  line-height: 1.4;
  position: relative;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 8px;
  border: 6px solid transparent;
  border-right-color: var(--color-primary-light);
}

/* 右侧时间轴 */
.timeline-pane {
  flex: 7;
}

.timeline-list {
  display: flex;
  flex-direction: column;
}

.timeline-row {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xs);
}

.axis-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
  flex-shrink: 0;
}

.node-mascot {
  margin-top: 4px;
}

.stem-line {
  flex: 1;
  width: 2px;
  background: var(--color-primary-light);
  margin: 4px 0;
}

/* 浮动卡片 */
.record-bubble-card {
  flex: 1;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-sm);
  position: relative;
  box-shadow: var(--shadow-xs);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              box-shadow 0.3s ease;
}

.record-bubble-card:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-sm);
}

.time-meta {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.data-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.weight {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-main);
}

.status-indicator {
  font-size: 12px;
  font-weight: 600;
}

.status-indicator.plus {
  color: #2D8C54;
}

.status-indicator.minus {
  color: #D87A2C;
}

.type-label {
  font-size: 10px;
  color: var(--color-text-sub);
  margin-top: 4px;
}

.action-footer {
  display: block;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-link);
  text-decoration: none;
  margin-top: var(--space-md);
  transition: color var(--transition-fast);
}

.action-footer:hover {
  color: var(--color-link-hover);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .dual-pane-layout {
    flex-direction: column;
  }

  .dashboard-pane {
    flex: none;
  }

  .axis-node {
    width: 24px;
  }
}
</style>
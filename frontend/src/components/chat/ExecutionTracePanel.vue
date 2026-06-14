<script setup lang="ts">
/**
 * 执行轨迹折叠面板
 *
 * 展示 Agent 管道执行步骤（Router/Planner/Executor/Reporter）。
 * 默认折叠，不干扰正常对话流。
 * 每步显示真实 durationMs（来自后端 ExecutionTracer）。
 */
import { ref, computed } from 'vue'
import type { TraceStep } from '../../types/chat.js'

const props = defineProps<{
  traceSteps: TraceStep[]
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

const stepIconMap: Record<string, string> = {
  intent: '🎯',
  plan: '📋',
  execute: '⚡',
  report: '✍️',
}

function stepIcon(type: string): string {
  return stepIconMap[type] || '•'
}

const totalDuration = computed(() => {
  return props.traceSteps.reduce((sum, s) => sum + (s.durationMs || 0), 0)
})
</script>

<template>
  <div class="execution-trace-panel">
    <div class="trace-header" @click="toggle">
      <span class="trace-icon">🛰️</span>
      <span class="trace-label">执行流程</span>
      <span class="trace-count">{{ traceSteps.length }} 步</span>
      <span v-if="totalDuration > 0" class="trace-total">{{ totalDuration }}ms</span>
      <span class="toggle-icon">{{ expanded ? '▾' : '▸' }}</span>
    </div>
    <transition name="trace-expand">
      <div v-if="expanded" class="trace-body">
        <div
          v-for="(step, idx) in traceSteps"
          :key="step.stepId"
          class="trace-step"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <span class="step-icon">{{ stepIcon(step.type) }}</span>
          <div class="step-main">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-content">{{ step.content }}</div>
          </div>
          <span v-if="step.durationMs != null" class="step-duration">{{ step.durationMs }}ms</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.execution-trace-panel {
  border-bottom: 1px solid rgba(255, 228, 181, 0.3);
  background: rgba(255, 248, 231, 0.4);
}

.trace-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  font-size: 12px;
  color: #BC8F6F;
}
.trace-header:hover {
  background: rgba(255, 228, 181, 0.15);
}

.trace-icon { font-size: 13px }
.trace-label {
  font-weight: 600;
  color: #8B7355;
}
.trace-count {
  font-size: 11px;
  color: #D7CCC8;
}
.trace-total {
  font-size: 11px;
  color: #B59E82;
  margin-left: auto;
  margin-right: 4px;
}
.toggle-icon {
  font-size: 10px;
  color: #D7CCC8;
}

.trace-body {
  padding: 4px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trace-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 251, 240, 0.5);
  border-radius: 6px;
  opacity: 0;
  transform: translateX(-6px);
  animation: traceStepIn 0.3s ease forwards;
}

@keyframes traceStepIn {
  to { opacity: 1; transform: translateX(0) }
}

.step-icon {
  font-size: 12px;
  flex-shrink: 0;
  line-height: 1.6;
}

.step-main {
  flex: 1;
  min-width: 0;
}
.step-title {
  font-size: 11px;
  font-weight: 600;
  color: #8B7355;
}
.step-content {
  font-size: 11px;
  color: #B59E82;
  margin-top: 1px;
  line-height: 1.5;
}

.step-duration {
  font-size: 10px;
  color: #D7CCC8;
  flex-shrink: 0;
  font-family: 'Courier New', monospace;
}

/* 展开过渡 */
.trace-expand-enter-active, .trace-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.trace-expand-enter-from, .trace-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.trace-expand-enter-to, .trace-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>

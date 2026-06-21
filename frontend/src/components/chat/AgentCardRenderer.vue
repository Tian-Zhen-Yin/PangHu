<script setup lang="ts">
/**
 * Agent 卡片渲染器
 *
 * 按 toolName 将工具输出分发到注册的卡片组件。
 * 取代原 ChatMessage.vue 中内联的卡片渲染逻辑（catSummary/healthSummary/...）。
 *
 * 新增工具卡片时：
 *   1. 在 cards/ 下创建组件
 *   2. 在 cardRegistry.ts 注册 toolName → 组件映射
 *   3. 无需修改本组件或 ChatMessage.vue
 */
import { computed } from 'vue'
import type { ToolCallInfo } from '../../types/chat.js'
import { cardRegistry } from './cards/cardRegistry.js'

interface VisibleCard {
  name: string
  component: NonNullable<(typeof cardRegistry)[string]>
  output: any
}

const props = defineProps<{
  toolCalls: ToolCallInfo[]
}>()

const emit = defineEmits<{
  (e: 'todo', payload: { todoId: string; completed: boolean }): void
}>()

// 过滤出已完成且有注册卡片组件的工具调用
const visibleCards = computed<VisibleCard[]>(() => {
  const result: VisibleCard[] = []
  for (const call of props.toolCalls) {
    if (call.status !== 'done') continue
    const component = cardRegistry[call.name]
    if (!component) continue
    result.push({ name: call.name, component, output: call.output })
  }
  return result
})

function onCardEvent(event: string, payload: any) {
  if (event === 'todo') {
    emit('todo', payload)
  }
}
</script>

<template>
  <div v-if="visibleCards.length > 0" class="agent-summary-cards">
    <component
      v-for="card in visibleCards"
      :key="card.name"
      :is="card.component"
      :tool-output="card.output"
      @todo="onCardEvent('todo', $event)"
    />
  </div>
</template>

<style scoped>
/* 卡片网格容器（与原 ChatMessage.vue 样式一致） */
.agent-summary-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(255, 251, 240, 0.5);
  border-bottom: 1px solid rgba(255, 228, 181, 0.3);
}

@media (min-width: 640px) {
  .agent-summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 卡片共用样式（通过 :deep 作用于子组件根元素 .agent-summary-card） */
.agent-summary-cards :deep(.agent-summary-card) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border: 1px solid rgba(255, 228, 181, 0.45);
  border-radius: 12px;
  opacity: 1;
  transform: translateY(0);
  animation: cardSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.agent-summary-cards :deep(.agent-summary-card:nth-child(1)) { animation-delay: 0ms }
.agent-summary-cards :deep(.agent-summary-card:nth-child(2)) { animation-delay: 120ms }
.agent-summary-cards :deep(.agent-summary-card:nth-child(3)) { animation-delay: 240ms }
.agent-summary-cards :deep(.agent-summary-card:nth-child(4)) { animation-delay: 360ms }
.agent-summary-cards :deep(.agent-summary-card:nth-child(5)) { animation-delay: 480ms }
.agent-summary-cards :deep(.agent-summary-card:nth-child(6)) { animation-delay: 600ms }

/* 大卡片（如健康周报）跨两列显示 */
.agent-summary-cards :deep(.health-report-card) {
  grid-column: 1 / -1;
  animation: cardSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* 陪玩推荐为信息密集复合卡，跨满整行避免被双列网格压窄 */
.agent-summary-cards :deep(.play-card) {
  grid-column: 1 / -1;
}

@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.agent-summary-cards :deep(.agent-summary-icon) {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1.2;
}

.agent-summary-cards :deep(.agent-summary-body) {
  flex: 1;
  min-width: 0;
}

.agent-summary-cards :deep(.agent-summary-title) {
  font-size: 13px;
  font-weight: 700;
  color: #8B5A2B;
  margin-bottom: 4px;
  line-height: 1.4;
}

.agent-summary-cards :deep(.agent-summary-text) {
  font-size: 12.5px;
  color: #5D4E37;
  line-height: 1.7;
  word-break: break-word;
}

.agent-summary-cards :deep(.agent-summary-value) {
  margin-top: 6px;
  font-size: 11.5px;
  color: #8B7355;
  font-weight: 600;
}

/* 移动端 */
@media (max-width: 767px) {
  .agent-summary-cards {
    padding: 12px;
    grid-template-columns: 1fr;
  }
}
</style>

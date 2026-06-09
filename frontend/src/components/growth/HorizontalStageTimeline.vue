<template>
  <div class="horizontal-timeline-container">
    <div
      v-for="(stage, index) in stages"
      :key="stage.id"
      class="timeline-step"
      :class="{ 'is-active': modelValue?.id === stage.id }"
      @click="handleStageSelect(stage)"
    >
      <div class="step-indicator">
        <div v-if="index !== 0" class="connecting-line"></div>

        <div class="node-circle">{{ index + 1 }}</div>
      </div>

      <div class="step-content">
        <h5 class="stage-name">{{ cleanStageName(stage.name) }}</h5>
        <span class="stage-duration">{{ stage.ageRange || stage.duration || '' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface GrowthStage {
  id: string
  name: string
  ageRange?: string
  duration?: string
  order?: number
}

const props = defineProps<{
  stages: GrowthStage[]
  modelValue: GrowthStage | null // 当前选中的阶段对象 (v-model)
}>()

const emit = defineEmits(['update:modelValue', 'change'])

// 清理阶段名称 - 删除括号及其内容
function cleanStageName(name: string): string {
  if (!name) return ''
  // 删除中文括号及其内容
  return name.replace(/（[^）]*）/g, '').replace(/\([^\)]*\)/g, '').trim()
}

const handleStageSelect = (stage: GrowthStage) => {
  if (props.modelValue?.id !== stage.id) {
    emit('update:modelValue', stage)
    emit('change', stage)
  }
}
</script>

<style scoped>
/* 整个横向容器：允许横向滚动以适配窄屏，隐藏滚动条 */
.horizontal-timeline-container {
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: var(--space-sm) 0 var(--space-lg) 0;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
}
.horizontal-timeline-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* 单个步骤容器：平均分配宽度，或者靠内容撑开 */
.timeline-step {
  flex: 1;
  min-width: 100px; /* 防止挤压过度 */
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s ease;
}

.timeline-step:hover:not(.is-active) {
  transform: translateY(-2px);
}

/* ================= 节点与线条 ================= */
.step-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: var(--space-md);
}

/* 贯穿的横线，通过绝对定位连接前后 */
.connecting-line {
  position: absolute;
  top: 50%;
  right: 50%; /* 从当前节点中心向左延伸 */
  width: 100%; /* 延伸整个父元素的宽度 */
  height: 3px;
  background-color: var(--color-border);
  transform: translateY(-50%);
  z-index: 1;
  border-radius: var(--radius-xs);
  transition: background-color 0.3s ease;
}

/* 圆圈节点（层级需高于横线） */
.node-circle {
  position: relative;
  z-index: 2;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;

  /* 默认态：浅灰底色，深灰文字 */
  background-color: var(--color-bg-muted);
  color: var(--color-text-secondary);
  border: 4px solid var(--color-bg-page); /* 用和页面背景一样的边框，切断线条产生悬浮感 */
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* ================= 文字内容 ================= */
.step-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-name {
  margin: 0 0 var(--space-xs) 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-regular);
  transition: color 0.3s ease;
}

.stage-duration {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* ================= 激活态核心视觉 (Active State) ================= */

/* 1. 激活节点反白 + 品牌主色填充 + 悬浮发光阴影 */
.timeline-step.is-active .node-circle {
  background-color: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: 0 4px 12px rgba(255, 138, 76, 0.4);
  transform: scale(1.15); /* 明显放大 */
  border-color: var(--color-bg-card); /* 激活时边框变纯白，更加突出 */
}

/* 2. 激活态文字颜色加深 */
.timeline-step.is-active .stage-name {
  color: var(--color-text-primary);
  font-size: 15px;
}

.timeline-step.is-active .stage-duration {
  color: var(--color-primary);
  font-weight: 500;
}

/* 3. 激活节点左侧的连线变为主色 (产生进度条填充的效果) */
.timeline-step.is-active .connecting-line {
  background-color: var(--color-primary-light);
}
</style>

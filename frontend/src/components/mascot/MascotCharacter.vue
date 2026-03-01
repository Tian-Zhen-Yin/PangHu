<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import defaultImg from '../../assets/mascot/default.png'
import sleepyImg from '../../assets/mascot/sleepy.png'
import happyImg from '../../assets/mascot/happy.png'
import confusedImg from '../../assets/mascot/confused.png'
import excitedImg from '../../assets/mascot/excited.png'
import yawningImg from '../../assets/mascot/yawning.png'
import waitingImg from '../../assets/mascot/waiting.png'
import focusedImg from '../../assets/mascot/focused.png'

export type MascotExpression =
  | 'default'    // 微笑陪伴 - Logo/个人中心
  | 'waiting'    // 等你记录 - 记一笔/空表单
  | 'excited'    // 小开心 - 体重/成功Toast
  | 'focused'    // 认真看数据 - 健康建议卡片
  | 'confused'   // 有点疑惑 - 空状态/404
  | 'sleepy'     // 困困模式 - 夜间模式
  | 'yawning'    // 打哈欠 - Loading
  | 'happy'     // 被摸舒服 - 成就弹窗

export type MascotSize = 'small' | 'medium' | 'large' | 'hero'

export type MascotLayout = 'inline' | 'float'

interface Props {
  expression?: MascotExpression
  size?: MascotSize
  layout?: MascotLayout
  animated?: boolean
  clickable?: boolean
  floatAnimation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expression: 'default',
  size: 'medium',
  layout: 'inline',
  animated: true,
  clickable: false,
  floatAnimation: true
})

const emit = defineEmits<{
  click: [expression: MascotExpression]
}>()

// 表情图片映射
const expressionImages: Record<MascotExpression, string> = {
  default: defaultImg,
  sleepy: sleepyImg,
  happy: happyImg,
  confused: confusedImg,
  excited: excitedImg,
  yawning: yawningImg,
  waiting: waitingImg,
  focused: focusedImg
}

// 当前显示的表情
const currentExpression = ref<MascotExpression>(props.expression)

watch(() => props.expression, (newExpr) => {
  currentExpression.value = newExpr
})

const currentImage = computed(() => {
  return expressionImages[currentExpression.value]
})

// 尺寸映射（px）- 按设计文档规范
const sizeMap: Record<MascotSize, number> = {
  small: 48,
  medium: 80,
  large: 160,
  hero: 240
}

const wrapperStyle = computed(() => ({
  width: `${sizeMap[props.size]}px`,
  height: `${sizeMap[props.size]}px`
}))

function handleClick() {
  if (!props.clickable) return

  const expressions: MascotExpression[] = [
    'default', 'happy', 'excited', 'yawning', 'confused', 'waiting', 'focused', 'sleepy'
  ]
  const currentIndex = expressions.indexOf(currentExpression.value)
  const nextIndex = (currentIndex + 1) % expressions.length
  currentExpression.value = expressions[nextIndex]!

  emit('click', currentExpression.value)
}
</script>

<template>
  <div
    class="mascot-wrapper"
    :class="[
      size,
      layout,
      { animated, 'float-animation': floatAnimation, clickable }
    ]"
    :style="wrapperStyle"
    @click="handleClick"
  >
    <img
      :src="currentImage"
      :alt="`胖虎 - ${currentExpression}`"
      class="mascot-image"
      :draggable="false"
    />
  </div>
</template>

<style scoped>
.mascot-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 布局模式 */
.mascot-wrapper.inline {
  display: inline-flex;
}

.mascot-wrapper.block {
  display: flex;
}

.mascot-wrapper.float {
  position: fixed;
  z-index: 100;
}

.mascot-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base);
}

/* 呼吸动画 */
.mascot-wrapper.animated .mascot-image {
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* 浮动动画 */
.mascot-wrapper.float-animation {
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* 点击效果 */
.mascot-wrapper.clickable {
  cursor: pointer;
}

.mascot-wrapper.clickable:hover .mascot-image {
  transform: scale(1.05);
}

.mascot-wrapper.clickable:active .mascot-image {
  transform: scale(0.95);
}

/* 尺寸特定样式 - 使用极浅阴影 */
.mascot-wrapper.xs {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.02));
}

.mascot-wrapper.sm {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.02));
}

.mascot-wrapper.md {
  filter: drop-shadow(var(--shadow-xs));
}

.mascot-wrapper.lg {
  filter: drop-shadow(var(--shadow-sm));
}

.mascot-wrapper.xl {
  filter: drop-shadow(var(--shadow-md));
}

.mascot-wrapper.hero {
  filter: drop-shadow(var(--shadow-lg));
}

/* 按压动效 */
@media (hover: hover) {
  .mascot-wrapper:not(.clickable):hover .mascot-image {
    transform: translateY(-2px);
    transition: transform 0.2s ease-out;
  }
}

.mascot-wrapper:active .mascot-image {
  transform: scale(0.95);
  transition: transform 0.1s ease-out;
}

/* 无障碍 */
@media (prefers-reduced-motion: reduce) {
  .mascot-wrapper.animated .mascot-image,
  .mascot-wrapper.float-animation {
    animation: none;
  }
}
</style>
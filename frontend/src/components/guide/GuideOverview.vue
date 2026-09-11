<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MascotCharacter from '../mascot/MascotCharacter.vue'

interface Props {
  /** 导读内容 */
  content: string
  /** 指南唯一标识（用于 localStorage key） */
  guideId: string
  /** 最大显示行数（折叠状态） */
  maxLines?: number
  /** 每行平均字符数（用于计算字符限制） */
  charsPerLine?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLines: 3,
  charsPerLine: 40
})

// 展开/收起状态
const isExpanded = ref(false)

// 计算字符限制
const charLimit = computed(() => props.maxLines * props.charsPerLine)

// 是否需要截断
const needsTruncate = computed(() => {
  return props.content.length > charLimit.value
})

// 显示的内容
const displayContent = computed(() => {
  if (isExpanded.value || !needsTruncate.value) {
    return props.content
  }
  return props.content.slice(0, charLimit.value)
})

// LocalStorage key
const storageKey = computed(() => `guide-overview-${props.guideId}`)

// 初始化：从 localStorage 读取状态
onMounted(() => {
  const savedState = localStorage.getItem(storageKey.value)
  if (savedState === 'expanded') {
    isExpanded.value = true
  }
})

// 监听状态变化，保存到 localStorage
watch(isExpanded, (newValue) => {
  localStorage.setItem(storageKey.value, newValue ? 'expanded' : 'collapsed')
})

// 切换展开/收起
function toggle() {
  isExpanded.value = !isExpanded.value
}

// 按钮文本
const buttonText = computed(() => {
  return isExpanded.value ? '收起' : '展开完整导读'
})
</script>

<template>
  <div class="guide-overview" :class="{ expanded: isExpanded }">
    <!-- 卡片头部 -->
    <div class="overview-header">
      <div class="mascot-wrapper">
        <MascotCharacter
          expression="default"
          size="small"
          :animated="true"
          :float-animation="false"
        />
      </div>
      <h3 class="overview-title">胖虎导读</h3>
    </div>

    <!-- 导读内容 -->
    <div class="overview-content">
      <p class="overview-text">{{ displayContent }}</p>
      <p v-if="!isExpanded && needsTruncate" class="overview-ellipsis">...</p>
    </div>

    <!-- 展开/收起按钮 -->
    <button
      v-if="needsTruncate"
      class="overview-toggle"
      @click="toggle"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<style scoped>
.guide-overview {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: var(--space-2xl);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.overview-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.mascot-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overview-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.overview-content {
  position: relative;
}

.overview-text {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-regular);
  margin: 0 0 var(--space-sm) 0;
}

.overview-ellipsis {
  font-size: var(--text-sm);
  color: var(--color-text-regular);
  margin: 0;
  font-style: italic;
}

.overview-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
  margin-top: var(--space-sm);
}

.overview-toggle:hover {
  color: var(--color-primary-hover);
}

.overview-toggle:active {
  color: var(--color-primary-active);
}

/* 折叠状态的渐变遮罩效果 */
.guide-overview:not(.expanded) .overview-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent, var(--color-bg-card));
  pointer-events: none;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .guide-overview {
    padding: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .overview-text {
    font-size: var(--text-xs);
  }
}
</style>

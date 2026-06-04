<template>
  <div class="lazy-image-container" :class="{ loaded: isLoaded, loading: isLoading }">
    <!-- 占位符 -->
    <div v-if="!isLoaded" class="image-placeholder">
      <div class="skeleton-animation"></div>
    </div>

    <!-- 实际图片 -->
    <img
      v-if="shouldLoad"
      :src="src"
      :alt="alt"
      :class="props.class"
      :loading="loading"
      @load="onLoad"
      @error="onError"
      :style="{ opacity: isLoaded ? 1 : 0 }"
    />

    <!-- 错误状态 -->
    <div v-if="hasError" class="image-error">
      <div class="error-icon">❌</div>
      <div class="error-text">图片加载失败</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  src: string
  alt?: string
  class?: string
  loading?: 'lazy' | 'eager'
  threshold?: number
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  class: '',
  loading: 'lazy',
  threshold: 100,
  placeholder: ''
})

const emit = defineEmits<{
  loaded: []
  error: []
}>()

const isLoaded = ref(false)
const isLoading = ref(true)
const hasError = ref(false)
const shouldLoad = ref(props.loading === 'eager')

let observer: IntersectionObserver | null = null

// 检查 Intersection Observer 支持
const hasIntersectionObserver = computed(() => {
  return 'IntersectionObserver' in window
})

// 加载图片
const loadImage = () => {
  shouldLoad.value = true
}

// 图片加载完成
const onLoad = () => {
  isLoaded.value = true
  isLoading.value = false
  emit('loaded')
}

// 图片加载错误
const onError = () => {
  isLoading.value = false
  hasError.value = true
  emit('error')
}

// 设置懒加载观察器
const setupObserver = () => {
  if (!hasIntersectionObserver.value || props.loading === 'eager') {
    shouldLoad.value = true
    return
  }

  const element = document.querySelector('.lazy-image-container img')
  if (!element) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImage()
          observer?.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: `${props.threshold}px`
    }
  )

  observer.observe(element)
}

// 清理观察器
const cleanupObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onMounted(() => {
  setupObserver()
})

onUnmounted(() => {
  cleanupObserver()
})

// 暴露重新加载方法
defineExpose({
  reload: () => {
    hasError.value = false
    isLoading.value = true
    loadImage()
  }
})
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-elevated, #FFFFFF);
}

.lazy-image-container.loading {
  min-height: 200px;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated, #F9F8F6) 0%,
    var(--color-bg-subtle, #E8E6E3) 50%,
    var(--color-bg-elevated, #F9F8F6) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-animation {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeleton 1.5s ease-in-out infinite;
}

@keyframes skeleton {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.lazy-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
  display: block;
}

.lazy-image-container.loaded img {
  opacity: 1;
}

.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  background: var(--color-bg-subtle, #E8E6E3);
  color: var(--color-text-secondary, #6B7280);
}

.error-icon {
  font-size: 24px;
}

.error-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary, #6B7280);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .lazy-image-container.loading {
    min-height: 150px;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
  lazy?: boolean
  width?: string | number
  height?: string | number
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}>()

const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
}>()

const loaded = ref(false)
const error = ref(false)
const isInView = ref(!props.lazy)
const imgRef = ref<HTMLImageElement | null>(null)

// 懒加载观察器
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (props.lazy && imgRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          isInView.value = true
          observer?.disconnect()
        }
      },
      { rootMargin: '50px' }
    )
    observer.observe(imgRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

function onLoad(event: Event) {
  loaded.value = true
  emit('load', event)
}

function onError(event: Event) {
  error.value = true
  emit('error', event)
}

const imageStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  if (props.height) style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  if (props.fit) style.objectFit = props.fit
  return style
})
</script>

<template>
  <div class="image-loader" :style="imageStyle">
    <!-- 实际图片 -->
    <img
      v-if="isInView && !error"
      ref="imgRef"
      :src="src"
      :alt="alt"
      :style="{ opacity: loaded ? 1 : 0 }"
      @load="onLoad"
      @error="onError"
      class="image-loader-img"
    />

    <!-- 加载占位符 -->
    <div v-if="!loaded && !error" class="image-placeholder">
      <div class="placeholder-spinner">
        <div class="spinner-ring"></div>
      </div>
      <span class="placeholder-text">加载中...</span>
    </div>

    <!-- 错误占位符 -->
    <div v-if="error" class="image-error">
      <span class="error-icon">❌</span>
      <span class="error-text">图片加载失败</span>
    </div>

    <!-- 插槽用于自定义内容 -->
    <slot v-if="loaded && !error" name="overlay" />
  </div>
</template>

<style scoped>
.image-loader {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background: var(--color-bg-block-hover);
  border-radius: 0.5rem;
}

.image-loader-img {
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  display: block;
}

/* 加载占位符 */
.image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, var(--color-bg-page) 0%, var(--color-border-light) 100%);
}

.placeholder-spinner {
  width: 40px;
  height: 40px;
}

.spinner-ring {
  width: 100%;
  height: 100%;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.placeholder-text {
  font-size: 0.875rem;
  color: var(--color-text-placeholder);
}

/* 错误占位符 */
.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.error-icon {
  font-size: 2.5rem;
  opacity: 0.6;
}

.error-text {
  font-size: 0.875rem;
  color: var(--color-danger);
}
</style>

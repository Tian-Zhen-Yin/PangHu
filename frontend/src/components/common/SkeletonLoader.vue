<template>
  <div class="skeleton-loader" :class="[`skeleton-${variant}`, { animated }]">
    <slot>
      <!-- 默认骨架屏 -->
      <div v-if="variant === 'text'" class="skeleton-text"></div>
      <div v-else-if="variant === 'circle'" class="skeleton-circle"></div>
      <div v-else-if="variant === 'rect'" class="skeleton-rect"></div>
      <div v-else-if="variant === 'card'" class="skeleton-card">
        <div class="skeleton-card-header">
          <div class="skeleton-circle small"></div>
          <div class="skeleton-lines">
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
        <div class="skeleton-card-body">
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      </div>
      <div v-else-if="variant === 'list'" class="skeleton-list">
        <div v-for="i in count" :key="i" class="skeleton-list-item">
          <div class="skeleton-circle small"></div>
          <div class="skeleton-lines">
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'text' | 'circle' | 'rect' | 'card' | 'list' | 'custom'
  animated?: boolean
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animated: true,
  count: 3
})
</script>

<style scoped>
.skeleton-loader {
  --skeleton-base: var(--color-bg-subtle, #E8E6E3);
  --skeleton-highlight: var(--color-bg-elevated, #F9F8F6);
}

/* 基础样式 */
.skeleton-text {
  height: 1em;
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 0%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base) 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  margin-bottom: 0.5em;
}

.skeleton-text.short {
  width: 60%;
}

.skeleton-circle {
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 0%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base) 100%
  );
  background-size: 200% 100%;
}

.skeleton-circle.small {
  width: 40px;
  height: 40px;
}

.skeleton-circle.medium {
  width: 60px;
  height: 60px;
}

.skeleton-circle.large {
  width: 80px;
  height: 80px;
}

.skeleton-rect {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 0%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-md);
}

/* 卡片骨架屏 */
.skeleton-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-xs);
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-card-body {
  padding-left: 56px; /* circle width + gap */
}

/* 列表骨架屏 */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
}

/* 动画效果 */
.skeleton-loader.animated .skeleton-text,
.skeleton-loader.animated .skeleton-circle,
.skeleton-loader.animated .skeleton-rect {
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .skeleton-circle.small {
    width: 32px;
    height: 32px;
  }

  .skeleton-circle.medium {
    width: 48px;
    height: 48px;
  }

  .skeleton-circle.large {
    width: 64px;
    height: 64px;
  }
}
</style>

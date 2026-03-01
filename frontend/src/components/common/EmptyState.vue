<script setup lang="ts">
import { computed } from 'vue'
import MascotCharacter, { type MascotExpression } from '../mascot/MascotCharacter.vue'

interface Props {
  title?: string
  description?: string
  expression?: MascotExpression
  showAction?: boolean
  actionText?: string
  actionPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '这里空空如也',
  description: '还没有内容哦',
  expression: 'confused',
  showAction: false,
  actionText: '去添加',
  actionPath: '/'
})

const emit = defineEmits<{
  action: []
}>()

function handleAction() {
  emit('action')
}
</script>

<template>
  <div class="empty-state">
    <MascotCharacter
      :expression="expression"
      size="large"
      :animated="true"
      :float-animation="true"
    />
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <slot name="action">
      <RouterLink
        v-if="showAction && actionPath"
        :to="actionPath"
        class="empty-action-btn"
        @click="handleAction"
      >
        {{ actionText }}
      </RouterLink>
    </slot>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4xl) var(--space-xl);
  text-align: center;
  gap: var(--space-lg);
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.empty-description {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  margin: 0;
  max-width: 280px;
  line-height: var(--leading-normal);
}

.empty-action-btn {
  margin-top: var(--space-md);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all var(--transition-base);
}

.empty-action-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-warm-sm);
}
</style>

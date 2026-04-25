<script setup lang="ts">
import { ref, inject, readonly, provide } from 'vue'
import type { MascotExpression } from './MascotCharacter.vue'

const props = defineProps<{
  defaultExpression?: MascotExpression
}>()

const expression = ref<MascotExpression>(props.defaultExpression ?? 'default')

function setExpression(expr: MascotExpression) {
  expression.value = expr
}

function resetExpression() {
  expression.value = props.defaultExpression ?? 'default'
}

const MASCOT_CONTEXT_KEY = Symbol('mascot-context')

provide(MASCOT_CONTEXT_KEY, {
  expression: readonly(expression),
  setExpression,
  resetExpression
})

// Export composable for child components
export function useMascot() {
  const context = inject(MASCOT_CONTEXT_KEY)
  if (!context) {
    return {
      expression: readonly(ref('default' as MascotExpression)),
      setExpression: () => {},
      resetExpression: () => {}
    }
  }
  return context
}
</script>

<template>
  <slot />
</template>

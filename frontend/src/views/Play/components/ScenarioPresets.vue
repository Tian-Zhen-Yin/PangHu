<script setup lang="ts">
import { SCENARIO_PRESETS, type ScenarioPreset } from '@/types/play'

defineProps<{
  activeScenarioId: string | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', preset: ScenarioPreset): void
  (e: 'reset'): void
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2 mb-4">
    <button
      v-for="p in SCENARIO_PRESETS"
      :key="p.id"
      type="button"
      :class="[
        'px-3 py-1.5 rounded-full border text-sm transition-colors',
        activeScenarioId === p.id
          ? 'is-active bg-orange-500 border-orange-500 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400',
      ]"
      :disabled="loading"
      @click="emit('apply', p)"
    >
      {{ p.label }}
    </button>
    <button
      type="button"
      class="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500"
      :disabled="loading"
      @click="emit('reset')"
    >
      重置
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useMyCatStore } from '@/stores/myCat'
import { usePlayRecommend } from '@/composables/usePlayRecommend'
import ScenarioPresets from './components/ScenarioPresets.vue'
import PlaySuggestionCard from './components/PlaySuggestionCard.vue'
import PlayProfileSetup from './components/PlayProfileSetup.vue'
import PlayEmptyStates from './components/PlayEmptyStates.vue'
import CatSelector from '@/components/cat/CatSelector.vue'
import { track } from '@/utils/track'
import { PERSONALITY_OPTIONS, type Personality } from '@/types/play'

const myCatStore = useMyCatStore()
const { result, loading, error, activeScenarioId, fetch, applyScenario, reset } = usePlayRecommend()

function loadDefault() {
  if (!myCatStore.currentCat) return
  fetch({ catId: myCatStore.currentCat.id })
}

onMounted(loadDefault)

watch(() => myCatStore.currentCat?.id, () => {
  reset()
  loadDefault()
})

watch(result, r => {
  if (r?.success) {
    track('recommendation_view', {
      catId: myCatStore.currentCat?.id,
      source: activeScenarioId.value ? 'scenario' : 'page',
      gameIds: r.suggestions.map(s => s.game.id),
      scores: r.suggestions.map(s => s.score),
      fallback: r.fallback,
    })
  }
})

const fallbackPersonalityLabel = computed<string>(() => {
  const p = (myCatStore.currentCat as any)?.personality as Personality | undefined
  return p ? PERSONALITY_OPTIONS.find(o => o.value === p)?.label || '' : ''
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-4">
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">陪玩推荐</h1>
      <CatSelector />
    </header>

    <!-- 1. 没有猫咪 -->
    <PlayEmptyStates v-if="!myCatStore.currentCat" type="no-cat" />

    <!-- 2. 网络错误 -->
    <PlayEmptyStates v-else-if="error" type="network" @retry="loadDefault" />

    <!-- 3. 加载中 + 没有结果 -->
    <div v-else-if="loading && !result" class="py-16 text-center text-gray-500">加载中…</div>

    <!-- 4. 画像未完成 -->
    <PlayProfileSetup
      v-else-if="result?.needProfileCompletion"
      :cat-id="myCatStore.currentCat.id"
      :on-completed="loadDefault"
    />

    <!-- 5. 业务降级 L2（兽医提示） -->
    <PlayEmptyStates
      v-else-if="result && !result.success"
      type="vet-hint"
      :message="result.message"
    />

    <!-- 6. fallback=true：卡片列表（不展示分数 + 不展示场景预设） -->
    <template v-else-if="result?.fallback">
      <p class="text-sm text-gray-500 mb-3">
        {{ fallbackPersonalityLabel ? `按${fallbackPersonalityLabel}为你挑选` : '为你挑选' }}
      </p>
      <div class="space-y-4">
        <PlaySuggestionCard
          v-for="(s, i) in result.suggestions"
          :key="s.game.id"
          :suggestion="s"
          :fallback="true"
          :cat-id="myCatStore.currentCat.id"
          :position="i"
        />
      </div>
    </template>

    <!-- 7. 正常成功 -->
    <template v-else-if="result?.success">
      <ScenarioPresets
        :active-scenario-id="activeScenarioId"
        :loading="loading"
        @apply="p => applyScenario(p, myCatStore.currentCat!.id)"
        @reset="() => { reset(); loadDefault() }"
      />
      <div class="space-y-4">
        <PlaySuggestionCard
          v-for="(s, i) in result.suggestions"
          :key="s.game.id"
          :suggestion="s"
          :fallback="false"
          :cat-id="myCatStore.currentCat.id"
          :position="i"
        />
      </div>
    </template>
  </div>
</template>

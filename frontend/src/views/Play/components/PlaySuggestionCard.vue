<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Suggestion } from '@/types/play'
import { CATEGORY_LABEL } from '@/types/play'
import { submitPlayFeedback } from '@/api/play'
import { track } from '@/utils/track'

const props = defineProps<{
  suggestion: Suggestion
  fallback: boolean
  catId: string
  position: number
}>()

const score = ref(0)
const completion = ref(true)
const actualDuration = ref(props.suggestion.game.durationMin)
const submitting = ref(false)
const submitted = ref(false)
const expanded = ref(false)
let startTracked = false

function expandDetails() {
  expanded.value = !expanded.value
  track('recommendation_click', {
    catId: props.catId,
    gameId: props.suggestion.game.id,
    position: props.position,
    score: props.suggestion.score,
  })
}

function setScore(v: number) {
  score.value = v
  if (!startTracked) {
    track('play_start', {
      catId: props.catId,
      gameId: props.suggestion.game.id,
      source: 'page',
    })
    startTracked = true
  }
}

async function submit() {
  if (score.value < 1 || submitting.value) return
  submitting.value = true
  try {
    const res = await submitPlayFeedback({
      catId: props.catId,
      gameId: props.suggestion.game.id,
      score: score.value,
      completion: completion.value,
      actualDuration: actualDuration.value,
    })
    if (!res.success) {
      ElMessage.error(res.message || '提交失败')
      return
    }
    submitted.value = true
    track('feedback_submit', {
      catId: props.catId,
      gameId: props.suggestion.game.id,
      score: score.value,
      completion: completion.value,
    })
    if (completion.value) {
      track('play_complete', {
        catId: props.catId,
        gameId: props.suggestion.game.id,
        actualDuration: actualDuration.value,
      })
    }
  } catch (_e) {
    ElMessage.error('网络异常，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <header class="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 class="text-lg font-semibold">{{ suggestion.game.name }}</h3>
        <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
          <span class="px-2 py-0.5 rounded bg-gray-100">{{ CATEGORY_LABEL[suggestion.game.category] }}</span>
          <span>难度 · {{ suggestion.game.difficulty }}</span>
          <span>{{ suggestion.game.durationMin }} 分钟</span>
          <span>强度 {{ '●'.repeat(suggestion.game.energyCost) }}{{ '○'.repeat(5 - suggestion.game.energyCost) }}</span>
        </div>
      </div>
      <div v-if="!fallback" data-testid="card-score" class="text-right shrink-0">
        <div class="text-2xl font-bold text-orange-500">{{ suggestion.score }}</div>
        <div class="text-[10px] text-gray-400 leading-tight">
          性 {{ suggestion.breakdown?.personality ?? '-' }} ·
          力 {{ suggestion.breakdown?.energy ?? '-' }}<br>
          时 {{ suggestion.breakdown?.time ?? '-' }} ·
          好 {{ suggestion.breakdown?.preference ?? '-' }}
        </div>
      </div>
    </header>

    <ul class="text-sm text-gray-700 mb-3 space-y-1">
      <li v-for="r in suggestion.reasons" :key="r" class="flex gap-1.5">
        <span class="text-orange-500">·</span><span>{{ r }}</span>
      </li>
    </ul>

    <button class="text-xs text-gray-500 hover:text-orange-500 mb-3" type="button" @click="expandDetails">
      {{ expanded ? '收起详情' : '查看玩法 / 道具 / 小贴士 ↓' }}
    </button>

    <div v-if="expanded" class="text-sm text-gray-600 mb-4 space-y-2">
      <p>{{ suggestion.game.description }}</p>
      <p class="text-gray-500">所需道具：{{ suggestion.game.requiredProps.join('、') || '无需道具' }}</p>
      <p class="text-gray-500">小贴士：{{ suggestion.game.tips }}</p>
    </div>

    <div v-if="!submitted" class="border-t border-gray-100 pt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-700">猫咪喜欢吗？</span>
        <div class="flex gap-1">
          <button
            v-for="n in 5"
            :key="n"
            :data-testid="`star-${n}`"
            type="button"
            class="text-xl leading-none"
            :class="n <= score ? 'text-amber-400' : 'text-gray-300'"
            @click="setScore(n)"
          >★</button>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <input v-model="completion" type="checkbox" />
        <span>玩满了建议时长</span>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <span>实际时长（分钟）</span>
        <input v-model.number="actualDuration" type="number" min="0" max="120" class="w-20 px-2 py-1 border border-gray-300 rounded" />
      </label>
      <button
        data-testid="card-submit"
        type="button"
        class="w-full py-2 rounded-lg bg-orange-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="score < 1 || submitting"
        @click="submit"
      >
        {{ submitting ? '提交中…' : '提交反馈' }}
      </button>
    </div>
    <div v-else data-testid="card-recorded" class="border-t border-gray-100 pt-3 flex items-center justify-between text-sm">
      <span class="text-gray-700">已记录 ⭐{{ score }} · {{ completion ? '完成' : '中断' }} · {{ actualDuration }} 分钟</span>
      <button data-testid="card-edit" type="button" class="text-orange-500 text-sm" @click="submitted = false">修改</button>
    </div>
  </article>
</template>

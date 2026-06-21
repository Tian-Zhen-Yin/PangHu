<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  PERSONALITY_OPTIONS,
  ENERGY_LEVELS,
  HEALTH_TAG_OPTIONS,
  type Personality,
  type HealthTag,
} from '@/types/play'
import { updatePlayProfile } from '@/api/play'

const props = defineProps<{
  catId: string
  onCompleted?: () => void
}>()

const personality = ref<Personality | null>(null)
const energyBaseline = ref<number | null>(null)
const healthTags = ref<HealthTag[]>([])
const submitting = ref(false)

const canSubmit = computed(() =>
  personality.value !== null && energyBaseline.value !== null && !submitting.value,
)

function toggleHealthTag(tag: HealthTag) {
  const idx = healthTags.value.indexOf(tag)
  if (idx >= 0) healthTags.value.splice(idx, 1)
  else healthTags.value.push(tag)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const res = await updatePlayProfile(props.catId, {
      personality: personality.value!,
      energyBaseline: energyBaseline.value!,
      healthTags: [...healthTags.value],
    })
    if (!res.success) {
      ElMessage.error(res.message || '保存失败')
      return
    }
    ElMessage.success('画像保存成功')
    props.onCompleted?.()
  } catch (_e) {
    ElMessage.error('网络异常，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl p-6 shadow-sm">
    <h2 class="text-xl font-semibold mb-1">先了解一下你的猫咪</h2>
    <p class="text-sm text-gray-500 mb-6">完成画像后即可获得更个性化的陪玩推荐</p>

    <!-- 性格 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">性格特点</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="opt in PERSONALITY_OPTIONS"
          :key="opt.value"
          :data-testid="`personality-${opt.value}`"
          type="button"
          :class="[
            'text-left p-3 rounded-xl border-2 transition-colors',
            personality === opt.value
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300',
          ]"
          @click="personality = opt.value"
        >
          <div class="font-medium">{{ opt.label }}</div>
          <div class="text-xs text-gray-600 mt-1">{{ opt.description }}</div>
          <div class="text-xs text-gray-400 mt-1">典型：{{ opt.example }}</div>
        </button>
      </div>
    </section>

    <!-- 精力档位 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">日常精力档位</h3>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="lvl in ENERGY_LEVELS"
          :key="lvl.value"
          :data-testid="`energy-${lvl.value}`"
          type="button"
          :class="[
            'flex flex-col items-center py-2 rounded-lg border-2',
            energyBaseline === lvl.value
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300',
          ]"
          @click="energyBaseline = lvl.value"
        >
          <span class="text-lg font-semibold">{{ lvl.value }}</span>
          <span class="text-xs text-gray-600">{{ lvl.label }}</span>
        </button>
      </div>
      <p v-if="energyBaseline" class="text-xs text-gray-500 mt-2">
        {{ ENERGY_LEVELS.find(l => l.value === energyBaseline)?.description }}
      </p>
    </section>

    <!-- 健康标签 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">
        健康标签 <span class="text-xs text-gray-400 font-normal">（可选，多选）</span>
      </h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in HEALTH_TAG_OPTIONS"
          :key="tag.value"
          :data-testid="`health-${tag.value}`"
          type="button"
          :title="tag.hint"
          :class="[
            'px-3 py-1.5 rounded-full border text-sm',
            healthTags.includes(tag.value)
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-300 text-gray-600 hover:border-orange-300',
          ]"
          @click="toggleHealthTag(tag.value)"
        >
          {{ tag.label }}
        </button>
      </div>
    </section>

    <button
      data-testid="profile-submit"
      type="button"
      class="w-full py-3 rounded-xl bg-orange-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ submitting ? '保存中…' : '保存画像' }}
    </button>
  </div>
</template>

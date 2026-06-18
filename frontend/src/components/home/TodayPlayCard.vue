<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useMyCatStore } from '@/stores/myCat'
import { getPlayRecommend } from '@/api/play'
import type { Suggestion } from '@/types/play'

const myCatStore = useMyCatStore()
const router = useRouter()

const root = ref<HTMLElement | null>(null)
const top = ref<Suggestion | null>(null)
const needsSetup = ref(false)
const loaded = ref(false)
let observer: IntersectionObserver | null = null

async function loadOnce() {
  if (loaded.value || !myCatStore.currentCat) return
  loaded.value = true
  try {
    const res = await getPlayRecommend({ catId: myCatStore.currentCat.id })
    if (!res.success) return
    if (res.data.needProfileCompletion) {
      needsSetup.value = true
      return
    }
    if (!res.data.success) return
    top.value = res.data.suggestions[0] ?? null
  } catch (_e) {
    // 静默失败：用户点击仍可进入 /play 重试
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window) || !root.value) {
    void loadOnce()
    return
  }
  observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      void loadOnce()
      observer?.disconnect()
    }
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())

function go() {
  router.push('/play')
}
</script>

<template>
  <div ref="root" class="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 cursor-pointer" @click="go">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500">今日陪玩</div>
        <div class="text-base font-semibold mt-0.5">
          <template v-if="needsSetup">点击设置陪玩档案</template>
          <template v-else-if="top">{{ top.game.name }} · {{ top.reasons[0] }}</template>
          <template v-else>为 {{ myCatStore.currentCat?.name || '猫咪' }} 推荐合适的小游戏</template>
        </div>
      </div>
      <div class="text-orange-500 text-lg">→</div>
    </div>
  </div>
</template>

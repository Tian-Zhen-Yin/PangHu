<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

type EmptyType = 'no-cat' | 'vet-hint' | 'network'

const props = defineProps<{
  type: EmptyType
  message?: string
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const router = useRouter()

const config = computed(() => {
  switch (props.type) {
    case 'no-cat':
      return {
        icon: '🐈',
        title: '还没有猫咪档案',
        desc: '先添加一只猫咪，再来看陪玩推荐吧',
        cta: '去添加猫咪',
        action: () => router.push('/my-cats/new'),
      }
    case 'vet-hint':
      return {
        icon: '🩺',
        title: '建议先咨询兽医',
        desc: props.message || '当前健康状况下暂不建议自行陪玩。',
        cta: '咨询喵星顾问',
        action: () => router.push('/ai-chat'),
      }
    case 'network':
      return {
        icon: '⚠️',
        title: '加载失败',
        desc: '检查网络后再试一次',
        cta: '重试',
        action: () => emit('retry'),
      }
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div class="text-6xl mb-4" aria-hidden="true">{{ config.icon }}</div>
    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ config.title }}</h3>
    <p class="text-sm text-gray-500 mb-6 max-w-sm">{{ config.desc }}</p>
    <el-button type="primary" @click="config.action">{{ config.cta }}</el-button>
  </div>
</template>

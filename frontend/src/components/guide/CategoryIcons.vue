<script setup lang="ts">
import { computed } from 'vue'

// 分类图标类型
export type CategoryIconType =
  | 'all'        // 全部 - 书本
  | 'kitten'     // 幼猫 - 奶瓶
  | 'feeding'    // 喂养 - 食盆
  | 'health'     // 健康 - 心跳/医疗
  | 'vaccine'    // 疫苗 - 针筒
  | 'behavior'   // 行为 - 猫爪
  | 'environment' // 环境 - 房子
  | 'grooming'   // 护理 - 梳子
  | 'emergency'  // 急救 - 救护
  | 'default'    // 默认 - 文档

interface Props {
  type: CategoryIconType
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 20
})

// 马卡龙色系
const colors = {
  all: 'var(--color-primary)',        // 橙色
  kitten: '#A78BFA',     // 紫色
  feeding: '#FBBF24',    // 黄色
  health: '#F87171',     // 红色
  vaccine: '#38BDF8',    // 蓝色
  behavior: 'var(--color-primary)',   // 橙红
  environment: '#34D399',// 绿色
  grooming: '#F472B6',   // 粉色
  emergency: 'var(--color-danger)',  // 深红
  default: 'var(--color-text-placeholder)'     // 灰色
}

// 图标路径
const iconPaths = computed(() => {
  const paths: Record<CategoryIconType, string> = {
    all: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.747M13.5 6c0 1.774.846 3.432 2.168 4.542C17.164 11.562 18 13.068 18 15v3c0 .864-.573 1.636-1.402 1.908-.11.037-.224.06-.34.072-.086.007-.173.02-.258.02h-3c-1.105 0-2-.895-2-2v-3c0-2.072.927-3.878 2.312-5.168C14.054 9.302 14.5 8.672 14.5 8c0-1.105-.895-2-2-2s-2 .895-2 2',
    kitten: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    feeding: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10 M8.5 13h7m-7 3h5',
    health: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z M12 4v2m0 14v2m8-8h-2M6 12H4',
    vaccine: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    behavior: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z M4.5 16.5c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5M19.5 16.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5',
    environment: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    grooming: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z M9 9l.75 2.25M15 15l-.75-2.25M9 15l.75-2.25M15 9l-.75 2.25',
    emergency: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z M15 12a3 3 0 11-6 0 3 3 0 016 0z M9.5 9.5L12 7m0 0l2.5 2.5M12 7v10',
    default: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  }
  return paths[props.type]
})

const color = computed(() => colors[props.type])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="category-icon"
    :style="{ color }"
  >
    <path :d="iconPaths" />
  </svg>
</template>

<style scoped>
.category-icon {
  transition: color 0.3s ease;
}
</style>

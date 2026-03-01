<script setup lang="ts">
import { useRouter } from 'vue-router'
import MascotCharacter from './MascotCharacter.vue'
import type { MascotExpression } from './MascotCharacter.vue'

const router = useRouter()

interface ActionItem {
  id: string
  label: string
  expression: MascotExpression
  route: string
  bgColor: string
}

// 金刚区操作项配置 - 带有专属马卡龙底色
const actions: ActionItem[] = [
  { id: 'record', label: '记一笔', expression: 'waiting', route: '/record/add', bgColor: '#FFF0E5' },
  { id: 'weight', label: '体重', expression: 'excited', route: '/my-cats', bgColor: '#E8F4FD' },
  { id: 'vaccine', label: '疫苗', expression: 'focused', route: '/my-cats', bgColor: '#E6F5EC' },
  { id: 'guide', label: '指南', expression: 'default', route: '/guides', bgColor: '#F4F0FC' },
]

function handleActionClick(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="action-grid">
    <button
      v-for="action in actions"
      :key="action.id"
      class="action-card"
      @click="handleActionClick(action.route)"
    >
      <div class="color-backdrop" :style="{ backgroundColor: action.bgColor }">
        <MascotCharacter
          :expression="action.expression"
          size="medium"
          layout="inline"
          class="breakout-mascot"
          :animated="false"
        />
      </div>
      <span class="action-label">{{ action.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: var(--space-lg) var(--space-xl);
  background-color: transparent;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 8px 12px;
  background: var(--color-card);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transform: translateZ(0);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.action-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-md);
}

.action-card:active {
  transform: scale(0.92);
  box-shadow: var(--shadow-xs);
  transition: transform 0.1s ease-out;
}

/* 马卡龙色圆形背景底座 */
.color-backdrop {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

/* 破形魔法：放大 + 偏移 + 阴影 */
.breakout-mascot {
  height: 130%;
  width: auto;
  transform: translateY(-5%);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.08));
}

.action-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-main);
}
</style>
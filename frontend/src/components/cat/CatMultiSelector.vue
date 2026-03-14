<template>
  <div class="cat-multi-selector">
    <div class="selector-header">
      <span class="title">选择猫咪</span>
      <span class="count">已选 {{ selected.length }} / {{ max }} 只</span>
    </div>

    <div v-if="loading" class="loading-state">
      <p>加载猫咪列表中...</p>
    </div>

    <div v-else-if="cats.length === 0" class="empty-state">
      <p>暂无猫咪</p>
      <p class="hint">请先添加猫咪</p>
    </div>

    <div v-else class="cat-list">
      <label
        v-for="cat in cats"
        :key="cat.id"
        class="cat-item"
        :class="{
          selected: selected.includes(cat.id),
          disabled: !selected.includes(cat.id) && selected.length >= max
        }"
      >
        <input
          type="checkbox"
          :checked="selected.includes(cat.id)"
          :disabled="!selected.includes(cat.id) && selected.length >= max"
          @change="toggleCat(cat.id)"
        />
        <div class="cat-avatar">
          <img v-if="cat.avatarData || cat.avatar" :src="getAvatarUrl(cat)" :alt="cat.name" />
          <span v-else class="avatar-placeholder">{{ cat.name?.charAt(0) || '?' }}</span>
        </div>
        <div class="cat-info">
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-meta">{{ cat.breed || '未知品种' }} · {{ cat.ageFormatted }}</div>
        </div>
      </label>
    </div>

    <div v-if="cats.length >= 2" class="selector-actions">
      <button @click="selectAll" class="btn-select-all" :disabled="selected.length >= max || selected.length === cats.length">
        全选 (最多{{ max }}只)
      </button>
      <button @click="clearAll" class="btn-clear" :disabled="selected.length === 0">
        清除选择
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMyCatStore } from '../../stores/myCat'
import type { Cat } from '../../types/cat'

interface Props {
  modelValue: string[]
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  max: 5
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const catStore = useMyCatStore()
// 使用 storeToRefs 获取响应式的 cats 引用
const { cats } = storeToRefs(catStore)
const selected = ref<string[]>([...props.modelValue])
const loading = ref(true)

onMounted(async () => {
  try {
    await catStore.fetchCats()
  } catch (err) {
    console.error('[CatMultiSelector] Error fetching cats:', err)
  } finally {
    loading.value = false
  }
})

function getAvatarUrl(cat: Cat): string {
  // 优先使用 base64 头像数据
  if (cat.avatarData) {
    return cat.avatarData
  }
  // 其次使用文件路径
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  // 移除 /api 前缀，添加斜杠
  const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace('/api', '')
  return `${baseURL}/${cat.avatar}`
}

function toggleCat(catId: string) {
  const index = selected.value.indexOf(catId)
  if (index > -1) {
    selected.value = selected.value.filter(id => id !== catId)
  } else {
    if (selected.value.length < props.max) {
      selected.value = [...selected.value, catId]
    }
  }
  emit('update:modelValue', selected.value)
}

function selectAll() {
  const count = Math.min(props.max, cats.value.length)
  selected.value = cats.value.slice(0, count).map(cat => cat.id)
  emit('update:modelValue', selected.value)
}

function clearAll() {
  selected.value = []
  emit('update:modelValue', selected.value)
}

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  selected.value = [...newValue]
}, { deep: true })
</script>

<style scoped>
.cat-multi-selector {
  /* 组件本身不需要外层样式，父容器已提供 */
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.count {
  font-size: 12px;
  color: #888;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #999;
  background: #f8f9fa;
  border-radius: 8px;
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 4px;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  min-height: 100px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid #f0f0f0;
}

.cat-item:hover:not(.disabled) {
  background: #f8f9fa;
}

.cat-item.selected {
  background: #fff5f0;
  border-color: #ff6b35;
}

.cat-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cat-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.cat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 16px;
  color: #666;
}

.cat-info {
  flex: 1;
  min-width: 0;
}

.cat-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.cat-meta {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.selector-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.btn-select-all,
.btn-clear {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
}

.btn-select-all:hover:not(:disabled),
.btn-clear:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #ccc;
}

.btn-select-all:disabled,
.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-select-all:not(:disabled) {
  background: #fff5f0;
  border-color: #ff6b35;
  color: #ff6b35;
}

.btn-select-all:not(:disabled):hover {
  background: #ffe8df;
}
</style>

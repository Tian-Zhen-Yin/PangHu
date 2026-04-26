<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')
const isExpanded = ref(false)

const emit = defineEmits<{
  search: [query: string]
}>()

// 监听输入，实现实时搜索
watch(searchQuery, (newQuery) => {
  emit('search', newQuery)
})

function performSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'Search', query: { q: searchQuery.value } })
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    performSearch()
  }
}

function clearSearch() {
  searchQuery.value = ''
  emit('search', '')
}
</script>

<template>
  <div :class="['search-bar', { expanded: isExpanded }]">
    <div class="search-input-wrapper">
      <span class="search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索指南、模板..."
        @keydown="handleKeydown"
      />
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-btn"
        title="清除"
      >
        ×
      </button>
    </div>
    <button @click="performSearch" class="search-btn">搜索</button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 2px solid var(--color-border-light);
  border-radius: 2rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.3s ease;
  max-width: 400px;
  width: 100%;
}

.search-bar:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-icon {
  font-size: 1rem;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.clear-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-border-light);
  color: var(--color-text-regular);
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
}

.clear-btn:hover {
  background: var(--color-border-light);
}

.search-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.search-btn:hover {
  opacity: 0.9;
}

@media (max-width: 640px) {
  .search-bar {
    max-width: none;
  }

  .search-btn {
    display: none;
  }
}
</style>

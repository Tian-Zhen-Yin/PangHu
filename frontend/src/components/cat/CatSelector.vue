<template>
  <div class="cat-selector" v-click-outside="closeDropdown">
    <div class="current-cat" @click="toggleDropdown">
      <div class="cat-avatar">
        <img v-if="currentCat?.avatar" :src="currentCat.avatar" :alt="currentCat.name" />
        <span v-else class="avatar-placeholder">{{ currentCat?.name?.charAt(0) || '?' }}</span>
      </div>
      <div class="cat-info" v-if="currentCat">
        <span class="cat-name">{{ currentCat.name }}</span>
        <span class="cat-age">{{ currentCat.ageFormatted }}</span>
      </div>
      <span v-else class="no-cat">选择猫咪</span>
      <span class="arrow" :class="{ open: showDropdown }">▼</span>
    </div>

    <div v-if="showDropdown" class="cat-dropdown">
      <div
        v-for="cat in cats"
        :key="cat.id"
        class="cat-item"
        :class="{ active: cat.id === currentCat?.id }"
        @click="handleSelect(cat)"
      >
        <div class="cat-avatar small">
          <img v-if="cat.avatar" :src="cat.avatar" :alt="cat.name" />
          <span v-else class="avatar-placeholder">{{ cat.name?.charAt(0) || '?' }}</span>
        </div>
        <div class="cat-info">
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-meta">{{ cat.breed || '未知品种' }} · {{ cat.ageFormatted }}</div>
        </div>
        <span v-if="cat.id === currentCat?.id" class="check">✓</span>
      </div>

      <div class="divider" v-if="cats.length > 0"></div>

      <div class="add-cat" @click="handleAddCat">
        <span>＋</span>
        <span>添加新猫咪</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMyCatStore } from '../../stores/myCat'
import { storeToRefs } from 'pinia'

const router = useRouter()
const catStore = useMyCatStore()
const { cats, currentCat } = storeToRefs(catStore)

const showDropdown = ref(false)

onMounted(async () => {
  if (cats.value.length === 0) {
    await catStore.fetchCats()
  }
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
}

function handleSelect(cat: any) {
  catStore.selectCat(cat)
  showDropdown.value = false
}

function handleAddCat() {
  showDropdown.value = false
  router.push('/my-cats/new')
}

// v-click-outside directive
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!el.contains(event.target as Node)) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>

<style scoped>
.cat-selector {
  position: relative;
  user-select: none;
}

.current-cat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 20px;
  cursor: pointer;
  background: var(--color-background-soft, #f5f5f5);
  transition: background 0.2s;
  min-width: 120px;
}

.current-cat:hover {
  background: var(--color-background-mute, #e8e8e8);
}

.cat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.cat-avatar.small {
  width: 36px;
  height: 36px;
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 16px;
}

.cat-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.cat-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-age {
  font-size: 11px;
  color: #888;
}

.cat-meta {
  font-size: 12px;
  color: #888;
}

.no-cat {
  font-size: 13px;
  color: #888;
  flex: 1;
}

.arrow {
  font-size: 10px;
  color: #888;
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.cat-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  padding: 6px 0;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.cat-item:hover {
  background: #f5f5f5;
}

.cat-item.active {
  background: #fff5f0;
}

.check {
  color: #ff6b35;
  font-weight: bold;
  margin-left: auto;
}

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.add-cat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  color: #ff6b35;
  font-size: 13px;
  transition: background 0.15s;
}

.add-cat:hover {
  background: #fff5f0;
}
</style>

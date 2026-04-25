<template>
  <div class="cat-selector" v-click-outside="closeDropdown">
    <div class="current-cat" @click="toggleDropdown">
      <div class="cat-avatar">
        <img v-if="currentCat?.avatarData || currentCat?.avatar" :src="getAvatarUrl(currentCat)" :alt="currentCat.name" />
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
      <!-- 切换猫咪列表 -->
      <div class="dropdown-section cats-list">
        <div
          v-for="cat in cats"
          :key="cat.id"
          class="cat-item"
          :class="{ active: cat.id === currentCat?.id }"
          @click="handleSelect(cat)"
        >
          <div class="cat-avatar small">
            <img v-if="cat.avatarData || cat.avatar" :src="getAvatarUrl(cat)" :alt="cat.name" />
            <span v-else class="avatar-placeholder">{{ cat.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="cat-info">
            <div class="cat-name">{{ cat.name }}</div>
            <div class="cat-meta">{{ cat.breed || '未知品种' }} · {{ cat.ageFormatted }}</div>
          </div>
          <span v-if="cat.id === currentCat?.id" class="check">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 管理入口 -->
      <div class="dropdown-section manage-entry">
        <RouterLink to="/my-cats" class="manage-link" @click="closeDropdown">
          <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <span>我的猫咪</span>
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMyCatStore } from '../../stores/myCat'
import { getAvatarUrl } from '../../utils/format'
import { storeToRefs } from 'pinia'
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
  min-width: 220px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  padding: 6px 0;
}

.dropdown-section {
  padding: 4px 0;
}

.cats-list {
  max-height: 240px;
  overflow-y: auto;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.cat-item:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.cat-item.active {
  background: var(--color-primary-light, #fff4ee);
}

.check {
  color: var(--color-primary, #FF8A4C);
  margin-left: auto;
  display: flex;
  align-items: center;
}

.divider {
  height: 1px;
  background: var(--color-border-light, #f0f0f0);
  margin: 4px 0;
}

.manage-entry {
  padding: 4px 8px;
}

.manage-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  text-decoration: none;
  color: var(--color-text-regular, #666);
  border-radius: 8px;
  transition: all 0.15s;
}

.manage-link:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.manage-icon {
  color: var(--color-text-secondary, #999);
}

.manage-link span {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.arrow-icon {
  color: var(--color-text-light, #bbb);
}
</style>

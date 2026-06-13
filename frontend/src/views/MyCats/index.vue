<template>
  <div class="my-cats-page">
    <!-- 背景胖虎水印 -->
    <div class="page-bg-mascot">
      <MascotCharacter expression="happy" size="hero" :animated="false" />
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>我的猫咪</h1>
        <p class="header-subtitle">守护 {{ cats.length }} 位家庭成员</p>
      </div>
      <div class="header-actions">
        <button
          v-if="cats.length >= 2"
          class="btn-secondary"
          @click="$router.push('/my-cats/compare')"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          多猫对比
        </button>
        <button class="btn-primary" @click="$router.push('/my-cats/new')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          添加猫咪
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <MascotCharacter
        expression="yawning"
        size="large"
        :animated="true"
        :float-animation="true"
      />
      <p class="loading-text">正在加载猫咪数据...</p>
    </div>

    <EmptyState
      v-else-if="cats.length === 0"
      title="还没有添加猫咪档案"
      description="添加你的第一只喵星人，开始记录成长足迹"
      expression="confused"
      :show-action="true"
      action-text="添加第一只猫咪"
      :action-path="'/my-cats/new'"
      @action="() => $router.push('/my-cats/new')"
    />

    <div v-else class="cats-grid">
      <div
        v-for="cat in cats"
        :key="cat.id"
        class="pet-premium-card"
        :class="{ 'is-active': cat.id === currentCat?.id }"
        @click="handleSelectCat(cat)"
      >
        <span v-if="cat.id === currentCat?.id" class="active-badge">当前记录中</span>

        <div class="pet-main-info">
          <div class="avatar-ring">
            <img v-if="hasAvatar(cat)" :src="getAvatarUrl(cat)" :alt="cat.name" class="pet-avatar" @error="onAvatarError(cat)" />
            <span v-else class="avatar-initials">{{ cat.name?.charAt(0) || '?' }}</span>
          </div>
          <h3 class="pet-name">{{ cat.name }}</h3>
          <p class="pet-meta">{{ cat.breed || '未知品种' }} · {{ cat.gender === 'male' ? '公' : cat.gender === 'female' ? '母' : '未知' }}</p>
          <div class="pet-stats-pill">
            <span>{{ cat.ageFormatted }}</span>
            <span class="divider">|</span>
            <span>{{ formatWeight(cat.weight) }}</span>
          </div>
        </div>

        <div class="pet-action-dock">
          <button class="dock-item" title="详情" @click.stop="$router.push(`/my-cats/${cat.id}`)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <button class="dock-item" title="编辑" @click.stop="$router.push(`/my-cats/${cat.id}/edit`)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="dock-item" title="疫苗" @click.stop="$router.push(`/my-cats/${cat.id}/vaccines`)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </button>
          <button class="dock-item delete" title="删除" @click.stop="handleDelete(cat)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMyCatStore } from '../../stores/myCat.js'
import EmptyState from '../../components/common/EmptyState.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import { formatWeight, getAvatarUrl } from '../../utils/format.js'
import type { Cat } from '../../types/cat.js'

const catStore = useMyCatStore()
const { cats, currentCat, loading } = storeToRefs(catStore)

const failedAvatars = ref<Set<string>>(new Set())

onMounted(() => catStore.fetchCats())

function handleSelectCat(cat: Cat) {
  catStore.selectCat(cat)
}

function hasAvatar(cat: Cat): boolean {
  return !!(cat.avatarData || cat.avatar) && !failedAvatars.value.has(cat.id)
}

function onAvatarError(cat: Cat) {
  failedAvatars.value.add(cat.id)
}

// 普通的点击删除确认
async function handleDelete(cat: Cat) {
  if (!confirm(`确定要删除 ${cat.name} 的档案吗？此操作不可恢复。`)) return
  await catStore.deleteCat(cat.id)
}
</script>

<style scoped>
.my-cats-page {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 80px;
  position: relative;
  box-sizing: border-box;
  /* 用 clip 而非 hidden：hidden 会触发 CSS 规范的副作用——
     把 overflow-y 强制变成 auto，导致容器内部出现垂直滚动条 */
  overflow-x: clip;
}

/* 背景胖虎水印 */
.page-bg-mascot {
  position: absolute;
  right: -60px;
  bottom: -60px;
  opacity: 0.06;
  z-index: 0;
  pointer-events: none;
  transform: rotate(-15deg);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg-page, #F9F8F6);
  padding: 16px 0 8px 0;
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-text-placeholder);
  margin: 4px 0 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 按钮样式 */
.btn-primary {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 100px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

.btn-primary:hover {
  background: var(--color-primary-gradient-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 162, 97, 0.4);
}

.btn-secondary {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  border: 1.5px solid var(--color-text-secondary);
  padding: 10px 18px;
  border-radius: 100px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-primary-medium);
  border-color: var(--color-primary);
  color: #FFFFFF;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px; /* 新增：页面级加载需要更大的垂直空间 */
  padding: 80px 20px;
  gap: 20px;
  width: 100%;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: var(--color-text-placeholder);
  margin: 0;
  text-align: center;
}

/* 猫咪卡片网格 */
.cats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  position: relative;
  z-index: 1;
}

/* 高级猫咪卡片 */
.pet-premium-card {
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 28px;
  padding: 24px;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  position: relative;
}

.pet-premium-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(244, 162, 97, 0.12);
  border-color: var(--color-primary-medium);
}

/* 当前选中状态 */
.pet-premium-card.is-active {
  border-color: var(--color-primary-medium);
  box-shadow: 0 12px 32px rgba(244, 162, 97, 0.18);
}

/* 当前标签 - 胶囊形状 */
.active-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, var(--color-primary-gradient) 0%, var(--color-primary-dark) 100%);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 100px;
  letter-spacing: 0.3px;
}

/* 头像环 */
.avatar-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--color-bg-warm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
}

/* 猫咪信息 */
.pet-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.pet-meta {
  font-size: 13px;
  color: var(--color-text-placeholder);
  margin: 0 0 12px 0;
}

/* 状态药丸 */
.pet-stats-pill {
  background: var(--color-bg-page);
  padding: 6px 18px;
  border-radius: 100px;
  font-size: 12px;
  color: var(--color-text-regular);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-stats-pill .divider {
  color: var(--color-text-secondary);
}

/* 操作按钮dock */
.pet-action-dock {
  display: flex;
  background: var(--color-bg-block-hover);
  border-radius: 16px;
  padding: 4px;
  width: 100%;
  gap: 4px;
  margin-top: 20px;
}

.dock-item {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dock-item svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-regular);
  transition: color 0.2s;
}

.dock-item:hover {
  background: #FFFFFF;
}

.dock-item:hover svg {
  color: var(--color-primary);
}

/* 删除按钮特殊样式 */
.dock-item.delete:hover {
  background: #FEE2E2;
}

.dock-item.delete:hover svg {
  color: var(--color-danger);
}

/* 移动端适配 */
@media (max-width: 640px) {
  /* 新增：移动端加载状态调整 */
  .loading-state {
    min-height: 300px; /* 移动端减小高度 */
    padding: 60px 16px;
  }

  .my-cats-page {
    padding: 16px 12px 80px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    top: 0;
    padding: 8px 0 12px 0;
  }

  .header-actions {
    width: 100%;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    justify-content: center;
    padding: 10px 14px;
    font-size: 13px;
  }

  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .cats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .pet-premium-card {
    padding: 20px;
  }

  .page-bg-mascot {
    right: -80px;
    bottom: -80px;
  }

  .pet-action-dock {
    margin-top: 16px;
  }

  .dock-item {
    padding: 8px 6px;
  }

  .dock-item svg {
    width: 16px;
    height: 16px;
  }
}
</style>
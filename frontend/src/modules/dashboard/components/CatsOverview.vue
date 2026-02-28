<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { DashboardCatCard } from '../types'
import type { Cat } from '../../../types/cat'

const props = defineProps<{
  cats: DashboardCatCard[]
  currentCat?: Cat | null
}>()

// 其他猫咪折叠状态
const showOtherCats = ref(false)

// 其他猫咪列表
const otherCats = computed(() =>
  props.cats.filter(c => c.cat.id !== props.currentCat?.id)
)

function getAvatarUrl(cat: any): string {
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return `${baseURL}${cat.avatar}`
}

function getAgeText(birthDate?: string | null): string {
  if (!birthDate) return '年龄未知'
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return '新生'
  if (months < 12) return `${months}个月`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}岁`
  return `${years}岁${remainingMonths}个月`
}

function toggleOtherCats() {
  showOtherCats.value = !showOtherCats.value
}
</script>

<template>
  <div class="cats-overview">
    <!-- 空状态 -->
    <div v-if="cats.length === 0" class="empty-state">
      <span class="empty-icon">🐾</span>
      <span class="empty-text">还没有添加猫咪哦</span>
      <RouterLink to="/my-cats/new" class="empty-action">添加第一只猫咪</RouterLink>
    </div>

    <template v-else>
      <!-- 当前猫咪卡片 - 半沉浸式主舞台 -->
      <RouterLink
        v-if="currentCat"
        :to="`/my-cats/${currentCat.id}`"
        class="current-cat-stage"
      >
        <div class="stage-content">
          <!-- 左侧：大头像 -->
          <div class="avatar-wrapper">
            <img
              v-if="currentCat.avatar"
              :src="getAvatarUrl(currentCat)"
              class="cat-avatar"
              :alt="currentCat.name"
            />
            <div v-else class="cat-avatar-placeholder">
              {{ currentCat.name?.charAt(0) || '?' }}
            </div>
          </div>

          <!-- 右侧：三层信息结构 -->
          <div class="cat-details">
            <!-- 第一层：名字 -->
            <h3 class="cat-name">{{ currentCat.name }}</h3>

            <!-- 第二层：年龄 · 性别 -->
            <div class="cat-meta">
              <span>{{ getAgeText(currentCat.birthDate) }}</span>
              <span class="separator">·</span>
              <span v-if="currentCat.gender">
                {{ currentCat.gender === 'male' ? '♂ 弟弟' : '♀ 妹妹' }}
              </span>
            </div>

            <!-- 第三层：体重趋势 -->
            <div v-if="currentCat.weight" class="weight-section">
              <div class="weight-main">
                <span class="weight-number">{{ currentCat.weight }}</span>
                <span class="weight-unit">kg</span>
              </div>
              <div class="weight-trend">
                <span class="trend-label">当前体重</span>
              </div>
            </div>
          </div>

          <!-- 右侧箭头 -->
          <div class="stage-arrow">
            <span>→</span>
          </div>
        </div>
      </RouterLink>

      <!-- 其他猫咪 - 折叠式 -->
      <div v-if="otherCats.length > 0" class="other-cats">
        <button class="toggle-btn" @click.prevent="toggleOtherCats">
          <span class="toggle-icon">{{ showOtherCats ? '▼' : '▶' }}</span>
          <span class="toggle-text">其他猫咪 ({{ otherCats.length }})</span>
        </button>

        <div v-show="showOtherCats" class="cats-grid">
          <RouterLink
            v-for="item in otherCats"
            :key="item.cat.id"
            :to="`/my-cats/${item.cat.id}`"
            class="mini-cat-card"
          >
            <img
              v-if="item.cat.avatar"
              :src="getAvatarUrl(item.cat)"
              class="mini-avatar"
              :alt="item.cat.name"
            />
            <div v-else class="mini-avatar-placeholder">
              {{ item.cat.name?.charAt(0) || '?' }}
            </div>
            <div class="mini-info">
              <span class="mini-name">{{ item.cat.name }}</span>
              <span class="mini-age">{{ item.ageText }}</span>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- 添加按钮 -->
      <RouterLink to="/my-cats/new" class="add-cat-btn">
        <span class="add-icon">+</span>
        <span>添加猫咪</span>
      </RouterLink>
    </template>
  </div>
</template>

<style scoped>
.cats-overview {
  width: 100%;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-5xl) var(--space-xl);
  background: var(--color-card);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--color-border);
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.empty-action {
  padding: var(--space-md) var(--space-xl);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  margin-top: var(--space-md);
}

/* 当前猫咪 - 半沉浸式主舞台 */
.current-cat-stage {
  display: block;
  background: linear-gradient(145deg, var(--color-primary-dim) 0%, var(--color-secondary-dim) 50%, var(--color-bg) 100%);
  border-radius: var(--radius-2xl);
  padding: var(--space-4xl);
  text-decoration: none;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.current-cat-stage:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.stage-content {
  display: flex;
  align-items: center;
  gap: var(--space-2xl);
}

/* 左侧大头像 */
.avatar-wrapper {
  flex-shrink: 0;
}

.cat-avatar,
.cat-avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: var(--shadow-warm-md);
}

.cat-avatar-placeholder {
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-bold);
  font-size: 40px;
}

/* 右侧详情 - 三层结构 */
.cat-details {
  flex: 1;
  min-width: 0;
}

/* 第一层：名字 */
.cat-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-sm) 0;
}

/* 第二层：年龄·性别 */
.cat-meta {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  margin-bottom: var(--space-lg);
}

.separator {
  margin: 0 var(--space-sm);
  opacity: 0.5;
}

/* 第三层：体重趋势 */
.weight-section {
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
}

.weight-main {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}

.weight-number {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary-dark);
}

.weight-unit {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.weight-trend {
  padding: var(--space-xs) var(--space-md);
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-full);
}

.trend-label {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

/* 箭头 */
.stage-arrow {
  color: var(--color-primary);
  font-size: var(--text-xl);
  opacity: 0.6;
  transition: transform var(--transition-base);
}

.current-cat-stage:hover .stage-arrow {
  transform: translateX(4px);
}

/* 其他猫咪 - 折叠式 */
.other-cats {
  margin-top: var(--space-lg);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: none;
  border: none;
  padding: var(--space-md) var(--space-lg);
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: var(--radius-lg);
  transition: background var(--transition-base);
}

.toggle-btn:hover {
  background: var(--color-bg);
}

.toggle-icon {
  font-size: 10px;
}

.cats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-md);
  padding-top: var(--space-md);
}

.mini-cat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  text-decoration: none;
  border: 1px solid var(--color-border);
  transition: all var(--transition-base);
}

.mini-cat-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-xs);
}

.mini-avatar,
.mini-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.mini-avatar-placeholder {
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-dark);
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.mini-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mini-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-age {
  font-size: 11px;
  color: var(--color-text-sub);
}

/* 添加按钮 */
.add-cat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.add-cat-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-dim);
}

.add-icon {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
}
</style>
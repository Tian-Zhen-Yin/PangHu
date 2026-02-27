<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardCatCard } from '../types'
import type { Cat } from '../../../types/cat'

defineProps<{
  cats: DashboardCatCard[]
  currentCat?: Cat | null
}>()

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
</script>

<template>
  <div class="cats-overview">
    <div class="section-header">
      <h3 class="section-title">🐱 我的猫咪</h3>
      <RouterLink to="/my-cats/new" class="add-btn">+ 添加</RouterLink>
    </div>

    <div v-if="cats.length === 0" class="empty-state">
      <span class="empty-icon">🐾</span>
      <span class="empty-text">还没有添加猫咪哦</span>
      <RouterLink to="/my-cats/new" class="empty-action">添加第一只猫咪</RouterLink>
    </div>

    <template v-else>
      <!-- 当前猫咪卡片 -->
      <RouterLink
        v-if="currentCat"
        :to="`/my-cats/${currentCat.id}`"
        class="current-cat-card"
      >
        <div class="current-cat-header">
          <span class="current-badge">当前猫咪</span>
          <div class="current-cat-actions">
            <span class="view-detail">查看详情 →</span>
          </div>
        </div>
        <div class="current-cat-content">
          <img
            v-if="currentCat.avatar"
            :src="getAvatarUrl(currentCat)"
            class="current-cat-avatar"
            :alt="currentCat.name"
          />
          <div v-else class="current-cat-avatar-placeholder">
            {{ currentCat.name?.charAt(0) || '?' }}
          </div>
          <div class="current-cat-info">
            <h4 class="current-cat-name">{{ currentCat.name }}</h4>
            <div class="current-cat-meta">
              <span class="meta-item">
                <span class="meta-icon">🎂</span>
                {{ getAgeText(currentCat.birthDate) }}
              </span>
              <span v-if="currentCat.gender" class="meta-item">
                <span class="meta-icon">{{ currentCat.gender === 'male' ? '♂️' : '♀️' }}</span>
                {{ currentCat.gender === 'male' ? '弟弟' : '妹妹' }}
              </span>
            </div>
            <div v-if="currentCat.weight" class="current-cat-weight">
              <span class="weight-label">当前体重</span>
              <span class="weight-value">{{ currentCat.weight }} kg</span>
            </div>
          </div>
        </div>
      </RouterLink>

      <!-- 其他猫咪列表 -->
      <div v-if="cats.length > 1" class="other-cats-section">
        <div class="other-cats-title">其他猫咪 ({{ cats.length - 1 }})</div>
        <div class="cats-list">
          <RouterLink
            v-for="item in cats.filter(c => c.cat.id !== currentCat?.id)"
            :key="item.cat.id"
            :to="`/my-cats/${item.cat.id}`"
            class="cat-card"
          >
            <img
              v-if="item.cat.avatar"
              :src="getAvatarUrl(item.cat)"
              class="cat-avatar"
              :alt="item.cat.name"
            />
            <div v-else class="cat-avatar-placeholder">
              {{ item.cat.name?.charAt(0) || '?' }}
            </div>
            <div class="cat-info">
              <span class="cat-name">{{ item.cat.name }}</span>
              <span class="cat-age">{{ item.ageText }}</span>
            </div>
            <span class="arrow-icon">→</span>
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cats-overview {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.add-btn {
  padding: 6px var(--space-md);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  transition: background var(--transition-base);
}

.add-btn:hover {
  background: var(--color-primary-dark);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-4xl) var(--space-lg);
  color: var(--color-text-sub);
}

.empty-icon {
  font-size: var(--text-5xl);
}

.empty-text {
  font-size: var(--text-sm);
}

.empty-action {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  margin-top: var(--space-sm);
  transition: background var(--transition-base);
}

.empty-action:hover {
  background: var(--color-primary-dark);
}

/* 当前猫咪卡片 */
.current-cat-card {
  display: block;
  background: linear-gradient(135deg, var(--color-bg-alt) 0%, var(--color-secondary-dim) 100%);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-decoration: none;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  margin-bottom: var(--space-md);
}

.current-cat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-warm-md);
}

.current-cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.current-badge {
  padding: 4px 10px;
  background: var(--color-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
}

.current-cat-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.view-detail {
  font-size: var(--text-xs);
  color: var(--color-link);
  font-weight: var(--font-medium);
}

.current-cat-content {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.current-cat-avatar,
.current-cat-avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 3px solid white;
  box-shadow: var(--shadow-sm);
}

.current-cat-avatar-placeholder {
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-semibold);
  font-size: var(--text-3xl);
}

.current-cat-info {
  flex: 1;
}

.current-cat-name {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-sm) 0;
}

.current-cat-meta {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.meta-icon {
  font-size: var(--text-base);
}

.current-cat-weight {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-md);
  background: white;
  border-radius: var(--radius-full);
}

.weight-label {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.weight-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

/* 其他猫咪 */
.other-cats-section {
  margin-top: var(--space-md);
}

.other-cats-title {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  margin-bottom: var(--space-sm);
  padding-left: var(--space-xs);
}

.cats-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--transition-base), transform var(--transition-base);
}

.cat-card:hover {
  background: var(--color-bg-alt);
  transform: translateX(4px);
}

.cat-avatar,
.cat-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.cat-avatar-placeholder {
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.cat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cat-name {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.cat-age {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.arrow-icon {
  color: var(--color-primary);
  font-size: var(--text-lg);
}
</style>

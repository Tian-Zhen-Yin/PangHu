<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { DashboardCatCard } from '../types/index.js'
import type { Cat } from '../../../types/cat.js'
import { useMyCatStore } from '../../../stores/myCat.js'
import { formatWeightValue, getAvatarUrl } from '../../../utils/format.js'
import MascotCharacter from '../../../components/mascot/MascotCharacter.vue'

const props = defineProps<{
  cats: DashboardCatCard[]
  currentCat?: Cat | null
}>()

const emit = defineEmits<{
  (e: 'select', cat: Cat): void
}>()

const catStore = useMyCatStore()
const router = useRouter()

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

function selectCat(cat: Cat) {
  catStore.selectCat(cat)
  emit('select', cat)
}

function goToAddCat() {
  router.push('/my-cats/new')
}
</script>

<template>
  <div class="cats-slider-section">
    <!-- 空状态 -->
    <div v-if="cats.length === 0" class="empty-state">
      <div class="empty-mascot">
        <MascotCharacter expression="confused" size="large" :animated="false" />
      </div>
      <p class="empty-text">还没有添加猫咪哦</p>
      <button class="add-first-btn" @click="goToAddCat">
        <span class="btn-icon">+</span>
        添加第一只猫咪
      </button>
    </div>

    <!-- 多猫水平滑块 -->
    <template v-else>
      <div class="slider-header">
        <h3 class="slider-title">我的猫咪</h3>
        <span class="cat-count">{{ cats.length }} 只</span>
      </div>

      <div class="cats-scroller">
        <div class="cats-track">
          <!-- 猫咪卡片 -->
          <div
            v-for="item in cats"
            :key="item.cat.id"
            class="cat-card-slide"
            :class="{ active: item.cat.id === currentCat?.id }"
            @click="selectCat(item.cat)"
          >
            <!-- 选中指示器 -->
            <div v-if="item.cat.id === currentCat?.id" class="active-indicator">
              <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>

            <!-- 头像 -->
            <div class="card-avatar">
              <img
                v-if="item.cat.avatarData || item.cat.avatar"
                :src="getAvatarUrl(item.cat)"
                :alt="item.cat.name"
              />
              <div v-else class="avatar-placeholder">
                {{ item.cat.name?.charAt(0) || '?' }}
              </div>
            </div>

            <!-- 信息 -->
            <div class="card-info">
              <h4 class="card-name">{{ item.cat.name }}</h4>
              <span class="card-meta">{{ getAgeText(item.cat.birthDate) }}</span>
            </div>

            <!-- 体重 -->
            <div v-if="item.cat.weight" class="card-weight">
              <span class="weight-val">{{ formatWeightValue(item.cat.weight) }}</span>
              <span class="weight-unit">kg</span>
            </div>
          </div>

          <!-- 添加猫咪卡片 -->
          <button class="add-cat-slide" @click="goToAddCat">
            <div class="add-icon-wrap">
              <span class="plus-icon">+</span>
            </div>
            <span class="add-label">添加猫咪</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cats-slider-section {
  width: 100%;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 24px;
  border: 2px dashed var(--color-primary-medium);
}

.empty-mascot {
  opacity: 0.8;
}

.empty-text {
  font-size: 15px;
  color: var(--color-text-placeholder);
  margin: 0;
}

.add-first-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.3);
  transition: all 0.3s ease;
}

.add-first-btn:hover {
  background: var(--color-primary-gradient-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 162, 97, 0.4);
}

/* 滑块头部 */
.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.slider-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.cat-count {
  font-size: 13px;
  color: var(--color-text-placeholder);
  background: var(--color-bg-block-hover);
  padding: 4px 12px;
  border-radius: 100px;
}

/* 水平滚动容器 */
.cats-scroller {
  overflow-x: auto;
  margin: 0 -16px;
  padding: 0 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cats-scroller::-webkit-scrollbar {
  display: none;
}

.cats-track {
  display: flex;
  gap: 12px;
  padding-bottom: 8px;
}

/* 猫咪卡片 - 滑块样式 */
.cat-card-slide {
  flex-shrink: 0;
  width: 140px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 20px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.cat-card-slide:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(244, 162, 97, 0.12);
}

.cat-card-slide.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  box-shadow: 0 8px 24px rgba(255, 138, 76, 0.18);
}

/* 选中指示器 */
.active-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  background: var(--color-primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 138, 76, 0.4);
  z-index: 10;
}

.active-indicator .check-icon {
  width: 16px;
  height: 16px;
  color: white;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 头像 */
.card-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-primary-light);
  flex-shrink: 0;
}

.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 700;
}

/* 信息 */
.card-info {
  text-align: center;
  width: 100%;
}

.card-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 12px;
  color: var(--color-text-placeholder);
}

/* 体重 */
.card-weight {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 12px;
  background: var(--color-bg-page);
  border-radius: 100px;
}

.weight-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
}

.weight-unit {
  font-size: 11px;
  color: var(--color-text-placeholder);
}

/* 添加卡片 */
.add-cat-slide {
  flex-shrink: 0;
  width: 100px;
  padding: 16px;
  background: var(--color-bg-page);
  border-radius: 20px;
  border: 2px dashed var(--color-border-light);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.add-cat-slide:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.add-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  font-size: 24px;
  color: white;
  font-weight: 300;
}

.add-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.add-cat-slide:hover .add-label {
  color: var(--color-primary);
}

/* 移动端 */
@media (max-width: 640px) {
  .cat-card-slide {
    width: 120px;
    padding: 12px;
  }

  .card-avatar {
    width: 56px;
    height: 56px;
  }

  .add-cat-slide {
    width: 90px;
  }
}
</style>
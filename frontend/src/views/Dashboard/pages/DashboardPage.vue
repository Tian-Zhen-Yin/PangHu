<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth.js'
import { useMyCatStore } from '../../../stores/myCat.js'
import { usePetStore } from '../../../stores/pet.js'
import { getProactiveAdvice } from '../../../api/proactive.js'
import { getWeightAnalysis } from '../../../api/weightStandard.js'
import WeightGauge from '../../../components/charts/WeightGauge.vue'
import SectionHeader from '../../../components/shared/SectionHeader.vue'
import StatusPill from '../components/StatusPill.vue'
import TimelineItem from '../components/TimelineItem.vue'
import MascotCharacter from '../../../components/mascot/MascotCharacter.vue'
import { mapApiTypeToVisualType } from '../utils/recordHelpers.js'
import { getAgeText } from '../utils/formatters.js'
import { getImageUrl } from '../../../utils/format.js'
import type { DashboardCatCard, DashboardReminder, DashboardRecentRecord } from '../types/index.js'
import type { Cat } from '../../../types/cat.js'
import TodayPlayCard from '../../../components/home/TodayPlayCard.vue'

const MAX_RECENT_RECORDS = 6

const authStore = useAuthStore()
const catStore = useMyCatStore()
const petStore = usePetStore()
const router = useRouter()

const reminders = ref<DashboardReminder[]>([])
const catCards = ref<DashboardCatCard[]>([])
const recentRecords = ref<DashboardRecentRecord[]>([])
const isLoading = ref(true)
const healthAnalysis = ref<any>(null)
const weightAnalysis = ref<any>(null)
const avatarErrorIds = ref<Set<string>>(new Set())

function onAvatarError(catId: string) {
  avatarErrorIds.value.add(catId)
}

function hasAvatar(cat: any): boolean {
  if (avatarErrorIds.value.has(cat.id)) return false
  return !!(cat.avatarData || cat.avatar)
}

const otherCats = computed(() => {
  if (!catStore.currentCat) return []
  return catCards.value.filter(item => item.cat.id !== catStore.currentCat?.id)
})

function getCatAvatarUrl(cat: any): string {
  if (cat.avatarData) return cat.avatarData
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  return cat.avatar.startsWith('/') ? cat.avatar : `/${cat.avatar}`
}

async function onCatSelect(cat: Cat) {
  reminders.value = []
  recentRecords.value = []
  await loadCatData(cat)
}

async function loadCatData(cat: Cat) {
  try {
    // Run independent API calls in parallel instead of sequentially
    const [adviceResult, weightResult] = await Promise.allSettled([
      getProactiveAdvice(cat.id, ['vaccine', 'weight', 'general']),
      getWeightAnalysis(cat.id),
    ])

    const advice = adviceResult.status === 'fulfilled' ? adviceResult.value : null
    if (advice) healthAnalysis.value = advice

    if (weightResult.status === 'fulfilled') weightAnalysis.value = weightResult.value.data
    else if (weightResult.status === 'rejected') console.error('获取体重分析失败:', weightResult.reason)

    if (advice?.vaccineAdvice) {
      reminders.value.push({
        id: 'vaccine', type: 'vaccine', title: '疫苗提醒',
        description: advice.vaccineAdvice.nextAction, icon: '💉', urgency: 'medium'
      })
    }
    if (advice?.weightAdvice && advice.weightAdvice.status !== 'normal') {
      reminders.value.push({
        id: 'weight', type: 'weight', title: '体重提醒',
        description: advice.weightAdvice.suggestion,
        icon: advice.weightAdvice.status === 'thin' ? '📉' : '📈', urgency: 'medium'
      })
    }
    if (advice?.generalAdvice) {
      reminders.value.push({
        id: 'general', type: 'general', title: '健康建议',
        description: advice.generalAdvice, icon: '💡', urgency: 'low'
      })
    }

    await petStore.fetchRecords(cat.id)
    const records = petStore.sortedRecords
    if (records && records.length > 0) {
      const recordsToMap = records.slice(0, MAX_RECENT_RECORDS)

      recentRecords.value = recordsToMap.map((r: any, index: number) => {
        const visualType = mapApiTypeToVisualType(r.type)
        const rawPhotos = Array.isArray(r.photos) ? r.photos : []
        const photos = rawPhotos.map((photo: string) => getImageUrl(photo))

        let weightChange: { value: number; direction: 'up' | 'down' | 'stable' } | undefined = undefined
        if (r.weight && index > 0 && recordsToMap[index - 1]?.weight) {
          const currentWeight = parseFloat(Number(r.weight).toFixed(2))
          const prevWeight = parseFloat(Number(recordsToMap[index - 1]?.weight).toFixed(2))
          const diff = currentWeight - prevWeight
          if (Math.abs(diff) >= 0.01) {
            weightChange = {
              value: parseFloat(Math.abs(diff).toFixed(2)),
              direction: diff > 0 ? 'up' : 'down'
            }
          }
        }

        return {
          id: r.id, catId: cat.id, catName: cat.name || '猫咪',
          type: visualType, originalType: r.type,
          title: r.weight ? `体重: ${r.weight}kg` : '记录',
          date: new Date(r.recordDate).toLocaleDateString('zh-CN'),
          rawDate: r.recordDate,
          weight: r.weight ? parseFloat(Number(r.weight).toFixed(2)) : undefined,
          weightChange, notes: r.notes, photos,
          isAdoptionDay: r.isAdoptionDay,
          icon: r.type === 'weight' ? '⚖️' : r.type === 'vaccine' ? '💉' : '📝'
        }
      })
    }
  } catch (err) {
    console.error('加载猫咪数据失败:', err)
  }
}

function addRecord() { router.push('/timeline?action=add') }
function goToAIChat() { router.push('/ai-chat') }
function viewAllRecords() { router.push('/timeline') }
function viewRecordDetail(record: DashboardRecentRecord) { router.push(`/timeline?record=${record.id}`) }

const limitedRecentRecords = computed(() => recentRecords.value.slice(0, MAX_RECENT_RECORDS))

const timelineStats = computed(() => {
  const records = recentRecords.value
  const weightRecords = records.filter(r => typeof r.weight === 'number')
  const latestWeight = weightRecords[0]?.weight
  const latestChange = weightRecords[0]?.weightChange
  return {
    total: records.length,
    latestWeight,
    latestChange,
  }
})

function groupLabelFor(rawDate?: string): string {
  if (!rawDate) return '更早'
  const d = new Date(rawDate)
  if (Number.isNaN(d.getTime())) return '更早'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (diffDays <= 0) return '今天'
  if (diffDays <= 7) return '本周'
  if (now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()) return '本月'
  return '更早'
}

const groupedRecords = computed(() => {
  const groups: { label: string; items: DashboardRecentRecord[] }[] = []
  for (const record of limitedRecentRecords.value) {
    const label = groupLabelFor(record.rawDate)
    let group = groups.find(g => g.label === label)
    if (!group) {
      group = { label, items: [] }
      groups.push(group)
    }
    group.items.push(record)
  }
  return groups
})

onMounted(async () => {
  if (!authStore.isAuthenticated) return
  try {
    await catStore.fetchCats()
    const cats = catStore.cats
    if (cats && cats.length > 0) {
      catCards.value = cats.map((cat: Cat) => ({ cat, ageText: getAgeText(cat) }))
      const cat = catStore.currentCat ?? cats[0]
      if (!cat) return
      await loadCatData(cat)
    }
  } catch (err) {
    console.error('加载猫咪数据失败:', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dashboard-page">
    <!-- Guest state -->
    <div v-if="!authStore.isAuthenticated" class="guest-state">
      <div class="guest-content">
        <img src="@/assets/icon/记一笔.webp" alt="欢迎" class="welcome-icon" />
        <h2 class="guest-title">欢迎使用哈吉咪养成计划</h2>
        <p class="guest-desc">登录后即可记录你的喵星人成长足迹</p>
        <div class="guest-actions">
          <RouterLink to="/login" class="btn btn-primary">立即登录</RouterLink>
          <RouterLink to="/register" class="btn btn-secondary">注册账号</RouterLink>
        </div>
      </div>
    </div>

    <!-- Authenticated Dashboard -->
    <div v-else class="dashboard-content">
      <div v-if="isLoading" class="loading-state">
        <MascotCharacter expression="yawning" size="large" :animated="true" :float-animation="true" />
        <p class="loading-text">正在加载仪表盘数据...</p>
      </div>

      <template v-else-if="catStore.currentCat">
        <!-- 1. Hero Card: Profile + Actions -->
        <section class="hero-card">
          <div class="hero-content">
            <div class="profile-bar">
              <div class="cat-profile">
                <div class="profile-avatar">
                  <img
                    v-if="hasAvatar(catStore.currentCat)"
                    :src="getCatAvatarUrl(catStore.currentCat)"
                    :alt="catStore.currentCat.name"
                    @error="onAvatarError(catStore.currentCat.id)"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ catStore.currentCat.name?.charAt(0) || '?' }}
                  </div>
                </div>
                <div class="profile-info">
                  <div class="profile-name-row">
                    <h2 class="profile-name">{{ catStore.currentCat.name }}</h2>
                    <span class="current-badge">当前</span>
                  </div>
                  <div class="profile-chips">
                    <span class="profile-chip">{{ getAgeText(catStore.currentCat) }}</span>
                    <span class="profile-chip">{{ catStore.currentCat.weight || '--' }}kg</span>
                  </div>
                </div>
              </div>
              <StatusPill
                :weight-status="healthAnalysis?.weightAdvice?.status"
                :general-advice="healthAnalysis?.generalAdvice"
                :cat-name="catStore.currentCat.name"
                @click="goToAIChat"
              />
            </div>

            <div class="actions-row">
              <button class="hero-action-btn primary" @click="addRecord">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                记一笔
              </button>
              <button class="hero-action-btn secondary" @click="goToAIChat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                AI 咨询
              </button>
            </div>
          </div>
        </section>

        <!-- Today Play Card -->
        <TodayPlayCard v-if="catStore.currentCat" class="mb-4" />

        <!-- 2. Data Grid (extracted from hero) -->
        <section class="data-grid-section">
          <div class="data-grid">
            <div class="data-item gauge-card">
              <span class="data-label">当前体重</span>
              <div class="gauge-container">
                <WeightGauge
                  :value="catStore.currentCat.weight || 0"
                  :min="weightAnalysis ? weightAnalysis.min - (weightAnalysis.max - weightAnalysis.min) * 0.5 : 1.5"
                  :max="weightAnalysis ? weightAnalysis.max + (weightAnalysis.max - weightAnalysis.min) * 0.5 : 5.0"
                  :standard-min="weightAnalysis?.min || 2.5"
                  :standard-max="weightAnalysis?.max || 4.0"
                />
              </div>
            </div>

            <div class="data-item todos-card">
              <span class="data-label">近期待办</span>
              <div class="todos-list">
                <label v-for="todo in reminders.slice(0, 3)" :key="todo.id" class="todo-item">
                  <input type="checkbox" class="todo-checkbox" />
                  <div class="todo-content">
                    <span class="todo-title">{{ todo.title }}</span>
                    <span class="todo-date" :class="{ urgent: todo.urgency === 'high' }">{{ todo.description }}</span>
                  </div>
                </label>
                <div v-if="reminders.length === 0" class="todos-empty">
                  <span class="todo-checkbox done"></span>
                  <span class="todo-text">暂无待办</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. Other cats -->
        <section v-if="otherCats.length > 0" class="other-cats-section">
          <SectionHeader title="其他家庭成员" :subtitle="`共 ${catCards.length} 只`" />
          <div class="cats-pills">
            <button
              v-for="item in otherCats"
              :key="item.cat.id"
              class="cat-pill"
              @click="onCatSelect(item.cat)"
            >
              <div class="pill-avatar">
                <img
                  v-if="hasAvatar(item.cat)"
                  :src="getCatAvatarUrl(item.cat)"
                  :alt="item.cat.name"
                  @error="onAvatarError(item.cat.id)"
                />
                <div v-else class="avatar-placeholder pill">
                  {{ item.cat.name?.charAt(0) || '?' }}
                </div>
              </div>
              <div class="pill-info">
                <span class="pill-name">{{ item.cat.name }}</span>
                <span class="pill-weight">{{ item.cat.weight || '--' }}kg</span>
              </div>
            </button>
            <button class="add-cat-pill" @click="router.push('/my-cats/new')">
              <span class="plus-icon-pill">+</span>
            </button>
          </div>
        </section>

        <!-- 4. Timeline -->
        <section v-if="limitedRecentRecords.length > 0" class="timeline-section">
          <SectionHeader title="成长足迹" action-label="查看全部" @action="viewAllRecords" />

          <div class="timeline-stats">
            <div class="stat-cell">
              <span class="stat-num">{{ timelineStats.total }}</span>
              <span class="stat-label">条记录</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-cell">
              <span class="stat-num">
                {{ timelineStats.latestWeight != null ? timelineStats.latestWeight : '--' }}<span class="stat-unit">kg</span>
              </span>
              <span class="stat-label">最新体重</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-cell">
              <span
                class="stat-num"
                :class="timelineStats.latestChange ? `change-${timelineStats.latestChange.direction}` : ''"
              >
                <template v-if="timelineStats.latestChange">
                  {{ timelineStats.latestChange.direction === 'up' ? '+' : '-' }}{{ timelineStats.latestChange.value }}<span class="stat-unit">kg</span>
                </template>
                <template v-else>—</template>
              </span>
              <span class="stat-label">较上次</span>
            </div>
          </div>

          <div class="timeline-vertical">
            <template v-for="group in groupedRecords" :key="group.label">
              <div class="group-label">{{ group.label }}</div>
              <TimelineItem
                v-for="record in group.items"
                :key="record.id"
                :record="record"
                :is-first="record.id === limitedRecentRecords[0]?.id"
                :is-last="record.id === limitedRecentRecords[limitedRecentRecords.length - 1]?.id"
                @click="viewRecordDetail(record)"
              />
            </template>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
  position: relative;
  background: var(--color-bg-page);
  min-height: 100vh;
}

.guest-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: var(--space-lg);
}

/* Dashboard 内容容器 */
.dashboard-content {
  min-height: 100vh; /* 占满整个视口高度 */
  display: flex;
  flex-direction: column;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh; /* 占满整个视口高度，实现垂直居中 */
  padding: 80px 20px;
  gap: 20px;
  width: 100%;
  text-align: center;
  flex: 1; /* 占据剩余空间 */
}

.loading-text {
  font-size: 14px;
  color: var(--color-text-placeholder);
  margin: 0;
  text-align: center;
}

.guest-content {
  text-align: center;
  width: 100%;
  max-width: 500px;
}

.welcome-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto var(--space-lg);
  object-fit: contain;
  display: block;
}

.guest-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.guest-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 28px 0;
}

.guest-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.btn {
  padding: var(--space-md) 28px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--color-primary-gradient);
  color: var(--color-text-white);
  font-weight: var(--font-semibold);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 162, 97, 0.4);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border-light);
}

.btn-secondary:hover {
  border-color: var(--color-border-normal);
  background: var(--color-bg-hover);
}

/* Hero Card */
.hero-card {
  position: relative;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card-normal);
  overflow: hidden;
}

.hero-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.profile-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.cat-profile {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex: 1;
  min-width: 0;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-primary-light);
  flex-shrink: 0;
}

.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }

.profile-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-white);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.profile-info { flex: 1; min-width: 0; }

.profile-name-row { display: flex; align-items: center; gap: 10px; }

.profile-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.current-badge {
  font-size: var(--text-xs);
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
  letter-spacing: 0.02em;
}

/* 年龄/体重信息以 chip 形式呈现，比一行灰字更有信息架构感 */
.profile-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin: var(--space-xs) 0 0 0;
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.actions-row { display: flex; gap: var(--space-md); }

.hero-action-btn {
  flex: 1;
  max-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md) 22px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

.hero-action-btn svg { width: 16px; height: 16px; }

.hero-action-btn.primary {
  background: var(--color-primary-gradient);
  color: var(--color-text-white);
  border: none;
  box-shadow: var(--shadow-primary-btn);
}

.hero-action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 138, 76, 0.35);
}

.hero-action-btn.secondary {
  background: var(--color-bg-block);
  color: var(--color-text-primary);
  border: 1.5px solid var(--color-border-light);
  font-weight: var(--font-medium);
}

.hero-action-btn.secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Data Grid */
.data-grid-section { margin-top: var(--space-md); }

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.data-item {
  background: var(--color-bg-block);
  border-radius: var(--radius-xs);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.data-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-semibold);
  letter-spacing: 0.01em;
}

.gauge-card { min-height: auto; }

.gauge-container {
  flex: 1;
  display: flex;
  align-items: center;
  width: 100%;
}

.todos-card { min-height: auto; }

.todos-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex: 1;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  cursor: pointer;
  padding: 6px var(--space-sm);
  border-radius: var(--radius-xs);
  transition: background 0.2s ease;
}

.todo-item:hover { background: var(--color-bg-card); }

.todo-item input[type="checkbox"] {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--color-border);
  accent-color: var(--color-primary);
  flex-shrink: 0;
  cursor: pointer;
}

.todo-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }

.todo-title {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

.todo-date {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.todo-date.urgent { color: var(--color-warning); font-weight: var(--font-medium); }

.todos-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
}

.todos-empty .todo-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-success);
  background: var(--color-success);
  border-radius: 4px;
  position: relative;
}

.todos-empty .todo-checkbox::after {
  content: '\2713';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text-white);
  font-size: 10px;
  font-weight: bold;
}

/* Other cats */
.other-cats-section { margin-top: var(--space-sm); }

.cats-pills { display: flex; flex-wrap: wrap; gap: var(--space-md); }

.cat-pill {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-pill:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(251, 146, 60, 0.15);
}

.pill-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.pill-avatar img { width: 100%; height: 100%; object-fit: cover; }

.pill-avatar .avatar-placeholder.pill {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-white);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
}

.pill-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-right: 10px;
}

.pill-name {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.pill-weight {
  font-size: var(--text-xs);
  color: var(--color-text-light);
  line-height: 1.2;
}

.add-cat-pill {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-bg-block);
  border: 1px dashed var(--color-border-normal);
  color: var(--color-text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-cat-pill:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.plus-icon-pill { font-size: var(--text-2xl); font-weight: 300; line-height: 1; }

/* Timeline */
.timeline-section { margin-top: var(--space-xl); }

.timeline-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 12px 8px;
  margin: var(--space-sm) 0 var(--space-md);
  box-shadow: var(--shadow-card-normal);
}

.stat-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: 1.1;
  font-family: -apple-system, BlinkMacSystemFont, 'DIN Alternate', sans-serif;
}

.stat-num.change-up { color: var(--color-primary); }
.stat-num.change-down { color: var(--color-success); }

.stat-unit {
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-text-regular);
  margin-left: 1px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.stat-divider {
  width: 1px;
  height: 26px;
  background: var(--color-border-light);
  flex-shrink: 0;
}

.group-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin: 2px 0 8px;
  padding-left: 2px;
}

.group-label:not(:first-child) {
  margin-top: 6px;
}

.timeline-vertical {
  position: relative;
}

@media (min-width: 768px) {
  .timeline-vertical { padding-left: 0; }
}

@media (max-width: 767px) {
  /* 加载状态移动端调整 */
  .loading-state {
    padding: 60px 16px;
  }

  .loading-text {
    font-size: 13px;
  }

  .hero-card { padding: var(--space-lg); border-radius: var(--radius-sm); }
  .profile-bar { padding-bottom: 14px; }
  /* 让 cat-profile 占满第一行，StatusPill 自然换到第二行，避免窄屏挤一行 */
  .cat-profile { flex-basis: 100%; }
  .profile-avatar { width: 52px; height: 52px; }
  .profile-name { font-size: var(--text-lg); }
  .actions-row { gap: var(--space-sm); }
  .hero-action-btn { max-width: none; padding: 9px var(--space-lg); border-radius: var(--radius-md); }
  .data-grid { grid-template-columns: 1fr; gap: var(--space-sm); }
  .data-item { padding: var(--space-md); }
}

@media (max-width: 640px) {
  .timeline-vertical { padding-left: 18px; }
  .timeline-vertical::before { left: 5px; }
}
</style>

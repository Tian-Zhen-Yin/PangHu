<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useMyCatStore } from '../../../stores/myCat'
import { usePetStore } from '../../../stores/pet'
import { getProactiveAdvice } from '../../../api/proactive'
import RemindersCard from '../components/RemindersCard.vue'
import CatsOverview from '../components/CatsOverview.vue'
import QuickActions from '../components/QuickActions.vue'
import RecentRecords from '../components/RecentRecords.vue'
import DailyQuote from '../components/DailyQuote.vue'
import type { DashboardReminder, DashboardCatCard, DashboardRecentRecord } from '../types'
import type { Cat } from '../../../types/cat'

const authStore = useAuthStore()
const catStore = useMyCatStore()
const petStore = usePetStore()

const reminders = ref<DashboardReminder[]>([])
const catCards = ref<DashboardCatCard[]>([])
const recentRecords = ref<DashboardRecentRecord[]>([])

function getAgeText(cat: Cat): string {
  if (!cat.birthDate) return '年龄未知'
  const birth = new Date(cat.birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return '新生'
  if (months < 12) return `${months} 个月`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years} 岁`
  return `${years} 岁 ${remainingMonths} 个月`
}

onMounted(async () => {
  if (!authStore.isAuthenticated) return

  try {
    await catStore.fetchCats()
    const cats = catStore.cats
    if (cats && cats.length > 0) {
      catCards.value = cats.map((cat: Cat) => ({ cat, ageText: getAgeText(cat) }))

      const cat = catStore.currentCat ?? cats[0]
      if (!cat) return

      try {
        const advice = await getProactiveAdvice(cat.id, ['vaccine', 'weight', 'general'])
        if (advice.vaccineAdvice) {
          reminders.value.push({
            id: 'vaccine',
            type: 'vaccine',
            title: '疫苗提醒',
            description: advice.vaccineAdvice.nextAction,
            icon: '💉',
            urgency: 'medium'
          })
        }
        if (advice.weightAdvice && advice.weightAdvice.status !== 'normal') {
          reminders.value.push({
            id: 'weight',
            type: 'weight',
            title: '体重提醒',
            description: advice.weightAdvice.suggestion,
            icon: advice.weightAdvice.status === 'thin' ? '📉' : '📈',
            urgency: 'medium'
          })
        }
        if (advice.generalAdvice) {
          reminders.value.push({
            id: 'general',
            type: 'general',
            title: '健康建议',
            description: advice.generalAdvice,
            icon: '💡',
            urgency: 'low'
          })
        }
      } catch (err) {
        console.error('获取建议失败:', err)
      }

      try {
        await petStore.fetchRecords(cat.id)
        const records = petStore.sortedRecords
        if (records && records.length > 0) {
          recentRecords.value = records.slice(0, 5).map((r: any) => ({
            id: r.id,
            catId: cat.id,
            catName: cat.name || '猫咪',
            type: r.type || 'general',
            title: r.weight ? `体重: ${r.weight}kg` : '记录',
            date: new Date(r.recordDate).toLocaleDateString('zh-CN'),
            icon: r.type === 'weight' ? '⚖️' : r.type === 'vaccine' ? '💉' : '📝'
          }))
        }
      } catch (err) {
        console.error('获取记录失败:', err)
      }
    }
  } catch (err) {
    console.error('加载猫咪数据失败:', err)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <!-- 未登录状态 -->
    <div v-if="!authStore.isAuthenticated" class="guest-state">
      <div class="guest-content">
        <div class="welcome-icon">🐱</div>
        <h2 class="guest-title">欢迎使用哈吉咪养成计划</h2>
        <p class="guest-desc">登录后即可记录你的喵星人成长足迹</p>
        <div class="guest-actions">
          <RouterLink to="/login" class="btn btn-primary">立即登录</RouterLink>
          <RouterLink to="/register" class="btn btn-secondary">注册账号</RouterLink>
        </div>
      </div>
    </div>

    <!-- 已登录 Dashboard -->
    <div v-else class="dashboard-content">
      <!-- 1. 当前猫咪总览（核心卡） -->
      <CatsOverview :cats="catCards" :current-cat="catStore.currentCat" />

      <!-- 2. 快捷操作（轻量化图标按钮） -->
      <QuickActions />

      <!-- 3. 今日提醒 -->
      <RemindersCard v-if="reminders.length > 0" :reminders="reminders" />

      <!-- 4. 最近记录 -->
      <RecentRecords v-if="recentRecords.length > 0" :records="recentRecords" />

      <!-- 5. 每日语录（降级处理） -->
      <DailyQuote />
    </div>
  </div>
</template>

<style scoped>
.dashboard-page { width: 100%; }

.guest-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  padding: var(--space-xl);
}

.guest-content {
  text-align: center;
  max-width: 400px;
}

.welcome-icon {
  font-size: var(--text-5xl);
  margin-bottom: var(--space-xl);
}

.guest-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-lg) 0;
}

.guest-desc {
  font-size: var(--text-base);
  color: var(--color-text-sub);
  margin: 0 0 var(--space-3xl) 0;
}

.guest-actions {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
}

.btn {
  padding: var(--space-lg) var(--space-2xl);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text-main);
  border: 2px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-alt);
  border-color: var(--color-divider);
}

/* 已登录 Dashboard - 单列布局，当前猫咪为主舞台 */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
  max-width: 640px;
}

/* 当前猫咪卡片横跨全宽 */
.dashboard-content > :first-child {
  width: 100%;
}
</style>

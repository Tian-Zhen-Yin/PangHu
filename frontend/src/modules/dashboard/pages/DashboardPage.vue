<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useMyCatStore } from '../../../stores/myCat'
import { usePetStore } from '../../../stores/pet'
import { getProactiveAdvice } from '../../../api/proactive'
import { getWeightAnalysis } from '../../../api/weightStandard'
import MascotCharacter from '../../../components/mascot/MascotCharacter.vue'
import CatsOverview from '../components/CatsOverview.vue'
import MiniSparkline from '../../../components/charts/MiniSparkline.vue'
import type { DashboardCatCard, DashboardReminder, DashboardRecentRecord } from '../types'
import type { Cat } from '../../../types/cat'

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

// 获取当前猫咪的体重趋势
const weightTrend = computed(() => {
  if (!weightAnalysis.value) return null
  const deviation = weightAnalysis.value.deviation
  if (!deviation) return null
  const direction = deviation > 0 ? 'up' : deviation < 0 ? 'down' : 'stable'
  const change = Math.abs(deviation).toFixed(1)
  return { direction, change, value: deviation }
})

// 获取体重历史数据（用于 Sparkline 图表）
const weightHistoryData = computed(() => {
  const history = petStore.weightHistory
  if (history.length === 0) return []

  // 取最近 6 次记录，最多 6 个点
  const recentHistory = history.slice(-6)

  // 提取体重值数组
  return recentHistory.map(h => h.weight)
})

// Sparkline 图表颜色（根据体重趋势）
const sparklineColor = computed(() => {
  if (!weightTrend.value) return '#10b981'
  if (weightTrend.value.direction === 'up') return '#ff9a62'
  if (weightTrend.value.direction === 'down') return '#10b981'
  return '#9ca3af'
})

// 下一个待办事项
const nextTodo = computed(() => {
  if (reminders.value.length === 0) return null
  const urgent = reminders.value.find(r => r.urgency === 'high')
  if (urgent) return urgent
  return reminders.value[0]
})

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

// 猫咪切换回调
async function onCatSelect(cat: Cat) {
  // 重新加载该猫咪的数据
  reminders.value = []
  recentRecords.value = []
  await loadCatData(cat)
}

// 加载猫咪数据
async function loadCatData(cat: Cat) {
  try {
    // 获取健康建议
    const advice = await getProactiveAdvice(cat.id, ['vaccine', 'weight', 'general'])
    healthAnalysis.value = advice

    // 获取体重分析
    try {
      weightAnalysis.value = (await getWeightAnalysis(cat.id)).data
    } catch (e) {
      console.error('获取体重分析失败:', e)
    }

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

    // 获取最近记录
    await petStore.fetchRecords(cat.id)
    const records = petStore.sortedRecords
    if (records && records.length > 0) {
      const recordsToMap = records.slice(0, 6)

      // 获取后端 base URL（用于拼接图片完整 URL）
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'

      recentRecords.value = recordsToMap.map((r: any, index: number) => {
        // 调试日志：检查 photos 数据
        console.log('[Dashboard] Record photos:', r.id, r.photos, Array.isArray(r.photos) ? `array(${r.photos.length})` : typeof r.photos)

        // 将 API 返回的 type 映射到视觉类型（用于 CSS 类名）
        const visualType = mapApiTypeToVisualType(r.type)

        // 处理照片 URL：拼接完整的 base URL
        const rawPhotos = Array.isArray(r.photos) ? r.photos : []
        const photos = rawPhotos.map((photo: string) => {
          // 如果已经是完整 URL，直接返回；否则拼接 base URL
          if (photo.startsWith('http://') || photo.startsWith('https://')) {
            return photo
          }
          return apiBaseUrl + photo
        })

        // 计算体重变化（与上一次记录对比）
        let weightChange: { value: number; direction: 'up' | 'down' | 'stable' } | null = null
        if (r.weight && index > 0 && recordsToMap[index - 1].weight) {
          const currentWeight = parseFloat(Number(r.weight).toFixed(2))
          const prevWeight = parseFloat(Number(recordsToMap[index - 1].weight).toFixed(2))
          const diff = currentWeight - prevWeight
          if (Math.abs(diff) >= 0.01) {
            weightChange = {
              value: parseFloat(Math.abs(diff).toFixed(2)),  // 修复精度
              direction: diff > 0 ? 'up' : 'down'
            }
          }
        }

        return {
          id: r.id,
          catId: cat.id,
          catName: cat.name || '猫咪',
          type: visualType,           // 用于 CSS 样式
          originalType: r.type,       // 原始 API 类型，用于显示准确标签
          title: r.weight ? `体重: ${r.weight}kg` : '记录',
          date: new Date(r.recordDate).toLocaleDateString('zh-CN'),
          weight: r.weight ? parseFloat(Number(r.weight).toFixed(2)) : undefined,  // 修复浮点数精度
          weightChange,               // 体重变化数据
          notes: r.notes,             // 日记备注
          photos,                     // 照片数组 - 已拼接完整 URL
          isAdoptionDay: r.isAdoptionDay,  // 是否纪念日
          icon: r.type === 'weight' ? '⚖️' : r.type === 'vaccine' ? '💉' : '📝'
        }
      })
    }
  } catch (err) {
    console.error('加载猫咪数据失败:', err)
  }
}

// 添加记录
function addRecord() {
  router.push('/timeline?action=add')
}

// AI 咨询
function goToAIChat() {
  router.push('/ai-chat')
}

// 查看更多记录
function viewAllRecords() {
  router.push('/timeline')
}

// 查看猫咪档案
function viewCatProfile(catId: string) {
  router.push(`/my-cats/${catId}`)
}

// 查看记录详情
function viewRecordDetail(record: DashboardRecentRecord) {
  router.push(`/timeline?record=${record.id}`)
}

// 将 API 返回的 type 映射到视觉类型（用于 CSS 类名）
function mapApiTypeToVisualType(apiType: string): string {
  const typeMap: Record<string, string> = {
    // API 类型 -> 视觉类型
    daily: 'general',      // 日常记录 -> general (橙色)
    vaccine: 'vaccine',    // 疫苗 -> vaccine (蓝色)
    deworm: 'vaccine',     // 驱虫 -> vaccine (蓝色，归类到免疫)
    healthCheck: 'medical', // 体检 -> medical (粉色)
    free: 'general',       // 自由记录 -> general (橙色)
    // 兼容可能的旧值
    weight: 'weight',
    general: 'general',
    medical: 'medical'
  }
  return typeMap[apiType] || 'general'
}

// 获取记录图标（SVG）
function getRecordIcon(type: string): string {
  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`

  const iconMap: Record<string, string> = {
    // 体重/秤
    weight: `${baseSvg}<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    // 疫苗/针筒
    vaccine: `${baseSvg}<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-1.5 0-2.8L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>`,
    // 日记/笔
    general: `${baseSvg}<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    // 医疗/心
    medical: `${baseSvg}<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  }
  return iconMap[type] || `${baseSvg}<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
}

// 格式化体重：保留最多两位小数，且去掉末尾无意义的 0
function formatWeight(value?: number | string): string {
  if (value === undefined || value === null) return ''
  // 确保转换为数字后再处理
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return String(value)
  // toFixed(2) 解决精度问题，parseFloat 去掉末尾的 0
  return String(parseFloat(num.toFixed(2)))
}

// 获取体重数值（保留两位小数，去掉末尾无意义的 0）
function getWeightValue(record: DashboardRecentRecord): string {
  // 优先使用 record.weight 字段，确保是有效数字
  if (record.weight !== undefined && record.weight !== null) {
    return formatWeight(record.weight)
  }
  // 兼容从 title 中解析
  if (record.title.includes(':')) {
    const parts = record.title.split(':')
    if (parts.length > 1) {
      const value = parts[1].trim().replace('kg', '').trim()
      return formatWeight(value)
    }
  }
  return record.title
}

// 获取记录类型标签
function getRecordTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    // API 原始类型
    daily: '日常',
    vaccine: '免疫',
    deworm: '驱虫',
    healthCheck: '体检',
    free: '记录',
    // 视觉类型（兼容）
    weight: '体重',
    general: '日常',
    medical: '就医'
  }
  return labelMap[type] || '日常'
}

// 限制最近动态显示数量
const limitedRecentRecords = computed(() => {
  return recentRecords.value.slice(0, 6)
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
    <!-- 未登录状态 -->
    <div v-if="!authStore.isAuthenticated" class="guest-state">
      <div class="guest-content">
        <img src="@/assets/icon/记一笔.png" alt="欢迎" class="welcome-icon" />
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
      <!-- 1. 多猫切换滑块 -->
      <CatsOverview
        :cats="catCards"
        :current-cat="catStore.currentCat"
        @select="onCatSelect"
      />

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <MascotCharacter expression="yawning" size="large" :animated="true" />
        <p>正在加载...</p>
      </div>

      <template v-else-if="catStore.currentCat">
        <!-- 2. 健康仪表盘 - 新版通栏布局 -->
        <section class="health-overview-card">
          <div class="card-header">
            <h3 class="title">{{ catStore.currentCat.name }} 的健康概览</h3>
            <button class="action-link" @click="viewCatProfile(catStore.currentCat.id)">
              查看档案
              <svg class="icon-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <!-- AI 健康分析通栏 Banner -->
          <div class="ai-banner" @click="goToAIChat">
            <div class="ai-content">
              <MascotCharacter
                :expression="healthAnalysis?.weightAdvice?.status === 'normal' ? 'happy' : 'confused'"
                size="small"
                :animated="healthAnalysis?.weightAdvice?.status === 'normal'"
              />
              <div class="ai-text">
                <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="ai-tag highlight-green">
                  ● 体型正常
                </span>
                <span v-else-if="healthAnalysis?.weightAdvice?.status" class="ai-tag highlight-warning">
                  ● 需关注
                </span>
                <span v-else class="ai-tag highlight-neutral">点击咨询</span>
                <span class="ai-desc">
                  {{ healthAnalysis?.generalAdvice || `${catStore.currentCat.name}最近状态很棒，继续保持哦！` }}
                </span>
              </div>
            </div>
            <svg class="text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>

          <!-- 下层数据分割区 -->
          <div class="data-split">
            <!-- 体重数据块 -->
            <div class="data-block weight-block">
              <div class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M3 6l3-3h12l3 3M7 19l4-4m4 4l-4-4M3 6v14a2 2 0 002 2h14a2 2 0 002-2V6"/>
                </svg>
                当前体重
              </div>
              <div class="block-value">
                <div class="weight-number">
                  <span class="num">{{ catStore.currentCat.weight || '--' }}</span>
                  <span v-if="catStore.currentCat.weight" class="unit">kg</span>
                </div>
                <div v-if="weightTrend" class="trend" :class="weightTrend.direction">
                  <span v-if="weightTrend.direction === 'up'">↑ {{ weightTrend.change }}</span>
                  <span v-else-if="weightTrend.direction === 'down'">↓ {{ weightTrend.change }}</span>
                  <span v-else>体重稳定</span>
                </div>
              </div>
              <!-- 趋势线图表 -->
              <div v-if="weightHistoryData.length >= 2" class="sparkline-container">
                <MiniSparkline :data="weightHistoryData" :color="sparklineColor" />
              </div>
            </div>

            <div class="divider"></div>

            <!-- 待办事项数据块 -->
            <div class="data-block todo-block">
              <div class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                下一项待办
              </div>
              <div v-if="nextTodo" class="todo-content" :class="{ urgent: nextTodo.urgency === 'high' }">
                <span class="todo-icon">{{ nextTodo.icon }}</span>
                <div class="todo-text">
                  <div class="todo-title">{{ nextTodo.title }}</div>
                  <div v-if="nextTodo.description" class="todo-desc">{{ nextTodo.description }}</div>
                </div>
              </div>
              <div v-else class="todo-content empty">
                <span class="todo-icon">✓</span>
                <div class="todo-text">
                  <div class="todo-title">暂无待办</div>
                  <div class="todo-desc">一切正常</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. 快捷操作区 -->
        <section class="quick-actions">
          <button class="action-pill" @click="addRecord">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            添加记录
          </button>
          <button class="action-pill secondary" @click="goToAIChat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            AI 咨询
          </button>
          <button class="action-pill secondary" @click="viewAllRecords">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            时间线
          </button>
        </section>

        <!-- 4. 成长线 (Timeline) -->
        <section v-if="limitedRecentRecords.length > 0" class="timeline-section">
          <div class="section-header">
            <h3 class="section-title">成长足迹</h3>
            <div class="view-all" @click="viewAllRecords">
              查看全部 <span class="arrow-icon">›</span>
            </div>
          </div>

          <div class="timeline-container">
            <div
              v-for="(record, index) in limitedRecentRecords"
              :key="record.id"
              class="timeline-item"
              :class="index % 2 === 0 ? 'item-left' : 'item-right'"
              @click="viewRecordDetail(record)"
            >
              <!-- 时间点 -->
              <div class="timeline-dot" :class="`dot-${record.type}`"></div>

              <!-- 内容卡片 -->
              <div class="timeline-content">
                <!-- 类型图标 -->
                <div class="icon-box" :class="`icon-bg-${record.type}`">
                  <span class="svg-icon" v-html="getRecordIcon(record.type)"></span>
                </div>

                <!-- 信息内容 -->
                <div class="info-box">
                  <div class="main-info">
                    <span v-if="record.type === 'weight'" class="value-text">
                      {{ getWeightValue(record) }}<span class="unit">kg</span>
                      <!-- 体重变化指标 -->
                      <span v-if="record.weightChange" class="trend-indicator" :class="record.weightChange.direction">
                        <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path v-if="record.weightChange.direction === 'up'" d="M12 19V5M5 12l7-7 7 7"/>
                          <path v-else d="M12 5v14M5 12l7 7 7-7"/>
                        </svg>
                        <span class="trend-value">{{ formatWeight(record.weightChange.value) }}</span>
                      </span>
                    </span>
                    <span v-else class="title-text">{{ record.title }}</span>
                  </div>
                  <div class="date-text">{{ record.date }}</div>
                  <!-- 日记备注 -->
                  <div v-if="record.notes" class="notes-text">{{ record.notes }}</div>
                </div>

                <!-- 照片墙 -->
                <div v-if="record.photos && record.photos.length > 0" class="photo-wall">
                  <img
                    v-for="(photo, idx) in record.photos.slice(0, 3)"
                    :key="idx"
                    :src="photo"
                    class="mini-photo"
                    alt="记录照片"
                  />
                  <span v-if="record.photos.length > 3" class="more-photos">+{{ record.photos.length - 3 }}</span>
                </div>

                <!-- 标签 -->
                <div class="tag-box">
                  <span v-if="record.isAdoptionDay" class="status-tag anniversary-tag">
                    🎉 纪念日
                  </span>
                  <span v-else class="status-tag">{{ getRecordTypeLabel(record.originalType || record.type) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- 悬浮添加按钮 (FAB) -->
    <button v-if="authStore.isAuthenticated" class="fab-button" @click="addRecord">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* 页面底层主背景色 - 极浅的灰/米色 */
.dashboard-page {
  width: 100%;
  position: relative;
  padding-bottom: 80px;
  background: var(--color-bg-page);
  min-height: 100vh;
}

/* 未登录状态 */
.guest-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 24px;
}

.guest-content {
  text-align: center;
  max-width: 360px;
}

.welcome-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
  object-fit: contain;
  display: block;
}

.guest-title {
  font-size: 24px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 12px 0;
}

.guest-desc {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0 0 28px 0;
}

.guest-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 28px;
  border-radius: 100px;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: white;
  font-weight: 600;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 162, 97, 0.4);
}

.btn-secondary {
  background: #FFFFFF;
  color: #6B7280;
  border: 1.5px solid #E5E7EB;
}

.btn-secondary:hover {
  border-color: #D1D5DB;
  background: #F9FAFB;
}

/* Dashboard 内容区 */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #9CA3AF;
}

/* 健康概览卡片 - 新版通栏布局 */
.health-overview-card {
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: var(--shadow-card-normal);
  margin-bottom: 20px;
}

.health-overview-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.health-overview-card .title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.health-overview-card .action-link {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.health-overview-card .icon-arrow-right {
  width: 14px;
  height: 14px;
}

/* AI 通栏 Banner */
.health-overview-card .ai-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-success-bg);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.health-overview-card .ai-banner:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.health-overview-card .ai-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.health-overview-card .ai-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.health-overview-card .ai-tag {
  font-size: 12px;
  font-weight: 600;
}

.health-overview-card .ai-tag.highlight-green {
  color: var(--color-success);
}

.health-overview-card .ai-tag.highlight-warning {
  color: var(--color-warning);
}

.health-overview-card .ai-tag.highlight-neutral {
  color: var(--color-text-secondary);
}

.health-overview-card .ai-desc {
  font-size: 12px;
  color: var(--color-text-regular);
}

.health-overview-card .text-gray {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* 下层数据分割区 */
.health-overview-card .data-split {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
}

.health-overview-card .data-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-overview-card .divider {
  width: 1px;
  background-color: #f0f0f0;
  margin: 0 20px;
}

.health-overview-card .block-label {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.health-overview-card .block-label svg {
  flex-shrink: 0;
}

/* 体重数值特别样式 */
.health-overview-card .weight-block .block-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.health-overview-card .weight-block .weight-number {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.health-overview-card .weight-block .num {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.health-overview-card .weight-block .unit {
  font-size: 14px;
  color: #666;
}

.health-overview-card .weight-block .trend {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 100px;
  font-weight: 600;
}

.health-overview-card .weight-block .trend.up {
  color: #dc2626;
  background: #fee2e2;
}

.health-overview-card .weight-block .trend.down {
  color: #10b981;
  background: #d1fae5;
}

.health-overview-card .weight-block .trend span {
  display: block;
}

/* Sparkline 图表容器 */
.health-overview-card .weight-block .sparkline-container {
  width: 100%;
  height: 32px;
  margin-top: 4px;
  border-radius: 6px;
  overflow: hidden;
}

/* 待办事项特别样式 */
.health-overview-card .todo-block .todo-content {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.health-overview-card .todo-block .todo-content.urgent {
  background: linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%);
}

.health-overview-card .todo-block .todo-content.empty {
  background: #f0fdf4;
}

.health-overview-card .todo-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.health-overview-card .todo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.health-overview-card .todo-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.health-overview-card .todo-desc {
  font-size: 11px;
  color: #999;
}

.health-overview-card .todo-content.empty .todo-title {
  color: #10b981;
}

.health-overview-card .todo-content.empty .todo-desc {
  color: #6b7280;
}

/* 快捷操作 - 金刚区 */
.quick-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.quick-actions .action-pill {
  flex: 1;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 12px;
}

.action-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--color-primary-gradient);
  color: var(--color-text-white);
  border: none;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-primary-btn);
}

.action-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 138, 76, 0.35);
}

.action-pill svg {
  width: 16px;
  height: 16px;
}

.action-pill.secondary {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  box-shadow: none;
}

.action-pill.secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 成长线 (Timeline) */
.timeline-section {
  margin-top: 24px;
}

.timeline-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.timeline-section .section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.timeline-section .view-all {
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.timeline-section .view-all:hover {
  color: var(--color-primary);
}

.timeline-section .arrow-icon {
  font-size: 16px;
  margin-left: 2px;
  line-height: 1;
  transform: translateY(-1px);
}

/* 时间轴容器 */
.timeline-container {
  position: relative;
  padding: 0 4px;
}

/* 中轴线 */
.timeline-container::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background: var(--color-border-light);
  border-radius: 2px;
}

/* 时间轴项目 */
.timeline-item {
  position: relative;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

/* 时间点（彩色糖果点） */
.timeline-dot {
  position: absolute;
  left: 9px;
  top: 20px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid var(--color-bg-page);
  z-index: 1;
  flex-shrink: 0;
}

.timeline-dot.dot-weight {
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
}

.timeline-dot.dot-vaccine {
  background: var(--color-info);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.timeline-dot.dot-general {
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 138, 76, 0.15);
}

.timeline-dot.dot-medical {
  background: var(--color-danger);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
}

/* 时间轴内容卡片 */
.timeline-content {
  position: relative;
  margin-left: 44px;
  padding: 14px 16px;
  background: var(--color-bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-card-normal);
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.timeline-content:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.timeline-content:active {
  transform: scale(0.99);
}

/* 气泡箭头指向左侧 */
.timeline-content::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 18px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 8px solid var(--color-bg-card);
}

/* 图标区域 */
.timeline-content .icon-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-content .svg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-content .svg-icon svg {
  width: 20px;
  height: 20px;
}

/* 不同类型的图标颜色 */
.timeline-content .icon-box.icon-bg-weight {
  background: var(--color-action-green);
  color: var(--color-success);
}

.timeline-content .icon-box.icon-bg-vaccine {
  background: var(--color-action-blue);
  color: var(--color-info);
}

.timeline-content .icon-box.icon-bg-general {
  background: var(--color-action-orange);
  color: var(--color-primary);
}

.timeline-content .icon-box.icon-bg-medical {
  background: var(--color-action-pink);
  color: var(--color-danger);
}

/* 信息区域 */
.timeline-content .info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-content .main-info {
  display: flex;
  align-items: baseline;
}

.timeline-content .value-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'DIN Alternate', 'Roboto', sans-serif;
}

.timeline-content .unit {
  font-size: 12px;
  font-weight: normal;
  color: var(--color-text-regular);
  margin-left: 2px;
}

/* 体重变化趋势指标 */
.timeline-content .trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'DIN Alternate', 'Roboto', sans-serif;
}

.timeline-content .trend-indicator .trend-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.timeline-content .trend-indicator .trend-value {
  font-weight: 600;
}

/* 上升趋势 - 橙色（增重） */
.timeline-content .trend-indicator.up {
  background: rgba(255, 138, 76, 0.12);
  color: var(--color-primary);
}

/* 下降趋势 - 绿色（减重） */
.timeline-content .trend-indicator.down {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success);
}

.timeline-content .title-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.timeline-content .date-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 日记备注 */
.timeline-content .notes-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 照片墙 */
.timeline-content .photo-wall {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: 12px;
  flex-shrink: 0;
}

.timeline-content .mini-photo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--color-border-light);
}

.timeline-content .more-photos {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-bg-block);
  padding: 0 6px;
  height: 40px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 500;
}

/* 标签区域 */
.timeline-content .tag-box {
  margin-left: 8px;
}

.timeline-content .status-tag {
  background: var(--color-bg-block);
  color: var(--color-text-secondary);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

/* 纪念日标签 - 红色高亮 */
.timeline-content .anniversary-tag {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: var(--color-danger);
  font-weight: 600;
}

/* 桌面端：左右交替布局 */
@media (min-width: 768px) {
  .timeline-container {
    padding: 0;
  }

  /* 中轴线居中 */
  .timeline-container::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .timeline-item {
    display: block;
    width: 50%;
    margin-bottom: 32px;
    clear: both;
  }

  /* 左侧项目（奇数项） */
  .timeline-item.item-left {
    float: left;
    padding-right: 40px;
    clear: both;
  }

  .timeline-item.item-left .timeline-dot {
    left: auto;
    right: -9px;
  }

  .timeline-item.item-left .timeline-content {
    margin-left: 0;
    margin-right: 0;
  }

  .timeline-item.item-left .timeline-content::before {
    left: auto;
    right: -8px;
    border-right: none;
    border-left: 8px solid var(--color-bg-card);
  }

  .timeline-item.item-left .info-box,
  .timeline-item.item-left .tag-box {
    text-align: left;
  }

  /* 右侧项目（偶数项） */
  .timeline-item.item-right {
    float: right;
    padding-left: 40px;
    clear: right;
  }

  .timeline-item.item-right .timeline-dot {
    left: -9px;
  }

  .timeline-item.item-right .timeline-content {
    margin-left: 0;
  }

  .timeline-item.item-right .timeline-content::before {
    left: -8px;
    border-right: 8px solid var(--color-bg-card);
    border-left: none;
  }

  /* 清除浮动 */
  .timeline-container::after {
    content: '';
    display: table;
    clear: both;
  }
}

/* FAB 悬浮按钮 */
.fab-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-primary-gradient);
  border: none;
  color: var(--color-text-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-primary-btn);
  transition: all 0.3s ease;
  z-index: 100;
}

.fab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 32px rgba(255, 138, 76, 0.5);
}

.fab-button:active {
  transform: scale(0.95);
}

.fab-button svg {
  width: 28px;
  height: 28px;
}

/* 移动端 */
@media (max-width: 640px) {
  .health-overview-card {
    padding: 16px;
    border-radius: 16px;
  }

  .health-overview-card .data-split {
    flex-direction: column;
    gap: 12px;
  }

  .health-overview-card .divider {
    width: 100%;
    height: 1px;
    margin: 0;
  }

  .health-overview-card .weight-block .num {
    font-size: 24px;
  }

  .health-overview-card .weight-block .sparkline-container {
    height: 28px;
  }

  /* Timeline 移动端 */
  .timeline-container::before {
    left: 17px;
  }

  .timeline-item {
    display: flex;
    width: 100%;
    margin-bottom: 20px;
  }

  .timeline-item.item-left,
  .timeline-item.item-right {
    float: none;
    width: 100%;
    padding: 0;
  }

  .timeline-dot {
    left: 9px !important;
    right: auto !important;
  }

  .timeline-content {
    margin-left: 44px;
    margin-right: 0;
  }

  .timeline-content::before {
    left: -8px !important;
    right: auto !important;
    border-right: 8px solid var(--color-bg-card) !important;
    border-left: none !important;
  }

  .timeline-content .icon-box {
    width: 36px;
    height: 36px;
  }

  .timeline-content .svg-icon svg {
    width: 18px;
    height: 18px;
  }

  .timeline-content .value-text {
    font-size: 15px;
  }

  .timeline-content .title-text {
    font-size: 14px;
  }

  /* 移动端照片墙和笔记适配 */
  .timeline-content .photo-wall {
    margin-left: 8px;
    gap: 4px;
  }

  .timeline-content .mini-photo {
    width: 36px;
    height: 36px;
  }

  .timeline-content .more-photos {
    height: 36px;
    font-size: 10px;
    padding: 0 4px;
  }

  .timeline-content .notes-text {
    font-size: 11px;
  }

  .fab-button {
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
  }
}
</style>
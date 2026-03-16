<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useMyCatStore } from '../../../stores/myCat'
import { usePetStore } from '../../../stores/pet'
import { getProactiveAdvice } from '../../../api/proactive'
import { getWeightAnalysis } from '../../../api/weightStandard'
import WeightGauge from '../../../components/charts/WeightGauge.vue'
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

// 其他猫咪列表（用于网格展示，不包含当前选中的）
const otherCats = computed(() => {
  if (!catStore.currentCat) return []
  return catCards.value.filter(item => item.cat.id !== catStore.currentCat?.id)
})

// 获取猫咪头像 URL
function getCatAvatarUrl(cat: any): string {
  if (cat.avatarData) return cat.avatarData
  if (!cat.avatar) return ''
  if (cat.avatar.startsWith('http')) return cat.avatar
  const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace('/api', '')
  return `${baseURL}/${cat.avatar}`
}

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
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <MascotCharacter expression="yawning" size="large" :animated="true" />
        <p>正在加载...</p>
      </div>

      <template v-else-if="catStore.currentCat">
        <!-- 1. Hero Card: 主视图 - 融合猫咪档案与健康概览 -->
        <section class="hero-card">
          <!-- 装饰背景 -->
          <div class="hero-decor"></div>

          <div class="hero-content">
            <!-- 左侧：猫咪档案 + 快捷操作 -->
            <div class="hero-left">
              <div class="cat-profile">
                <div class="profile-avatar">
                  <img
                    v-if="catStore.currentCat.avatarData || catStore.currentCat.avatar"
                    :src="getCatAvatarUrl(catStore.currentCat)"
                    :alt="catStore.currentCat.name"
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
                  <p class="profile-meta">{{ getAgeText(catStore.currentCat) }} · {{ catStore.currentCat.weight || '--' }}kg</p>
                </div>
              </div>

              <div class="hero-actions">
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

            <!-- 右侧：健康数据面板 -->
            <div class="hero-right">
              <!-- 精简状态 Banner -->
              <div class="status-banner" @click="goToAIChat">
                <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-dot normal"></span>
                <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-dot warning"></span>
                <span v-else class="status-dot neutral"></span>
                <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-text normal">体型正常</span>
                <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-text warning">需关注</span>
                <span v-else class="status-text neutral">点击咨询</span>
                <span class="status-divider"></span>
                <span class="status-desc">{{ healthAnalysis?.generalAdvice || `${catStore.currentCat.name}最近状态很棒，继续保持哦！` }}</span>
              </div>

              <!-- 数据网格 -->
              <div class="data-grid">
                <!-- 体重仪表盘 -->
                <div class="data-item gauge-card">
                  <div class="gauge-header">
                    <span class="data-label">当前体重</span>
                    <span v-if="weightAnalysis" class="standard-range">标准: {{ weightAnalysis.min }}-{{ weightAnalysis.max }}kg</span>
                  </div>
                  <div class="gauge-container">
                    <WeightGauge
                      :value="catStore.currentCat.weight || 0"
                      :min="weightAnalysis?.min || 1.5"
                      :max="weightAnalysis?.max || 5.0"
                      :standard-min="weightAnalysis?.min || 2.5"
                      :standard-max="weightAnalysis?.max || 4.0"
                    />
                  </div>
                </div>

                <!-- 近期待办 -->
                <div class="data-item todos-card">
                  <span class="data-label">近期待办</span>
                  <div class="todos-list">
                    <label v-for="todo in reminders.slice(0, 3)" :key="todo.id" class="todo-item">
                      <input type="checkbox" class="todo-checkbox" />
                      <div class="todo-content">
                        <span class="todo-title">{{ todo.title }}</span>
                        <span v-if="todo.urgency === 'high'" class="todo-date urgent">{{ todo.description }}</span>
                        <span v-else class="todo-date">{{ todo.description }}</span>
                      </div>
                    </label>
                    <div v-if="reminders.length === 0" class="todos-empty">
                      <span class="todo-checkbox done"></span>
                      <span class="todo-text">暂无待办</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. 其他家庭成员 - 胶囊横向列表 -->
        <section v-if="otherCats.length > 0" class="other-cats-section">
          <div class="section-header-row">
            <h3 class="section-title">其他家庭成员</h3>
            <span class="cat-count-text">共 {{ catCards.length }} 只</span>
          </div>

          <div class="cats-pills">
            <button
              v-for="item in otherCats"
              :key="item.cat.id"
              class="cat-pill"
              @click="onCatSelect(item.cat)"
            >
              <div class="pill-avatar">
                <img
                  v-if="item.cat.avatarData || item.cat.avatar"
                  :src="getCatAvatarUrl(item.cat)"
                  :alt="item.cat.name"
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

            <!-- 添加猫咪按钮 -->
            <button class="add-cat-pill" @click="router.push('/my-cats/new')">
              <span class="plus-icon-pill">+</span>
            </button>
          </div>
        </section>

        <!-- 3. 成长足迹 - 左侧单线时间轴风格 -->
        <section v-if="limitedRecentRecords.length > 0" class="timeline-section">
          <div class="section-header">
            <h3 class="section-title">成长足迹</h3>
            <div class="view-all" @click="viewAllRecords">
              查看全部 <span class="arrow-icon">›</span>
            </div>
          </div>

          <!-- 垂直时间轴容器 -->
          <div class="timeline-vertical">
            <div
              v-for="(record, index) in limitedRecentRecords"
              :key="record.id"
              class="timeline-item-vertical"
              @click="viewRecordDetail(record)"
            >
              <!-- 左侧时间轴线与圆点 -->
              <div class="timeline-left">
                <div class="timeline-line" :class="{ 'first': index === 0, 'last': index === limitedRecentRecords.length - 1 }"></div>
                <div class="timeline-dot" :class="`dot-${record.type}`"></div>
              </div>

              <!-- 右侧内容卡片 -->
              <div class="timeline-card">
                <!-- 卡片头部：日期和类型 -->
                <div class="card-header-row">
                  <div class="type-icon" :class="`icon-bg-${record.type}`">
                    <span class="svg-icon" v-html="getRecordIcon(record.type)"></span>
                  </div>
                  <span class="record-type">{{ getRecordTypeLabel(record.originalType || record.type) }}</span>
                  <span class="record-date">{{ record.date }}</span>
                </div>

                <!-- 主内容区域 -->
                <div class="card-body-row">
                  <div class="main-info">
                    <span v-if="record.type === 'weight'" class="value-text">
                      {{ getWeightValue(record) }}<span class="unit">kg</span>
                      <!-- 体重变化指标 -->
                      <span v-if="record.weightChange" class="trend-indicator" :class="record.weightChange.direction">
                        <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path v-if="record.weightChange.direction === 'up'" d="M12 19V5M5 12l7-7 7 7"/>
                          <path v-else d="M12 5v14M5 12l7 7 7-7"/>
                        </svg>
                        <span class="trend-value">{{ formatWeight(record.weightChange.value) }}kg</span>
                      </span>
                    </span>
                    <span v-else class="title-text">{{ record.title }}</span>
                  </div>
                </div>

                <!-- 日记备注 -->
                <div v-if="record.notes" class="notes-text">{{ record.notes }}</div>

                <!-- 照片墙和标签 -->
                <div class="card-footer-row">
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
                  <div class="tag-box">
                    <span v-if="record.isAdoptionDay" class="status-tag anniversary-tag">
                      🎉 纪念日
                    </span>
                  </div>
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
  width: 100%;
  max-width: 500px;
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

/* Hero Card 主视图 */
.hero-card {
  position: relative;
  background: var(--color-bg-card);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-card-normal);
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 160px;
  height: 160px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, rgba(255, 138, 76, 0.1) 100%);
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
}

.hero-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 768px) {
  .hero-content {
    flex-direction: row;
    gap: 32px;
  }
}

/* 左侧：猫咪档案 */
.hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #ffffff;
  padding: 8px 0;
}

@media (min-width: 768px) {
  .hero-left {
    flex: 0 0 260px;
    padding-right: 24px;
    margin-right: 24px;
    border-right: 1px solid #f3f4f6;
  }
}

.cat-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-primary-light);
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: 700;
}

.profile-info {
  flex: 1;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.current-badge {
  font-size: 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 3px 10px;
  border-radius: 100px;
  font-weight: 600;
}

.profile-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 6px 0 0 0;
}

/* 快捷操作按钮 */
.hero-actions {
  display: flex;
  gap: 10px;
}

.hero-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-action-btn svg {
  width: 16px;
  height: 16px;
}

.hero-action-btn.primary {
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  box-shadow: var(--shadow-primary-btn);
}

.hero-action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 138, 76, 0.35);
}

.hero-action-btn.secondary {
  background: var(--color-bg-block);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border-light);
}

.hero-action-btn.secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 右侧：健康数据面板 */
.hero-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 精简状态 Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #ecfdf5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-banner:hover {
  background: #d1fae5;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.normal {
  background: #10b981;
}

.status-dot.warning {
  background: #f59e0b;
}

.status-dot.neutral {
  background: #d1d5db;
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-text.normal {
  color: #059669;
}

.status-text.warning {
  color: #d97706;
}

.status-text.neutral {
  color: #6b7280;
}

.status-divider {
  width: 1px;
  height: 14px;
  background: #d1d5db;
  flex-shrink: 0;
}

.status-desc {
  font-size: 12px;
  color: #047857;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* 数据网格 */
.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
}

.data-item {
  background: #f9fafb;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 体重仪表盘卡片 */
.gauge-card {
  min-height: 140px;
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.standard-range {
  font-size: 10px;
  color: #9ca3af;
  background: #ffffff;
  padding: 2px 8px;
  border-radius: 100px;
  border: 1px solid #e5e7eb;
}

.gauge-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

/* 待办卡片 */
.todos-card {
  min-height: 140px;
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.todo-item:hover {
  background: #ffffff;
}

.todo-item input[type="checkbox"] {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.todo-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.todo-title {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.todo-date {
  font-size: 11px;
  color: #9ca3af;
}

.todo-date.urgent {
  color: #f59e0b;
  font-weight: 500;
}

.todos-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #9ca3af;
  font-size: 13px;
}

.todos-empty .todo-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #10b981;
  background: #10b981;
  border-radius: 4px;
  position: relative;
}

.todos-empty .todo-checkbox::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

/* 体重趋势Badge */
.data-trend-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 4px;
}

.data-trend-badge.up {
  background: #fef3c7;
  color: #d97706;
}

.data-trend-badge.down {
  background: #dcfce7;
  color: #16a34a;
}

.data-trend-badge.stable {
  background: #dbeafe;
  color: #2563eb;
}

/* 其他家庭成员网格 */
.other-cats-section {
  margin-top: 8px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.section-header-row .section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
}

.cat-count-text {
  font-size: 12px;
  color: var(--color-text-light);
}

/* 胶囊式猫咪列表 - 替代网格布局 */
.cats-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.cat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 6px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 100px;
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
  border: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.pill-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pill-avatar .avatar-placeholder.pill {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.pill-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-right: 10px;
}

.pill-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
}

.pill-weight {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.2;
}

.add-cat-pill {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  color: #9ca3af;
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

.plus-icon-pill {
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
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
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-lg);
}

.health-overview-card .data-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-overview-card .divider {
  display: none;
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

/* 内嵌快捷操作按钮 */
.health-overview-card .inline-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
}

.health-overview-card .inline-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: var(--color-bg-block);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.health-overview-card .inline-action-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.health-overview-card .inline-action-btn svg {
  width: 16px;
  height: 16px;
}

/* 成长足迹 - 垂直时间轴 */
.timeline-section {
  margin-top: 24px;
}

.timeline-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

/* 垂直时间轴容器 */
.timeline-vertical {
  position: relative;
  padding-left: 20px;
}

/* 左侧垂直连接线 */
.timeline-vertical::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-border-light) 100%);
  border-radius: 1px;
}

/* 垂直时间轴项目 */
.timeline-item-vertical {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
}

.timeline-item-vertical:last-child {
  padding-bottom: 0;
}

/* 左侧圆点和线 */
.timeline-item-vertical .timeline-left {
  position: relative;
  flex-shrink: 0;
  width: 16px;
}

.timeline-item-vertical .timeline-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border-light);
}

.timeline-item-vertical .timeline-line.first {
  top: 8px;
}

.timeline-item-vertical .timeline-line.last {
  bottom: auto;
  height: 12px;
}

/* 橙色圆点 */
.timeline-item-vertical .timeline-dot {
  position: absolute;
  left: -6px;
  top: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid var(--color-bg-page);
  z-index: 1;
}

.timeline-item-vertical .timeline-dot.dot-weight {
  background: var(--color-success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.timeline-item-vertical .timeline-dot.dot-vaccine {
  background: var(--color-info);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.timeline-item-vertical .timeline-dot.dot-general {
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 138, 76, 0.15);
}

.timeline-item-vertical .timeline-dot.dot-medical {
  background: var(--color-danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

/* 右侧内容卡片 - 紧凑版 */
.timeline-item-vertical .timeline-card {
  flex: 1;
  background: var(--color-bg-card);
  border-radius: 14px;
  padding: 12px;
  box-shadow: var(--shadow-card-normal);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid #f3f4f6;
}

.timeline-item-vertical .timeline-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary-light);
}

/* 卡片头部：日期在左侧 */
.timeline-item-vertical .card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.timeline-item-vertical .record-date {
  font-size: 11px;
  color: var(--color-text-light);
  font-weight: 500;
  order: -1;
}

.timeline-item-vertical .type-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-item-vertical .type-icon .svg-icon svg {
  width: 14px;
  height: 14px;
}

.timeline-item-vertical .type-icon.icon-bg-weight {
  background: var(--color-action-green);
  color: var(--color-success);
}

.timeline-item-vertical .type-icon.icon-bg-vaccine {
  background: var(--color-action-blue);
  color: var(--color-info);
}

.timeline-item-vertical .type-icon.icon-bg-general {
  background: var(--color-action-orange);
  color: var(--color-primary);
}

.timeline-item-vertical .type-icon.icon-bg-medical {
  background: var(--color-action-pink);
  color: var(--color-danger);
}

.timeline-item-vertical .record-type {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* 主内容区域 - 突出体重数值 */
.timeline-item-vertical .card-body-row {
  margin-bottom: 4px;
}

.timeline-item-vertical .main-info {
  display: flex;
  align-items: baseline;
}

.timeline-item-vertical .value-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'DIN Alternate', 'Roboto', sans-serif;
}

.timeline-item-vertical .unit {
  font-size: 13px;
  font-weight: normal;
  color: var(--color-text-regular);
  margin-left: 2px;
}

.timeline-item-vertical .title-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 体重变化趋势指标 */
.timeline-item-vertical .trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.timeline-item-vertical .trend-indicator .trend-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* 上升趋势 - 橙色（增重） */
.timeline-item-vertical .trend-indicator.up {
  background: rgba(255, 138, 76, 0.12);
  color: var(--color-primary);
}

/* 下降趋势 - 绿色（减重） */
.timeline-item-vertical .trend-indicator.down {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success);
}

/* 日记备注 - 紧凑版 */
.timeline-item-vertical .notes-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  margin-bottom: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡片底部：照片和标签 */
.timeline-item-vertical .card-footer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 照片墙 */
.timeline-item-vertical .photo-wall {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
}

.timeline-item-vertical .mini-photo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--color-border-light);
}

.timeline-item-vertical .more-photos {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-bg-block);
  padding: 0 8px;
  height: 44px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 500;
}

/* 标签区域 */
.timeline-item-vertical .tag-box {
  margin-left: auto;
}

.timeline-item-vertical .status-tag {
  background: var(--color-bg-block);
  color: var(--color-text-secondary);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
}

/* 纪念日标签 - 红色高亮 */
.timeline-item-vertical .anniversary-tag {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: var(--color-danger);
  font-weight: 600;
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

/* 垂直时间轴 - 桌面端优化 */
@media (min-width: 768px) {
  .timeline-vertical {
    padding-left: 28px;
  }

  .timeline-vertical::before {
    left: 8px;
  }

  .timeline-item-vertical .timeline-left {
    width: 20px;
  }

  .timeline-item-vertical .timeline-dot {
    width: 16px;
    height: 16px;
    left: -7px;
  }

  .timeline-item-vertical .timeline-card {
    padding: 14px;
  }

  .timeline-item-vertical .value-text {
    font-size: 22px;
  }

  .timeline-item-vertical .record-date {
    font-size: 12px;
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
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .health-overview-card .divider {
    display: none;
  }

  .health-overview-card .weight-block .num {
    font-size: 24px;
  }

  .health-overview-card .weight-block .sparkline-container {
    height: 28px;
  }

  /* Timeline 移动端 - 垂直时间轴适配 */
  .timeline-vertical {
    padding-left: 16px;
  }

  .timeline-vertical::before {
    left: 4px;
  }

  .timeline-item-vertical .timeline-left {
    width: 12px;
  }

  .timeline-item-vertical .timeline-dot {
    width: 10px;
    height: 10px;
    left: -4px;
    top: 6px;
  }

  .timeline-item-vertical .timeline-card {
    padding: 12px;
  }

  .timeline-item-vertical .card-header-row {
    margin-bottom: 8px;
    gap: 8px;
  }

  .timeline-item-vertical .type-icon {
    width: 28px;
    height: 28px;
  }

  .timeline-item-vertical .type-icon .svg-icon svg {
    width: 14px;
    height: 14px;
  }

  .timeline-item-vertical .record-type {
    font-size: 11px;
  }

  .timeline-item-vertical .record-date {
    font-size: 11px;
  }

  .timeline-item-vertical .value-text {
    font-size: 18px;
  }

  .timeline-item-vertical .title-text {
    font-size: 14px;
  }

  /* 移动端照片墙和笔记适配 */
  .timeline-item-vertical .card-footer-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .timeline-item-vertical .photo-wall {
    width: 100%;
  }

  .timeline-item-vertical .mini-photo {
    width: 36px;
    height: 36px;
  }

  .timeline-item-vertical .more-photos {
    height: 36px;
    font-size: 10px;
    padding: 0 4px;
  }

  .timeline-item-vertical .notes-text {
    font-size: 12px;
  }

  .timeline-item-vertical .tag-box {
    margin-left: 0;
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
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGuideStore } from '../../stores/guide'
import { useMyCatStore } from '../../stores/myCat'
import { storeToRefs } from 'pinia'
import EmptyState from '../../components/common/EmptyState.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CategoryIcons, { type CategoryIconType } from '../../components/guide/CategoryIcons.vue'

const router = useRouter()
const guideStore = useGuideStore()
const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)

const selectedCategory = ref('全部')
const searchInput = ref('')
const isSearching = ref(false)

// 分类名称到图标类型的映射
function getCategoryIconType(slug: string): CategoryIconType {
  const iconMap: Record<string, CategoryIconType> = {
    'all': 'all',
    'kitten': 'kitten',
    'newborn': 'kitten',
    'feeding': 'feeding',
    'food': 'feeding',
    'health': 'health',
    'vaccine': 'vaccine',
    'behavior': 'behavior',
    'environment': 'environment',
    'grooming': 'grooming',
    'emergency': 'emergency'
  }
  return iconMap[slug] || 'default'
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// 选择分类
function selectCategory(category: string) {
  selectedCategory.value = category
  const categoryId = guideStore.getCategoryIdByName(category)
  console.log('[Guides] 选择分类:', category, 'categoryId:', categoryId)
  guideStore.fetchGuides(categoryId)
}

// 搜索功能（防抖）
const debouncedSearch = debounce((query: string) => {
  isSearching.value = true
  guideStore.fetchSearchGuides(query).finally(() => {
    isSearching.value = false
  })
}, 500)

// 监听搜索输入
watch(searchInput, (newVal) => {
  if (newVal.trim()) {
    debouncedSearch(newVal)
  } else {
    isSearching.value = false
    // 清空搜索时，恢复当前分类的指南列表
    const categoryId = guideStore.getCategoryIdByName(selectedCategory.value)
    console.log('[Guides] 恢复分类指南:', selectedCategory.value, 'categoryId:', categoryId)
    guideStore.fetchGuides(categoryId)
  }
})

// 查看指南详情
function viewGuide(id: string) {
  router.push(`/guides/${id}`)
}

// 根据猫咪阶段推荐相关指南（AI 顾问联动）
const recommendedGuides = computed(() => {
  if (!currentCat.value) return []

  const catAge = currentCat.value.ageMonths || 0
  // 使用 allGuides 而不是 displayGuides，确保有足够的数据进行推荐
  const allGuides = guideStore.allGuides || []
  console.log('[Guides] 推荐计算 - 年龄:', catAge, '月, 所有指南数:', allGuides.length)

  // 根据年龄阶段推荐
  if (catAge < 3) {
    // 新生期/幼猫：推荐保暖、哺乳、基础护理相关
    return allGuides.filter(g =>
      g.category?.slug?.includes('kitten') ||
      g.category?.slug?.includes('newborn') ||
      g.title?.includes('新生') ||
      g.title?.includes('保暖') ||
      g.title?.includes('哺乳') ||
      g.title?.includes('幼猫')
    ).slice(0, 3)
  } else if (catAge < 6) {
    // 幼猫期：推荐疫苗、辅食、训练相关
    return allGuides.filter(g =>
      g.category?.slug?.includes('vaccine') ||
      g.category?.slug?.includes('feeding') ||
      g.title?.includes('疫苗') ||
      g.title?.includes('辅食') ||
      g.title?.includes('训练')
    ).slice(0, 3)
  } else if (catAge < 12) {
    // 青少年期：推荐绝育、换牙期、驱虫相关
    return allGuides.filter(g =>
      g.title?.includes('绝育') ||
      g.title?.includes('换牙') ||
      g.title?.includes('驱虫') ||
      g.title?.includes('发情')
    ).slice(0, 3)
  } else {
    // 成年期：推荐喂养、健康、行为相关
    return allGuides.filter(g =>
      g.category?.slug?.includes('health') ||
      g.category?.slug?.includes('behavior') ||
      g.title?.includes('成年') ||
      g.title?.includes('肥胖')
    ).slice(0, 3)
  }
})

// 初始化数据
onMounted(async () => {
  console.log('[Guides] 初始化指南页面')
  await guideStore.initAllGuides()
  console.log('[Guides] 所有指南已加载:', guideStore.allGuides.length)
  guideStore.fetchCategories()
  console.log('[Guides] 分类已加载:', guideStore.categories.length)
  guideStore.fetchGuides()
  console.log('[Guides] 当前显示指南:', guideStore.displayGuides.length)
})
</script>

<template>
  <div class="guides-page-refined">
    <!-- 页面标题区 -->
    <header class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">养猫指南</h1>
        <p class="page-subtitle">胖虎整理的猫咪养护知识库，帮你成为更合格的铲屎官</p>
      </div>
    </header>

    <!-- 搜索区域 - 胖虎浮动设计 -->
    <section class="search-hero-container">
      <!-- 浮动胖虎 -->
      <div class="mascot-float-wrapper">
        <MascotCharacter expression="focused" size="large" :animated="true" />
      </div>

      <!-- 玻璃拟态搜索框 -->
      <div class="search-glass-box">
        <div class="input-group">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="searchInput"
            type="text"
            placeholder="输入关键词，胖虎帮你查百科..."
            class="search-input"
          />
        </div>
        <button class="search-confirm-btn">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          搜索
        </button>
      </div>

      <!-- 背景装饰点 -->
      <div class="bg-decoration-dot pos-left"></div>
      <div class="bg-decoration-dot pos-right"></div>
    </section>

    <!-- 阶段推荐（AI 顾问联动） -->
    <section v-if="recommendedGuides.length > 0 && !searchInput" class="stage-recommendation">
      <div class="recommendation-header">
        <MascotCharacter expression="happy" size="small" :animated="false" />
        <div class="recommendation-text">
          <span class="recommendation-label">为 {{ currentCat?.name }} 推荐</span>
          <span class="recommendation-sub">基于 {{ currentCat?.ageFormatted }} 的成长阶段</span>
        </div>
      </div>
      <div class="recommendation-list">
        <div
          v-for="guide in recommendedGuides"
          :key="guide.id"
          class="recommendation-card"
          @click="viewGuide(guide.id)"
        >
          <span class="rec-tag">推荐</span>
          <span class="rec-title">{{ guide.title }}</span>
        </div>
      </div>
    </section>

    <!-- 分类胶囊 - SVG 图标 + 马卡龙色系 -->
    <nav v-if="guideStore.categories.length > 0" class="category-pills">
      <button
        v-for="cat in guideStore.categories"
        :key="cat.id"
        :class="['category-item', { active: selectedCategory === cat.name }]"
        @click="selectCategory(cat.name)"
      >
        <div class="cat-icon-container">
          <CategoryIcons :type="getCategoryIconType(cat.slug)" :size="18" />
        </div>
        <span class="cat-label">{{ cat.name }}</span>
        <span v-if="guideStore.categoryCounts[cat.name] > 0" class="cat-count">
          {{ guideStore.categoryCounts[cat.name] }}
        </span>
      </button>
    </nav>

    <!-- 加载状态 -->
    <div v-if="guideStore.loading" class="loading-state">
      <div class="loading-mascot">
        <MascotCharacter expression="yawning" size="large" :animated="true" />
      </div>
      <p class="loading-text">胖虎正在查找资料...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="guideStore.error" class="error-state">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="error-text">{{ guideStore.error }}</p>
      <button @click="selectCategory(selectedCategory)" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="guideStore.displayGuides.length === 0" class="empty-state-debug">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="empty-title">暂无相关指南</p>
      <p class="empty-description">{{ searchInput ? '换个关键词试试看' : '该分类下还没有内容' }}</p>
      <div class="debug-info">
        <p class="debug-item">所有指南数: {{ guideStore.allGuides?.length || 0 }}</p>
        <p class="debug-item">当前分类: {{ selectedCategory }}</p>
        <p class="debug-item">搜索词: {{ searchInput || '(空)' }}</p>
      </div>
    </div>

    <!-- 指南列表 - 奶油风卡片 -->
    <main v-else class="guides-grid">
      <article
        v-for="guide in guideStore.displayGuides"
        :key="guide.id"
        class="guide-premium-card"
        @click="viewGuide(guide.id)"
      >
        <!-- 卡片头部 -->
        <header class="card-header">
          <span class="category-tag-inline">
            <CategoryIcons
              :type="getCategoryIconType(guide.category?.slug || '')"
              :size="14"
            />
            {{ guide.category?.name }}
          </span>
        </header>

        <!-- 标题 -->
        <h3 class="guide-title">{{ guide.title }}</h3>

        <!-- 摘要 -->
        <p class="guide-excerpt">{{ guide.excerpt || '暂无简介' }}</p>

        <!-- 卡片底部 -->
        <footer class="card-footer">
          <div class="meta-data">
            <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span>{{ guide.viewCount || 0 }}</span>
          </div>
          <a class="read-more-btn">
            阅读全文
            <svg class="paw-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.5 2 8 4.5 8 6c0 1.5 1 3 2 3.5C9.5 10 9 11 9 12c0 2 1.5 3 3 3s3-1 3-3c0-1-.5-2-1-2.5 1-.5 2-2 2-3.5 0-1.5-1.5-4-4-4zm-5 8c-1.5 0-3 1.5-3 3 0 1 1 2 2 2.5-.5.5-1 1.5-1 2.5 0 1.5 1.5 3 3 3s3-1.5 3-3c0-1-.5-2-1-2.5 1-.5 2-1.5 2-2.5 0-1.5-1.5-3-3-3zm10 0c-1.5 0-3 1.5-3 3 0 1 1 2 2 2.5-.5.5-1 1.5-1 2.5 0 1.5 1.5 3 3 3s3-1.5 3-3c0-1-.5-2-1-2.5 1-.5 2-1.5 2-2.5 0-1.5-1.5-3-3-3z"/>
            </svg>
          </a>
        </footer>
      </article>
    </main>
  </div>
</template>

<style scoped>
/* ================= 页面容器 ================= */
.guides-page-refined {
  min-height: 100vh;
  background: #FAF8F5;
  padding: 20px;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ================= 页面 Hero ================= */
.page-hero {
  text-align: center;
  margin-bottom: 16px;
  padding-top: 20px;
}

.hero-content {
  max-width: 500px;
  margin: 0 auto;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  margin: 0;
  line-height: 1.6;
}

/* ================= 搜索区域 - 胖虎浮动设计 ================= */
.search-hero-container {
  position: relative;
  max-width: 640px;
  margin: 40px auto 24px;
  z-index: 10;
}

/* 浮动胖虎层 */
.mascot-float-wrapper {
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.mascot-float-wrapper:hover {
  transform: translateX(-50%) translateY(-5px);
}

/* 玻璃拟态搜索框 */
.search-glass-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 10px 12px 10px 24px;
  border-radius: 100px;
  border: 1.5px solid #FDF3E9;
  box-shadow:
    0 10px 30px rgba(244, 162, 97, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
}

.search-glass-box:focus-within {
  transform: scale(1.01);
  border-color: #FED7AA;
  box-shadow:
    0 12px 35px rgba(244, 162, 97, 0.18),
    0 6px 16px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 输入区域 */
.input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #F4A261;
  flex-shrink: 0;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 15px;
  color: #374151;
  background: transparent;
}

.search-input::placeholder {
  color: #9CA3AF;
}

/* 搜索按钮 */
.search-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow:
    0 4px 14px rgba(244, 162, 97, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.search-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 20px rgba(244, 162, 97, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.search-confirm-btn:active {
  transform: translateY(0);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 背景装饰点 */
.bg-decoration-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  border-radius: 50%;
  opacity: 0.3;
  z-index: 1;
}

.bg-decoration-dot.pos-left {
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
}

.bg-decoration-dot.pos-right {
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
}

/* ================= 阶段推荐 ================= */
.stage-recommendation {
  background: linear-gradient(135deg, #FFFBF7 0%, #FFF7ED 100%);
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 20px;
  border: 1px solid #FED7AA;
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.recommendation-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recommendation-label {
  font-size: 13px;
  font-weight: 600;
  color: #F4A261;
}

.recommendation-sub {
  font-size: 11px;
  color: #9CA3AF;
}

.recommendation-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.recommendation-list::-webkit-scrollbar {
  display: none;
}

.recommendation-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border: 1px solid #F5F0E8;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.recommendation-card:hover {
  background: #FFF7ED;
  border-color: #F4A261;
  transform: translateY(-2px);
}

.rec-tag {
  padding: 2px 6px;
  background: #F4A261;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  border-radius: 100px;
}

.rec-title {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

/* ================= 分类胶囊 ================= */
.category-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
  position: relative;
  z-index: 1;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border: 1.5px solid #E5E7EB;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  white-space: nowrap;
}

.category-item:hover:not(.active) {
  border-color: #FED7AA;
  background: #FFFBF7;
}

.cat-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.cat-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.cat-count {
  padding: 2px 6px;
  background: #F3F4F6;
  color: #6B7280;
  font-size: 10px;
  font-weight: 700;
  border-radius: 100px;
}

/* 激活态 - 微渐变 + 动效 */
.category-item.active {
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  border-color: transparent;
  color: #FFFFFF;
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.35);
}

.category-item.active .cat-label {
  color: #FFFFFF;
}

.category-item.active .cat-count {
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

/* ================= 加载/错误状态 ================= */
.empty-state-debug {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 16px 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0 0 20px 0;
}

.debug-info {
  padding: 12px 20px;
  background: #F3F4F6;
  border-radius: 12px;
  font-size: 12px;
  color: #6B7280;
}

.debug-item {
  margin: 4px 0;
  font-family: monospace;
}
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-mascot {
  width: 100px;
  height: 100px;
  margin-bottom: 16px;
}

.loading-text,
.error-text {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0 0 16px 0;
}

.retry-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

/* ================= 指南卡片网格 ================= */
.guides-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* ================= 高级卡片设计 ================= */
.guide-premium-card {
  background: linear-gradient(145deg, #FFFFFF 0%, #FFFBF8 100%);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #FFFFFF;
  box-shadow:
    0 2px 12px rgba(244, 162, 97, 0.06),
    0 1px 4px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.guide-premium-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #F4A261 0%, #E76F51 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.guide-premium-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 32px rgba(244, 162, 97, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.04);
}

.guide-premium-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-tag-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #FAF8F5 0%, #FFF7ED 100%);
  border: 1px solid #F5F0E8;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  color: #F4A261;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.guide-title {
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.guide-excerpt {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #F5F0E8;
}

.meta-data {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #9CA3AF;
  font-size: 12px;
}

.icon-eye {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.read-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #F4A261;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.read-more-btn:hover {
  color: #E76F51;
  gap: 6px;
}

.paw-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.3s ease;
}

.read-more-btn:hover .paw-icon {
  transform: scale(1.2) rotate(-10deg);
}

/* ================= 移动端适配 ================= */
@media (max-width: 767px) {
  .guides-page-refined {
    padding: 12px;
  }

  .page-hero {
    padding-top: 12px;
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 22px;
  }

  .page-subtitle {
    font-size: 12px;
    max-width: 280px;
  }

  /* 浮动搜索框 */
  .search-hero-container {
    margin: 32px auto 20px;
  }

  .mascot-float-wrapper {
    top: -55px;
  }

  .search-glass-box {
    padding: 8px 10px 8px 16px;
    border-radius: 100px;
  }

  .search-icon {
    width: 16px;
    height: 16px;
  }

  .search-input {
    font-size: 13px;
  }

  .search-confirm-btn {
    padding: 10px 16px;
    font-size: 13px;
  }

  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .guides-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .category-pills {
    gap: 6px;
    margin-bottom: 16px;
  }

  .category-item {
    padding: 7px 12px;
  }

  .cat-label {
    font-size: 12px;
  }

  .stage-recommendation {
    padding: 10px 12px;
    margin-bottom: 16px;
  }

  .recommendation-header {
    gap: 8px;
  }

  .recommendation-card {
    padding: 7px 12px;
  }

  .rec-title {
    font-size: 11px;
  }

  .guide-premium-card {
    padding: 16px;
  }

  .guide-title {
    font-size: 16px;
  }

  .guide-excerpt {
    font-size: 13px;
  }

  .bg-decoration-dot {
    display: none;
  }
}
</style>

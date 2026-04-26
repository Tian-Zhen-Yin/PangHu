<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGuideStore } from '../../stores/guide.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { storeToRefs } from 'pinia'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CategoryIcons, { type CategoryIconType } from '../../components/guide/CategoryIcons.vue'

const router = useRouter()
const guideStore = useGuideStore()
const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)

const selectedCategory = ref('全部')
const searchInput = ref('')
const isSearching = ref(false)

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

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

function selectCategory(category: string) {
  selectedCategory.value = category
  const categoryId = guideStore.getCategoryIdByName(category)
  guideStore.fetchGuides(categoryId)
}

const debouncedSearch = debounce((query: string) => {
  isSearching.value = true
  guideStore.fetchSearchGuides(query).finally(() => {
    isSearching.value = false
  })
}, 500)

function handleSearch() {
  const query = searchInput.value.trim()
  if (query) {
    debouncedSearch(query)
  }
}

watch(searchInput, (newVal) => {
  if (newVal.trim()) {
    debouncedSearch(newVal)
  } else {
    isSearching.value = false
    const categoryId = guideStore.getCategoryIdByName(selectedCategory.value)
    guideStore.fetchGuides(categoryId)
  }
})

function viewGuide(id: string) {
  router.push(`/guides/${id}`)
}

const recommendedGuides = computed(() => {
  if (!currentCat.value) return []

  const catAge = currentCat.value.ageMonths || 0
  const allGuides = guideStore.allGuides || []

  if (catAge < 3) {
    return allGuides.filter(g =>
      g.category?.slug?.includes('kitten') ||
      g.category?.slug?.includes('newborn') ||
      g.title?.includes('新生') ||
      g.title?.includes('保暖') ||
      g.title?.includes('哺乳') ||
      g.title?.includes('幼猫')
    ).slice(0, 3)
  } else if (catAge < 6) {
    return allGuides.filter(g =>
      g.category?.slug?.includes('vaccine') ||
      g.category?.slug?.includes('feeding') ||
      g.title?.includes('疫苗') ||
      g.title?.includes('辅食') ||
      g.title?.includes('训练')
    ).slice(0, 3)
  } else if (catAge < 12) {
    return allGuides.filter(g =>
      g.title?.includes('绝育') ||
      g.title?.includes('换牙') ||
      g.title?.includes('驱虫') ||
      g.title?.includes('发情')
    ).slice(0, 3)
  } else {
    return allGuides.filter(g =>
      g.category?.slug?.includes('health') ||
      g.category?.slug?.includes('behavior') ||
      g.title?.includes('成年') ||
      g.title?.includes('肥胖')
    ).slice(0, 3)
  }
})

onMounted(async () => {
  await guideStore.initAllGuides()
  await guideStore.fetchCategories()
  await guideStore.fetchGuides()
})
</script>

<template>
  <div class="guides-page">
    <!-- 装饰背景层 -->
    <div class="page-deco" aria-hidden="true">
      <div class="deco-blob deco-blob--warm"></div>
      <div class="deco-blob deco-blob--cream"></div>
    </div>

    <!-- 搜索 Hero 区 — 页面绝对主角 -->
    <header class="search-hero">
      <div class="hero-inner">
        <h1 class="hero-title">搜索养猫知识</h1>
        <p class="hero-hint">帮你找到最适合猫咪的养护方式</p>

        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="searchInput"
            type="text"
            placeholder="搜索养猫知识..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button v-if="searchInput" @click="searchInput = ''" class="clear-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <button class="ai-btn" @click="router.push('/ai-chat')">
            <span class="ai-btn-text">问胖虎</span>
            <span class="ai-btn-dot"></span>
          </button>
        </div>
      </div>
    </header>

    <!-- 推荐模块（弱化） -->
    <section v-if="recommendedGuides.length > 0 && !searchInput" class="recommend-section">
      <div class="recommend-card">
        <div class="recommend-header">
          <div class="recommend-header-left">
            <MascotCharacter expression="happy" size="small" :animated="false" />
            <div>
              <h3 class="recommend-title">为 {{ currentCat?.name }} 专属推荐</h3>
              <p class="recommend-desc">
                基于 <span class="age-badge">{{ currentCat?.ageFormatted }}</span> 的成长阶段精选
              </p>
            </div>
          </div>
        </div>
        <div class="recommend-list">
          <div
            v-for="guide in recommendedGuides"
            :key="guide.id"
            class="recommend-item"
            @click="viewGuide(guide.id)"
          >
            <span class="recommend-item-title">{{ guide.title }}</span>
            <svg class="recommend-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- 分类浏览 -->
    <section v-if="guideStore.categories.length > 0" class="category-section">
      <h2 class="section-heading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
        分类浏览
      </h2>
      <nav class="category-scroll">
        <button
          v-for="cat in guideStore.categories"
          :key="cat.id"
          :class="['category-chip', { active: selectedCategory === cat.name }]"
          @click="selectCategory(cat.name)"
        >
          <div class="chip-icon">
            <CategoryIcons :type="getCategoryIconType(cat.slug)" :size="16" />
          </div>
          <span class="chip-label">{{ cat.name }}</span>
          <span v-if="(guideStore.categoryCounts[cat.name] ?? 0) > 0" class="chip-count">
            {{ guideStore.categoryCounts[cat.name] }}
          </span>
        </button>
      </nav>
    </section>

    <!-- 加载 / 错误 / 空状态 -->
    <div v-if="guideStore.loading" class="state-block">
      <div class="state-mascot">
        <MascotCharacter expression="yawning" size="large" :animated="true" />
      </div>
      <p class="state-text">胖虎正在查找资料...</p>
    </div>

    <div v-else-if="guideStore.error" class="state-block">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="state-text">{{ guideStore.error }}</p>
      <button @click="selectCategory(selectedCategory)" class="retry-btn">重试</button>
    </div>

    <div v-else-if="guideStore.displayGuides.length === 0" class="state-block">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="state-text">{{ searchInput ? '换个关键词试试看' : '该分类下还没有内容' }}</p>
    </div>

    <!-- 内容卡片 Grid -->
    <main v-else class="content-grid">
      <article
        v-for="guide in guideStore.displayGuides"
        :key="guide.id"
        class="content-card"
        @click="viewGuide(guide.id)"
      >
        <header class="card-tag">
          <CategoryIcons :type="getCategoryIconType(guide.category?.slug || '')" :size="13" />
          <span>{{ guide.category?.name }}</span>
        </header>
        <h3 class="card-title">{{ guide.title }}</h3>
        <p class="card-excerpt">{{ guide.excerpt || '暂无简介' }}</p>
        <footer class="card-meta">
          <span class="meta-views">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            {{ guide.viewCount || 0 }}
          </span>
          <span class="card-read-link">
            阅读
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </span>
        </footer>
      </article>
    </main>
  </div>
</template>

<style scoped>
/* ===================== Page + Atmosphere ===================== */
.guides-page {
  position: relative;
  min-height: 100vh;
  background: var(--color-bg-warm);
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
  overflow: hidden;
}

/* Decorative blobs — warm depth, never flat */
.page-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.deco-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.deco-blob--warm {
  width: 500px;
  height: 500px;
  top: -120px;
  right: -160px;
  background: radial-gradient(circle, rgba(255, 138, 76, 0.12) 0%, transparent 70%);
  animation: blobDrift 20s ease-in-out infinite alternate;
}

.deco-blob--cream {
  width: 400px;
  height: 400px;
  bottom: 10%;
  left: -100px;
  background: radial-gradient(circle, rgba(255, 184, 140, 0.1) 0%, transparent 70%);
  animation: blobDrift 25s ease-in-out infinite alternate-reverse;
}

@keyframes blobDrift {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -20px) scale(1.08); }
}

/* All content above blobs */
.search-hero,
.recommend-section,
.category-section,
.state-block,
.content-grid {
  position: relative;
  z-index: 1;
}

/* ===================== Search Hero — S级 ===================== */
.search-hero {
  padding: 48px 0 36px;
  text-align: center;
  animation: heroReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes heroReveal {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-inner {
  max-width: 600px;
  margin: 0 auto;
}

.hero-title {
  font-size: 30px;
  font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, var(--color-text-primary) 40%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 28px;
  line-height: 1.5;
}

/* Search bar — focal element */
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-full);
  padding: 6px 6px 6px 20px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.03),
    0 12px 36px rgba(255, 138, 76, 0.08);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.search-bar:focus-within {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 4px var(--color-primary-soft),
    0 4px 16px rgba(255, 138, 76, 0.12);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-right: 10px;
  transition: color 0.25s ease;
}

.search-bar:focus-within .search-icon {
  color: var(--color-primary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--color-text-primary);
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: var(--color-bg-block-hover);
  border-radius: 50%;
  cursor: pointer;
  color: var(--color-text-regular);
  flex-shrink: 0;
  margin-right: 8px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.clear-btn:hover {
  background: var(--color-text-secondary);
  color: #fff;
  transform: scale(1.1);
}

/* AI button inside search bar */
.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}

.ai-btn:hover {
  transform: scale(1.04);
  box-shadow: var(--shadow-primary-btn);
}

.ai-btn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ===================== Recommend — C级 ===================== */
.recommend-section {
  margin-bottom: 32px;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}

.recommend-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  padding: 14px 18px;
  border: 1px solid var(--color-border-light);
  transition: box-shadow 0.3s ease;
}

.recommend-card:hover {
  box-shadow: 0 4px 20px rgba(255, 138, 76, 0.06);
}

.recommend-header {
  margin-bottom: 10px;
}

.recommend-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recommend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.recommend-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
}

.age-badge {
  display: inline-block;
  padding: 1px 7px;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-full);
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.recommend-item:hover {
  background: rgba(255, 138, 76, 0.06);
}

.recommend-item-title {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.recommend-item-arrow {
  width: 14px;
  height: 14px;
  color: var(--color-primary);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.recommend-item:hover .recommend-item-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* ===================== Category Section — B级 ===================== */
.category-section {
  margin-bottom: 28px;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 14px;
}

.section-heading svg {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.category-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  border: 1.5px solid var(--color-border-light);
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.category-chip:hover:not(.active) {
  border-color: var(--color-primary-medium);
  background: var(--color-primary-light);
}

.chip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.chip-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.chip-count {
  padding: 1px 6px;
  background: var(--color-bg-block-hover);
  color: var(--color-text-regular);
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--radius-full);
}

.category-chip.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(255, 138, 76, 0.3);
}

.category-chip.active .chip-label,
.category-chip.active .chip-count {
  color: #fff;
}

.category-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
}

/* ===================== States ===================== */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  text-align: center;
}

.state-mascot {
  width: 96px;
  height: 96px;
  margin-bottom: 16px;
}

.state-text {
  font-size: 14px;
  color: var(--color-text-regular);
  margin: 0 0 16px;
}

.retry-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary-btn);
}

/* ===================== Content Grid — A级 ===================== */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  padding: 20px;
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
  position: relative;
  overflow: hidden;
}

.content-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 138, 76, 0.03) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.content-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.content-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary-medium);
  box-shadow:
    0 12px 32px rgba(255, 138, 76, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.03);
}

.content-card:hover::before {
  opacity: 1;
}

.content-card:hover::after {
  opacity: 1;
}

.card-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  padding: 3px 10px;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.card-title {
  position: relative;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.content-card:hover .card-title {
  color: var(--color-primary-dark);
}

.card-excerpt {
  position: relative;
  font-size: 13px;
  color: var(--color-text-regular);
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-meta {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-light);
}

.meta-views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.meta-views svg {
  width: 14px;
  height: 14px;
  opacity: 0.6;
}

.card-read-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  transition: gap 0.2s ease;
}

.card-read-link svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.content-card:hover .card-read-link {
  gap: 6px;
}

.content-card:hover .card-read-link svg {
  transform: translateX(2px);
}

/* ===================== Responsive ===================== */
@media (max-width: 767px) {
  .guides-page {
    padding: 12px;
  }

  .deco-blob--warm {
    width: 300px;
    height: 300px;
    top: -80px;
    right: -80px;
  }

  .deco-blob--cream {
    width: 250px;
    height: 250px;
    bottom: 5%;
    left: -60px;
  }

  .search-hero {
    padding: 28px 0 24px;
  }

  .hero-title {
    font-size: 22px;
  }

  .hero-hint {
    font-size: 13px;
    margin-bottom: 20px;
  }

  .search-bar {
    padding: 5px 5px 5px 14px;
  }

  .search-input {
    font-size: 14px;
  }

  .ai-btn {
    padding: 9px 14px;
    font-size: 13px;
  }

  .ai-btn-text {
    display: none;
  }

  .ai-btn::before {
    content: 'AI';
    font-size: 13px;
    font-weight: 700;
  }

  .recommend-card {
    padding: 12px 14px;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .content-card {
    padding: 16px;
  }

  .card-title {
    font-size: 15px;
  }

  .card-excerpt {
    font-size: 13px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

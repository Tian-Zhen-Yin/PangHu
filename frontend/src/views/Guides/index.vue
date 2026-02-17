<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGuideStore } from '../../stores/guide'

const router = useRouter()
const guideStore = useGuideStore()

const selectedCategory = ref('全部')
const searchQuery = ref('')
const searchInput = ref('')

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
  guideStore.fetchGuides(categoryId)
}

// 搜索功能（防抖）
const debouncedSearch = debounce((query: string) => {
  guideStore.fetchSearchGuides(query)
}, 500)

// 监听搜索输入
watch(searchInput, (newVal) => {
  searchQuery.value = newVal
  if (newVal.trim()) {
    debouncedSearch(newVal)
  } else {
    // 清空搜索时，恢复当前分类的指南列表
    const categoryId = guideStore.getCategoryIdByName(selectedCategory.value)
    guideStore.fetchGuides(categoryId)
  }
})

// 查看指南详情
function viewGuide(id: string) {
  router.push(`/guides/${id}`)
}

// 初始化数据
onMounted(async () => {
  await guideStore.initAllGuides() // 先获取所有指南用于分类计数
  guideStore.fetchCategories()
  guideStore.fetchGuides()
})
</script>

<template>
  <div class="guides-page">
    <div class="page-header">
      <h1 class="page-title">📚 知识指南</h1>
      <p class="page-subtitle">全方位的猫咪养护知识库</p>
    </div>

    <!-- 分类筛选 -->
    <div class="categories-bar">
      <button
        v-for="cat in guideStore.categories"
        :key="cat.id"
        :class="['category-btn', { active: selectedCategory === cat.name }]"
        @click="selectCategory(cat.name)"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ guideStore.categoryCounts[cat.name] || 0 }}</span>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <input
        v-model="searchInput"
        type="text"
        placeholder="搜索指南..."
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="guideStore.loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="guideStore.error" class="error-state">
      <p>{{ guideStore.error }}</p>
      <button @click="selectCategory(selectedCategory)" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="guideStore.displayGuides.length === 0" class="empty-state">
      <p>暂无相关指南</p>
    </div>

    <!-- 指南列表 -->
    <div v-else class="guides-grid">
      <div
        v-for="guide in guideStore.displayGuides"
        :key="guide.id"
        class="guide-card"
        @click="viewGuide(guide.id)"
      >
        <div class="guide-header">
          <span class="guide-icon">{{ guide.category?.icon || '📖' }}</span>
          <span class="guide-category">{{ guide.category?.name }}</span>
        </div>
        <h3 class="guide-title">{{ guide.title }}</h3>
        <p class="guide-excerpt">{{ guide.excerpt }}</p>
        <div class="guide-footer">
          <span class="view-count">👁 {{ guide.viewCount }}</span>
          <span class="read-more">阅读全文 →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guides-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
}

.categories-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-btn:hover {
  border-color: #f97316;
}

.category-btn.active {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-color: transparent;
  color: white;
}

.cat-icon {
  font-size: 1.25rem;
}

.cat-count {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
}

.search-bar {
  position: relative;
  margin-bottom: 2rem;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 1rem 3rem 1rem 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 1rem;
  font-size: 1rem;
  display: block;
  margin: 0 auto;
}

.search-input:focus {
  outline: none;
  border-color: #f97316;
}

.search-icon {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 3rem;
  color: #ef4444;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.guides-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.guide-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.guide-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.guide-icon {
  font-size: 1.5rem;
}

.guide-category {
  background: #f1f5f9;
  color: #64748b;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.guide-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.75rem 0;
}

.guide-excerpt {
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.guide-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-count {
  color: #94a3b8;
  font-size: 0.875rem;
}

.read-more {
  color: #f97316;
  font-weight: 500;
}
</style>

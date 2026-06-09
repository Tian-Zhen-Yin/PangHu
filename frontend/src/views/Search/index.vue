<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGuideStore } from '../../stores/guide.js'
import { useTemplateStore } from '../../stores/template.js'
import SearchBar from '../../components/common/SearchBar.vue'

const route = useRoute()
const router = useRouter()
const guideStore = useGuideStore()
const templateStore = useTemplateStore()

const searchQuery = ref('')
const isSearching = ref(false)
const hasSearched = ref(false)

// 搜索结果
const guideResults = ref<any[]>([])
const templateResults = ref<any[]>([])

// 计算结果总数
const totalResults = computed(() => guideResults.value.length + templateResults.value.length)
const hasResults = computed(() => totalResults.value > 0)

// 执行搜索
async function performSearch(query: string) {
  if (!query.trim()) {
    guideResults.value = []
    templateResults.value = []
    hasSearched.value = false
    return
  }

  isSearching.value = true
  hasSearched.value = true
  searchQuery.value = query

  try {
    // 搜索指南
    if (guideStore.guides.length === 0) {
      await guideStore.fetchGuides()
    }
    guideResults.value = guideStore.guides.filter(guide =>
      guide.title.toLowerCase().includes(query.toLowerCase()) ||
      guide.excerpt?.toLowerCase().includes(query.toLowerCase())
    )

    // 搜索模板
    if (templateStore.templates.length === 0) {
      await templateStore.fetchTemplates()
    }
    templateResults.value = templateStore.templates.filter(template =>
      template.name.toLowerCase().includes(query.toLowerCase()) ||
      template.description.toLowerCase().includes(query.toLowerCase())
    )
  } finally {
    isSearching.value = false
  }
}

// 快速跳转
function goToGuide(id: string) {
  router.push(`/guides/${id}`)
}

function goToTemplate(id: string) {
  router.push(`/templates/${id}`)
}

// 从 URL 查询参数初始化搜索
onMounted(() => {
  const query = route.query.q as string
  if (query) {
    performSearch(query)
  }
})

// 监听路由变化
watch(() => route.query.q, (newQuery) => {
  if (newQuery) {
    performSearch(newQuery as string)
  }
})
</script>

<template>
  <div class="search-page">
    <div class="search-container">
      <!-- 搜索栏 -->
      <div class="search-section">
        <h1 class="page-title">🔍 搜索</h1>
        <SearchBar @search="performSearch" />
      </div>

      <!-- 搜索状态 -->
      <div v-if="isSearching" class="search-status">
        <div class="spinner"></div>
        <p>搜索中...</p>
      </div>

      <!-- 无结果 -->
      <div v-else-if="hasSearched && !hasResults" class="no-results">
        <span class="no-results-icon">🔍</span>
        <h3>未找到相关结果</h3>
        <p>试试搜索"喂养"、"疫苗"、"训练"等关键词</p>
      </div>

      <!-- 搜索结果 -->
      <div v-else-if="hasResults" class="results-container">
        <!-- 结果统计 -->
        <div class="results-summary">
          找到 <span class="highlight">{{ totalResults }}</span> 个相关结果
          <span v-if="searchQuery" class="search-term">
            关于 "<span class="query">{{ searchQuery }}</span>"
          </span>
        </div>

        <!-- 指南结果 -->
        <div v-if="guideResults.length > 0" class="results-section">
          <h2 class="section-title">
            📚 知识指南
            <span class="result-count">{{ guideResults.length }}</span>
          </h2>
          <div class="guide-results">
            <div
              v-for="guide in guideResults"
              :key="guide.id"
              class="guide-result-item"
              @click="goToGuide(guide.id)"
            >
              <span class="guide-category">{{ guide.category?.name || '指南' }}</span>
              <h3 class="guide-title">{{ guide.title }}</h3>
              <p class="guide-excerpt">{{ guide.excerpt }}</p>
            </div>
          </div>
        </div>

        <!-- 模板结果 -->
        <div v-if="templateResults.length > 0" class="results-section">
          <h2 class="section-title">
            📋 计划模板
            <span class="result-count">{{ templateResults.length }}</span>
          </h2>
          <div class="template-results">
            <div
              v-for="template in templateResults"
              :key="template.id"
              class="template-result-item"
              @click="goToTemplate(template.id)"
            >
              <span class="template-category">{{ template.category }}</span>
              <h3 class="template-name">{{ template.name }}</h3>
              <p class="template-description">{{ template.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 初始提示 -->
      <div v-else class="search-suggestions">
        <h2 class="suggestions-title">热门搜索</h2>
        <div class="suggestion-tags">
          <button @click="performSearch('疫苗')" class="suggestion-tag">💉 疫苗接种</button>
          <button @click="performSearch('喂养')" class="suggestion-tag">🍽️ 喂养营养</button>
          <button @click="performSearch('训练')" class="suggestion-tag">🎾 行为训练</button>
          <button @click="performSearch('健康')" class="suggestion-tag">🏥 健康医疗</button>
          <button @click="performSearch('新手')" class="suggestion-tag">📚 新手指南</button>
          <button @click="performSearch('成猫')" class="suggestion-tag">🏠 成年护理</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  background: var(--color-bg-page);
  padding: 2rem 1rem 100px;
  animation: fadeIn 0.3s ease;
}

@media (min-width: 768px) {
  .search-page {
    padding: 2rem 1rem 80px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.search-container {
  max-width: 900px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
  text-align: center;
}

/* 搜索状态 */
.search-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 无结果 */
.no-results {
  text-align: center;
  padding: 4rem 2rem;
}

.no-results-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-results h3 {
  font-size: 1.25rem;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.no-results p {
  color: var(--color-text-regular);
  margin: 0;
}

/* 搜索结果 */
.results-summary {
  background: white;
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: var(--color-text-regular);
  font-size: 0.9375rem;
}

.highlight {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1rem;
}

.search-term {
  margin-left: 0.5rem;
}

.query {
  background: var(--color-bg-cream);
  color: var(--color-primary-dark);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.results-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.result-count {
  background: var(--color-bg-block-hover);
  color: var(--color-text-regular);
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 指南结果 */
.guide-results {
  display: grid;
  gap: 1rem;
}

.guide-result-item {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.guide-category {
  display: inline-block;
  background: #dbeafe;
  color: var(--color-info);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.guide-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.guide-excerpt {
  color: var(--color-text-regular);
  font-size: 0.9375rem;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 模板结果 */
.template-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.template-result-item {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.template-category {
  display: inline-block;
  background: #fef3c7;
  color: var(--color-warning);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.template-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.template-description {
  color: var(--color-text-regular);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 搜索建议 */
.search-suggestions {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.suggestions-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.suggestion-tag {
  padding: 0.75rem 1.25rem;
  background: var(--color-bg-page);
  border: 2px solid var(--color-border-light);
  border-radius: 2rem;
  color: var(--color-text-regular);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-tag:hover {
  background: var(--color-bg-cream);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .template-results {
    grid-template-columns: 1fr;
  }
}
</style>

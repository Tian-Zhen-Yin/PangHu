<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const guides = ref([
  {
    id: '1',
    title: '新生小猫如何保暖？',
    excerpt: '新生小猫无法自我调节体温，保持28-30°C的环境温度至关重要。',
    category: '喂养营养',
    icon: '🍼'
  },
  {
    id: '2',
    title: '小猫什么时候开始断奶？',
    excerpt: '小猫在3-4周大时开始断奶，到8周左右完全断奶。',
    category: '喂养营养',
    icon: '🍼'
  },
  {
    id: '3',
    title: '猫咪疫苗接种时间表',
    excerpt: '猫咪需要在6-8周开始接种猫三联疫苗，之后按照时间表完成接种。',
    category: '健康医疗',
    icon: '💊'
  }
])

const categories = ref([
  { name: '全部', icon: '📚', count: 12 },
  { name: '喂养营养', icon: '🍼', count: 4 },
  { name: '环境准备', icon: '🏠', count: 2 },
  { name: '健康医疗', icon: '💊', count: 3 },
  { name: '行为训练', icon: '🎾', count: 2 },
  { name: '日常护理', icon: '🧼', count: 1 }
])

const selectedCategory = ref('全部')
const searchQuery = ref('')

function selectCategory(category: string) {
  selectedCategory.value = category
}

function viewGuide(id: string) {
  router.push(`/guides/${id}`)
}
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
        v-for="cat in categories"
        :key="cat.name"
        :class="['category-btn', { active: selectedCategory === cat.name }]"
        @click="selectCategory(cat.name)"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ cat.count }}</span>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索指南..."
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>

    <!-- 指南列表 -->
    <div class="guides-grid">
      <div
        v-for="guide in guides"
        :key="guide.id"
        class="guide-card"
        @click="viewGuide(guide.id)"
      >
        <div class="guide-header">
          <span class="guide-icon">{{ guide.icon }}</span>
          <span class="guide-category">{{ guide.category }}</span>
        </div>
        <h3 class="guide-title">{{ guide.title }}</h3>
        <p class="guide-excerpt">{{ guide.excerpt }}</p>
        <div class="guide-footer">
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
  justify-content: flex-end;
}

.read-more {
  color: #f97316;
  font-weight: 500;
}
</style>

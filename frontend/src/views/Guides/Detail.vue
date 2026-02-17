<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from 'vue-markdown-render'
import 'highlight.js/styles/github.css'
import { getGuideById } from '../../api/guide'
import type { Guide } from '../../types/guide'

const route = useRoute()
const router = useRouter()

const guide = ref<Guide | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 返回上一页
function goBack() {
  router.back()
}

// 获取指南详情
async function fetchGuide() {
  const id = route.params.id as string
  loading.value = true
  error.value = null
  try {
    const response = await getGuideById(id)
    if (response.success) {
      guide.value = response.data
    } else {
      error.value = response.message || '获取指南失败'
    }
  } catch (err: any) {
    error.value = err.message || '获取指南失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchGuide()
})
</script>

<template>
  <div class="guide-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchGuide" class="retry-btn">重试</button>
    </div>

    <!-- 指南内容 -->
    <div v-else-if="guide" class="guide-content">
      <!-- 返回按钮 -->
      <button @click="goBack" class="back-btn">
        ← 返回指南列表
      </button>

      <!-- 指南头部 -->
      <div class="guide-header">
        <div class="guide-meta">
          <span class="category-tag">
            {{ guide.category?.icon }} {{ guide.category?.name }}
          </span>
          <span class="view-count">👁 {{ guide.viewCount }} 次浏览</span>
        </div>
        <h1 class="guide-title">{{ guide.title }}</h1>
        <p v-if="guide.excerpt" class="guide-excerpt">{{ guide.excerpt }}</p>
      </div>

      <!-- Markdown 内容 -->
      <div class="markdown-body">
        <MarkdownView :source="guide.content" />
      </div>

      <!-- 底部操作 -->
      <div class="guide-footer">
        <button @click="goBack" class="action-btn">
          ← 返回指南列表
        </button>
      </div>
    </div>

    <!-- 未找到 -->
    <div v-else class="empty-state">
      <p>指南不存在</p>
      <button @click="goBack" class="action-btn">返回指南列表</button>
    </div>
  </div>
</template>

<style scoped>
.guide-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

/* 指南内容 */
.guide-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2rem;
}

.back-btn:hover {
  border-color: #f97316;
  color: #f97316;
}

/* 指南头部 */
.guide-header {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #f1f5f9;
}

.guide-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.view-count {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.guide-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.guide-excerpt {
  color: #64748b;
  font-size: 1.125rem;
  line-height: 1.7;
  margin: 0;
}

/* Markdown 内容 */
.markdown-body {
  color: #334155;
  line-height: 1.8;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: #1e293b;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.markdown-body :deep(h1) { font-size: 1.875rem; }
.markdown-body :deep(h2) { font-size: 1.5rem; }
.markdown-body :deep(h3) { font-size: 1.25rem; }
.markdown-body :deep(h4) { font-size: 1.125rem; }

.markdown-body :deep(p) {
  margin-bottom: 1rem;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-body :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-body :deep(code) {
  background: #f1f5f9;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  color: #e11d48;
}

.markdown-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-body :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #f97316;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #64748b;
}

.markdown-body :deep(a) {
  color: #f97316;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.75rem;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* 底部操作 */
.guide-footer {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #f1f5f9;
  display: flex;
  justify-content: center;
}

.action-btn {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
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
</style>

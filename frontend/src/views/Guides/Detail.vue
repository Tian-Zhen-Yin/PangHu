<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from 'vue-markdown-render'
import 'highlight.js/styles/github.css'
import { getGuideById } from '../../api/guide.js'
import type { Guide } from '../../types/guide.js'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CategoryIcons, { type CategoryIconType } from '../../components/guide/CategoryIcons.vue'

const route = useRoute()
const router = useRouter()

const guide = ref<Guide | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const feedbackGiven = ref<boolean | null>(null)
const mascotExpression = ref<'default' | 'happy'>('default')

// 目录数据
interface TocItem {
  id: string
  title: string
  level: number
}

const tableOfContents = ref<TocItem[]>([])
const activeTocId = ref<string>('')

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
      extractTableOfContents()
    } else {
      error.value = response.message || '获取指南失败'
    }
  } catch (err: any) {
    error.value = err.message || '获取指南失败'
  } finally {
    loading.value = false
  }
}

// 提取目录
function extractTableOfContents() {
  if (!guide.value?.content) return

  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const toc: TocItem[] = []
  let match

  while ((match = headingRegex.exec(guide.value.content)) !== null) {
    const level = match[1]!.length
    const title = match[2]!.trim()
    const id = title.toLowerCase().replace(/\s+/g, '-')

    toc.push({ id, title, level })
  }

  tableOfContents.value = toc
}

// 滚动到目录项
function scrollToTocItem(id: string) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 反馈处理
function handleFeedback(helpful: boolean) {
  feedbackGiven.value = helpful
  if (helpful) {
    mascotExpression.value = 'happy'
  }
}

// 获取分类图标类型
function getCategoryIconType(slug?: string): CategoryIconType {
  if (!slug) return 'default'
  const iconMap: Record<string, CategoryIconType> = {
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

onMounted(() => {
  fetchGuide()
})
</script>

<template>
  <div class="guide-detail-refined">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-mascot">
        <MascotCharacter expression="yawning" size="large" :animated="true" />
      </div>
      <p class="loading-text">胖虎正在加载文章...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="error-text">{{ error }}</p>
      <button @click="fetchGuide" class="retry-btn">重试</button>
    </div>

    <!-- 指南内容 -->
    <template v-else-if="guide">
      <div class="detail-layout">
        <!-- 左侧目录 - 胖虎导读 -->
        <aside v-if="tableOfContents.length > 0" class="reading-sidebar">
          <div class="sidebar-mascot">
            <MascotCharacter
              :expression="mascotExpression"
              size="medium"
              :animated="true"
            />
          </div>
          <div class="sidebar-content">
            <h4 class="sidebar-title">胖虎导读</h4>
            <nav class="toc-nav">
              <button
                v-for="item in tableOfContents"
                :key="item.id"
                :class="['toc-item', { active: activeTocId === item.id }]"
                :style="{ paddingLeft: `${item.level * 8 + 8}px` }"
                @click="scrollToTocItem(item.id)"
              >
                {{ item.title }}
              </button>
            </nav>
          </div>
        </aside>

        <!-- 主内容区 -->
        <main class="content-main">
          <!-- 顶部导航 -->
          <button @click="goBack" class="back-button">
            <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            返回指南列表
          </button>

          <!-- 文章卡片 -->
          <article class="guide-article">
            <!-- 文章头部 -->
            <header class="article-header">
              <div class="article-meta">
                <span class="category-badge">
                  <CategoryIcons
                    :type="getCategoryIconType(guide.category?.slug)"
                    :size="16"
                  />
                  {{ guide.category?.name }}
                </span>
                <span class="view-count">
                  <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  {{ guide.viewCount || 0 }}
                </span>
              </div>

              <h1 class="article-title">{{ guide.title }}</h1>

              <p v-if="guide.excerpt" class="article-excerpt">
                {{ guide.excerpt }}
              </p>
            </header>

            <!-- Markdown 内容 -->
            <div class="markdown-content">
              <MarkdownView :source="guide.content" />
            </div>

            <!-- 交互式反馈 -->
            <footer class="article-footer">
              <div v-if="feedbackGiven === null" class="feedback-section">
                <div class="feedback-mascot">
                  <MascotCharacter expression="default" size="small" :animated="false" />
                </div>
                <div class="feedback-content">
                  <p class="feedback-question">这篇文章对你有帮助吗？</p>
                  <div class="feedback-buttons">
                    <button
                      class="feedback-btn helpful"
                      @click="handleFeedback(true)"
                    >
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                      </svg>
                      有帮助
                    </button>
                    <button
                      class="feedback-btn not-helpful"
                      @click="handleFeedback(false)"
                    >
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
                      </svg>
                      没帮助
                    </button>
                  </div>
                </div>
              </div>

              <!-- 反馈后显示 -->
              <div v-else class="feedback-thanks">
                <MascotCharacter
                  :expression="feedbackGiven ? 'happy' : 'confused'"
                  size="medium"
                  :animated="false"
                />
                <p class="thanks-text">
                  {{ feedbackGiven ? '胖虎很开心能帮到你！' : '胖虎会继续努力的...' }}
                </p>
              </div>
            </footer>
          </article>
        </main>
      </div>
    </template>

    <!-- 未找到 -->
    <div v-else class="empty-state">
      <MascotCharacter expression="confused" size="large" :animated="false" />
      <p class="empty-text">指南不存在</p>
      <button @click="goBack" class="action-btn">返回指南列表</button>
    </div>
  </div>
</template>

<style scoped>
/* ================= 页面容器 ================= */
.guide-detail-refined {
  background: var(--color-bg-warm);
  padding: 24px 24px 100px;
  animation: fadeIn 0.4s ease-out;
}

@media (min-width: 768px) {
  .guide-detail-refined {
    padding: 24px 24px 80px;
  }
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

/* ================= 加载/错误状态 ================= */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-mascot {
  width: 120px;
  height: 120px;
  margin-bottom: 20px;
}

.loading-text,
.error-text,
.empty-text {
  font-size: 14px;
  color: var(--color-text-regular);
  margin: 0 0 20px 0;
}

.retry-btn,
.action-btn {
  padding: 12px 28px;
  background: var(--color-primary-gradient);
  color: #FFFFFF;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: var(--color-primary-gradient-hover);
  transform: translateY(-2px);
}

.retry-btn:hover,
.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 162, 97, 0.35);
}

/* ================= 布局 ================= */
.detail-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: start;
}

/* ================= 侧边栏 - 胖虎导读 ================= */
.reading-sidebar {
  position: sticky;
  top: 24px;
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #F5F0E8;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.06);
}

.sidebar-mascot {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 16px;
  border: 1px solid var(--color-primary-medium);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 16px 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  width: 100%;
  text-align: left;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toc-item:hover {
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  color: #7C2D12;
}

.toc-item.active {
  background: var(--color-primary-gradient);
  color: #FFFFFF;
  font-weight: 600;
}

/* ================= 主内容区 ================= */
.content-main {
  min-width: 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1.5px solid var(--color-border-light);
  border-radius: 100px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.back-button:hover {
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border-color: var(--color-primary-medium);
  color: #7C2D12;
}

.back-icon {
  width: 16px;
  height: 16px;
}

/* ================= 文章卡片 ================= */
.guide-article {
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 24px;
  padding: 32px;
  border: 1px solid #FFFFFF;
  box-shadow:
    0 4px 24px rgba(244, 162, 97, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.03);
}

.article-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F5F0E8;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border: 1px solid var(--color-primary-medium);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.view-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-regular);
  font-size: 12px;
}

.icon-eye {
  width: 14px;
  height: 14px;
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.article-excerpt {
  font-size: 16px;
  color: var(--color-text-regular);
  line-height: 1.7;
  margin: 0;
}

/* ================= Markdown 内容 ================= */
.markdown-content {
  color: var(--color-text-primary);
  line-height: 1.8;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  color: var(--color-text-primary);
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  scroll-margin-top: 100px;
}

.markdown-content :deep(h1) { font-size: 24px; }
.markdown-content :deep(h2) { font-size: 20px; }
.markdown-content :deep(h3) { font-size: 18px; }
.markdown-content :deep(h4) { font-size: 16px; }

.markdown-content :deep(p) {
  margin-bottom: 1rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(code) {
  background: var(--color-bg-cream);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875em;
  color: var(--color-primary);
  font-family: 'Courier New', monospace;
}

.markdown-content :deep(pre) {
  background: var(--color-bg-warm);
  padding: 1rem;
  border-radius: 12px;
  overflow-x: auto;
  margin-bottom: 1rem;
  border: 1px solid #F5F0E8;
}

.markdown-content :deep(pre code) {
  background: transparent;
  color: var(--color-text-primary);
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary-medium);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--color-text-regular);
  background: linear-gradient(90deg, var(--color-bg-cream) 0%, transparent 100%);
  padding: 12px 16px;
  border-radius: 0 12px 12px 0;
}

.markdown-content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-primary-medium);
  transition: all 0.2s;
}

.markdown-content :deep(a:hover) {
  border-bottom-style: solid;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #F5F0E8;
  padding: 12px 16px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--color-bg-warm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.markdown-content :deep(img) {
  max-width: 100%;
  border-radius: 16px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* ================= 交互式反馈 ================= */
.article-footer {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #F5F0E8;
}

.feedback-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 16px;
  border: 1px solid var(--color-primary-medium);
}

.feedback-mascot {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.feedback-content {
  flex: 1;
}

.feedback-question {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.feedback-buttons {
  display: flex;
  gap: 10px;
}

.feedback-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 100px;
  border: 1.5px solid;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.feedback-btn.helpful {
  background: #FFFFFF;
  border-color: var(--color-success);
  color: var(--color-success);
}

.feedback-btn.helpful:hover {
  background: var(--color-success);
  color: #FFFFFF;
  transform: scale(1.05);
}

.feedback-btn.not-helpful {
  background: #FFFFFF;
  border-color: var(--color-text-secondary);
  color: var(--color-text-regular);
}

.feedback-btn.not-helpful:hover {
  background: var(--color-bg-block-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
  transform: scale(1.05);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 反馈后显示 */
.feedback-thanks {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 16px;
  border: 1px solid var(--color-primary-medium);
  text-align: center;
}

.thanks-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

/* ================= 移动端适配 ================= */
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .reading-sidebar {
    position: static;
  }
}

@media (max-width: 767px) {
  .guide-detail-refined {
    padding: 12px;
    padding-bottom: 80px; /* 减少底部内边距 */
  }

  .guide-article {
    padding: 16px;
    border-radius: 16px;
  }

  /* 文章头部优化 */
  .article-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
  }

  .article-meta {
    gap: 8px;
    flex-wrap: wrap;
  }

  .category-badge {
    font-size: 11px;
    padding: 5px 12px;
  }

  .view-count {
    font-size: 11px;
  }

  .article-title {
    font-size: 20px;
    line-height: 1.4;
  }

  .article-excerpt {
    font-size: 14px;
    line-height: 1.6;
  }

  /* Markdown 内容移动端优化 */
  .markdown-content {
    font-size: 15px; /* 增加基础字体大小 */
    line-height: 1.7;
  }

  .markdown-content :deep(h1) {
    font-size: 20px;
    margin-top: 1.5rem;
  }

  .markdown-content :deep(h2) {
    font-size: 18px;
    margin-top: 1.5rem;
  }

  .markdown-content :deep(h3) {
    font-size: 16px;
    margin-top: 1.2rem;
  }

  .markdown-content :deep(h4) {
    font-size: 15px;
  }

  .markdown-content :deep(p) {
    margin-bottom: 0.8rem;
  }

  .markdown-content :deep(ul),
  .markdown-content :deep(ol) {
    padding-left: 1.2rem;
    margin-bottom: 0.8rem;
  }

  .markdown-content :deep(li) {
    margin-bottom: 0.3rem;
  }

  /* 代码块优化 */
  .markdown-content :deep(pre) {
    padding: 0.75rem;
    font-size: 13px;
    overflow-x: auto;
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px);
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .markdown-content :deep(code) {
    font-size: 0.85em;
    padding: 0.15rem 0.4rem;
  }

  /* 表格横向滚动 */
  .markdown-content :deep(table) {
    display: block;
    overflow-x: auto;
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px);
    border-radius: 0;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap; /* 防止表格内容换行 */
  }

  /* 图片优化 */
  .markdown-content :deep(img) {
    margin: 1rem -16px; /* 图片延伸到边缘 */
    width: calc(100% + 32px);
    max-width: calc(100% + 32px);
    border-radius: 12px;
  }

  /* 引用块优化 */
  .markdown-content :deep(blockquote) {
    padding: 12px;
    margin: 1rem -16px;
    width: calc(100% + 32px);
    border-radius: 0;
  }

  /* 返回按钮优化 */
  .back-button {
    padding: 8px 16px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .back-icon {
    width: 14px;
    height: 14px;
  }

  /* 侧边栏移动端优化 */
  .reading-sidebar {
    padding: 16px;
    margin-bottom: 16px;
  }

  .sidebar-mascot {
    width: 56px;
    height: 56px;
    margin-bottom: 12px;
  }

  .sidebar-title {
    font-size: 13px;
    margin-bottom: 12px;
  }

  .toc-item {
    padding: 6px 8px;
    font-size: 12px;
  }

  /* 反馈区域优化 */
  .article-footer {
    margin-top: 24px;
    padding-top: 20px;
  }

  .feedback-section {
    flex-direction: column;
    text-align: center;
    padding: 16px;
    gap: 12px;
  }

  .feedback-mascot {
    width: 40px;
    height: 40px;
  }

  .feedback-question {
    font-size: 13px;
    margin-bottom: 10px;
  }

  .feedback-buttons {
    gap: 8px;
    width: 100%;
  }

  .feedback-btn {
    flex: 1;
    justify-content: center;
    padding: 8px 16px;
    font-size: 13px;
  }

  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .feedback-thanks {
    padding: 20px 16px;
    gap: 12px;
  }

  .thanks-text {
    font-size: 13px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 375px) {
  .guide-detail-refined {
    padding: 8px;
  }

  .guide-article {
    padding: 12px;
  }

  .article-title {
    font-size: 18px;
  }

  .markdown-content {
    font-size: 14px;
  }

  .markdown-content :deep(h1) {
    font-size: 18px;
  }

  .markdown-content :deep(h2) {
    font-size: 16px;
  }

  .category-badge {
    font-size: 10px;
    padding: 4px 10px;
  }
}
</style>

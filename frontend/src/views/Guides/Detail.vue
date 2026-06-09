<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from 'vue-markdown-render'
import 'highlight.js/styles/github.css'
import { getGuideById } from '../../api/guide.js'
import type { Guide } from '../../types/guide.js'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CategoryIcons, { type CategoryIconType } from '../../components/guide/CategoryIcons.vue'
import GuideOverview from '../../components/guides/GuideOverview.vue'
import Breadcrumb from '../../components/common/Breadcrumb.vue'
import { removeFirstH1, extractFirstH1Title } from '../../utils/markdown'

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
let observer: IntersectionObserver | null = null

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
      // 提取首个 H1 作为导读（如果没有导读字段）
      if (!guide.value.overview && guide.value.content) {
        const firstH1 = extractFirstH1Title(guide.value.content)
        if (firstH1) {
          guide.value.overview = `本文将详细介绍 ${firstH1}，包括相关概念、实践方法和注意事项。`
        }
      }
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

// 设置IntersectionObserver来跟踪当前可见的标题
function setupHeadingObserver() {
  // 清理旧的observer
  if (observer) {
    observer.disconnect()
  }

  const headingElements = document.querySelectorAll('.markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6')

  if (headingElements.length === 0) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id
          if (id) {
            activeTocId.value = id
          }
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '-100px 0px -80% 0px'
    }
  )

  headingElements.forEach((element) => {
    observer!.observe(element)
  })
}

// 清理observer
function cleanupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
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

// 去除 Markdown 首个 H1（避免与页面标题重复）
const processedMarkdown = computed(() => {
  if (!guide.value?.content) return ''
  return removeFirstH1(guide.value.content)
})

// 计算阅读时长（按 300 字/分钟估算）
const readingTime = computed(() => {
  if (!guide.value?.content) return 0
  const wordCount = guide.value.content.length
  const minutes = Math.ceil(wordCount / 300)
  return Math.max(1, minutes)
})

onMounted(async () => {
  await fetchGuide()
  // 等待DOM更新后再设置观察器
  setTimeout(() => {
    setupHeadingObserver()
  }, 100)
})

onUnmounted(() => {
  cleanupObserver()
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
        <!-- 主内容区 -->
        <main class="content-main">
          <!-- 面包屑导航 -->
          <Breadcrumb />

          <!-- 胖虎导读 -->
          <GuideOverview
            v-if="guide.overview"
            :content="guide.overview"
            :guide-id="guide.id || guide.slug || 'default'"
          />

          <!-- 目录树 -->
          <nav v-if="tableOfContents.length > 0" class="table-of-contents" aria-label="目录">
            <h3 class="toc-title">目录</h3>
            <ul class="toc-list" role="list">
              <li
                v-for="item in tableOfContents"
                :key="item.id"
                :class="['toc-item', `level-${item.level}`, { active: activeTocId === item.id }]"
              >
                <button
                  class="toc-link"
                  :aria-current="activeTocId === item.id ? 'page' : undefined"
                  @click="scrollToTocItem(item.id)"
                >
                  {{ item.title }}
                </button>
              </li>
            </ul>
          </nav>

          <!-- 文章卡片 -->
          <article class="guide-article">
            <!-- 文章标题 -->
            <h1 class="article-title">{{ guide.title }}</h1>

            <!-- 元数据行 -->
            <div class="article-meta">
              <span class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {{ new Date(guide.createdAt || Date.now()).toLocaleDateString('zh-CN') }}
              </span>
              <span class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ readingTime }} 分钟
              </span>
              <span v-if="guide.category" class="meta-item category-badge">
                <CategoryIcons
                  :type="getCategoryIconType(guide.category?.slug)"
                  :size="14"
                />
                {{ guide.category.name }}
              </span>
            </div>

            <!-- Markdown 内容 -->
            <div class="markdown-content">
              <MarkdownView :source="processedMarkdown" />
            </div>

            <!-- 删除 excerpt，保持简洁 -->

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
  min-height: 100vh;
  padding: var(--space-4xl) var(--space-lg);
  background: var(--color-bg-page);
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
  max-width: var(--container-lg);
  margin: 0 auto;
  display: grid;
  /* Single column layout */
  grid-template-columns: 1fr;
  gap: var(--space-2xl);
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

/* 目录树 */
.table-of-contents {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: var(--space-2xl);
}

/* Key area spacing: 32px (--space-2xl) */
.guide-overview,
.table-of-contents,
.feedback-section {
  margin-bottom: var(--space-2xl);
}

@media (max-width: 767px) {
  /* Mobile key area spacing: 24px */
  .guide-overview,
  .table-of-contents,
  .feedback-section {
    margin-bottom: var(--space-xl);
  }
}

.toc-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.toc-title::before {
  content: '📑';
  font-size: var(--text-lg);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: var(--space-xs) 0;
}

.toc-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--text-sm);
  line-height: 1.5;
}

/* 层级 1（父级）- semibold, 深色 */
.toc-item.level-1 .toc-link {
  font-weight: 600;
  color: var(--color-text-primary);
  padding-left: 0;
}

/* 层级 2（子级）- regular, 浅色, 缩进 */
.toc-item.level-2 .toc-link {
  font-weight: 400;
  color: var(--color-text-regular);
  padding-left: var(--space-lg);
}

/* 层级 3（子子级）- regular, 更浅色, 更大缩进 */
.toc-item.level-3 .toc-link {
  font-weight: 400;
  color: var(--color-text-secondary);
  padding-left: var(--space-2xl);
}

/* 悬停效果 */
.toc-link:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
}

/* 激活状态 */
.toc-item.active .toc-link {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .table-of-contents {
    padding: var(--space-md);
  }
}

/* ================= 主内容区 ================= */
.content-main {
  max-width: 800px;
  margin: 0 auto;
}

/* ================= 文章卡片 ================= */
.guide-article {
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 24px;
  padding: 20px;
  border: 1px solid #FFFFFF;
  box-shadow:
    0 4px 24px rgba(244, 162, 97, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.03);
  margin-bottom: 32px;
}

.article-title {
  font-size: 36px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
  margin: 0 0 var(--space-xl) 0;
}

@media (max-width: 767px) {
  .article-title {
    font-size: 28px;
  }
}

/* Metadata row */
.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  margin-bottom: var(--space-xl);
  border-bottom: 1px solid var(--color-divider);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 14px;
  color: var(--color-text-secondary);
}

.meta-icon {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--morandi-blue);
  color: var(--color-text-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

/* ================= Markdown 内容 ================= */
.markdown-content {
  line-height: 1.6;
  color: var(--color-text-regular);
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
.markdown-content :deep(h2) {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: var(--space-2xl) 0 var(--space-lg) 0;
  padding-top: var(--space-2xl);
}
.markdown-content :deep(h3) {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: var(--space-xl) 0 var(--space-md) 0;
}
.markdown-content :deep(h4) { font-size: 16px; }

.markdown-content :deep(p) {
  margin: var(--space-md) 0;
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
    padding: var(--space-md) var(--space-sm);
  }

  .guide-article {
    padding: 16px;
    border-radius: 16px;
  }

  /* 文章头部优化 */
  .article-title {
    font-size: 28px;
    line-height: 1.4;
  }

  .article-meta {
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .meta-item {
    font-size: 12px;
  }

  .meta-icon {
    width: 12px;
    height: 12px;
  }

  .category-badge {
    font-size: var(--text-xs);
    padding: var(--space-xs) var(--space-sm);
  }

  /* Markdown 内容移动端优化 */
  .markdown-content {
    font-size: 15px;
    line-height: 1.6;
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

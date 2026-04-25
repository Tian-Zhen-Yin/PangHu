<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTemplateStore } from '../../stores/template'

const router = useRouter()
const templateStore = useTemplateStore()

// 查看模板详情
function viewTemplate(id: string) {
  router.push(`/templates/${id}`)
}

// 获取模板项目数量
function getTemplateItemCount(template: any): number {
  const content = templateStore.parseTemplateContent(template.content)
  if (!content) return 0

  // 计算所有任务数量
  if (content.tasks) return content.tasks.length
  if (content.schedule) return content.schedule.length
  if (content.annual) return content.annual.length + (content.monthly?.length || 0) + (content.daily?.length || 0)

  return 0
}

// 初始化数据
onMounted(() => {
  templateStore.fetchTemplates()
})
</script>

<template>
  <div class="templates-page">
    <div class="page-header">
      <h1 class="page-title">📋 计划模板</h1>
      <p class="page-subtitle">预设的养成计划，轻松管理猫咪成长</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="templateStore.loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="templateStore.error" class="error-state">
      <p>{{ templateStore.error }}</p>
      <button @click="templateStore.fetchTemplates()" class="retry-btn">重试</button>
    </div>

    <!-- 模板列表 -->
    <div v-else class="templates-grid">
      <div
        v-for="template in templateStore.templates"
        :key="template.id"
        class="template-card"
        @click="viewTemplate(template.id)"
      >
        <div class="template-header">
          <span class="template-icon">{{ templateStore.getCategoryIcon(template.category) }}</span>
          <span class="template-category">{{ template.category }}</span>
        </div>
        <h3 class="template-name">{{ template.name }}</h3>
        <p class="template-description">{{ template.description }}</p>
        <div class="template-footer">
          <span class="template-items">{{ getTemplateItemCount(template) }} 项任务</span>
          <button class="use-btn">
            查看详情
          </button>
        </div>
      </div>
    </div>

    <!-- 创建自定义计划 -->
    <div class="create-section">
      <h2 class="section-title">创建自定义计划</h2>
      <p class="section-text">根据您猫咪的具体情况，创建个性化的养成计划</p>
      <button class="create-btn" disabled>
        <span>+</span>
        创建新计划（即将推出）
      </button>
    </div>
  </div>
</template>

<style scoped>
.templates-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--color-text-regular);
  margin: 0;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-regular);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border-light);
  border-top-color: var(--color-primary);
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
  color: var(--color-danger);
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.template-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.template-icon {
  font-size: 2rem;
}

.template-category {
  background: var(--color-bg-block-hover);
  color: var(--color-text-regular);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.template-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem 0;
}

.template-description {
  color: var(--color-text-regular);
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-items {
  color: var(--color-text-placeholder);
  font-size: 0.875rem;
}

.use-btn {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.use-btn:hover {
  transform: scale(1.05);
}

.create-section {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.section-text {
  color: #a16207;
  margin: 0 0 2rem 0;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #92400e;
  border: 2px dashed #f59e0b;
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: not-allowed;
  opacity: 0.6;
}

.create-btn:not(:disabled) {
  cursor: pointer;
  opacity: 1;
  transition: all 0.3s ease;
}

.create-btn:not(:disabled):hover {
  border-color: var(--color-primary);
  background: var(--color-bg-cream);
}
</style>

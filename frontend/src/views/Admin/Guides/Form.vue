<template>
  <div class="guide-form-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="handleBack" />
        <div>
          <h1>{{ isEdit ? '编辑指南' : '新建指南' }}</h1>
          <p class="subtitle">{{ isEdit ? '修改知识指南内容' : '创建新的知识指南' }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="handleBack">取消</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :icon="Check"
          @click="handleSave"
        >
          {{ isEdit ? '保存修改' : '创建指南' }}
        </el-button>
      </div>
    </div>

    <!-- Form -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="guide-form"
    >
      <el-row :gutter="24">
        <!-- Left Column: Main Content -->
        <el-col :span="16">
          <el-card class="form-card" shadow="never">
            <template #header>
              <span>基本信息</span>
            </template>

            <el-form-item label="指南标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入指南标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="URL Slug" prop="slug">
              <el-input
                :model-value="form.slug"
                placeholder="根据标题自动生成"
                readonly
              >
                <template #prepend>/guides/</template>
                <template #append>
                  <el-button
                    v-if="!isEdit"
                    :icon="Refresh"
                    title="根据标题重新生成"
                    @click="regenerateSlug"
                  />
                </template>
              </el-input>
              <div class="form-tip">根据标题自动生成，无需手动填写</div>
            </el-form-item>

            <el-form-item label="摘要" prop="excerpt">
              <el-input
                v-model="form.excerpt"
                type="textarea"
                :rows="3"
                placeholder="请输入指南摘要（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="封面图片" prop="coverImage">
              <el-input
                v-model="form.coverImage"
                placeholder="请输入封面图片 URL（可选）"
              />
              <div v-if="form.coverImage" class="image-preview">
                <el-image
                  :src="form.coverImage"
                  fit="cover"
                  style="width: 200px; height: 120px; border-radius: 8px;"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>图片加载失败</span>
                    </div>
                  </template>
                </el-image>
              </div>
            </el-form-item>

            <el-form-item label="分类" prop="categoryId">
              <el-select
                v-model="form.categoryId"
                placeholder="请选择分类"
                style="width: 100%"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="标签" prop="tags">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                placeholder="请输入标签，按回车添加"
                style="width: 100%"
              >
                <el-option
                  v-for="tag in suggestedTags"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
              <div class="form-tip">例如：健康医疗、喂养营养、行为训练等</div>
            </el-form-item>
          </el-card>

          <el-card class="form-card markdown-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>内容 (Markdown)</span>
                <el-button
                  size="small"
                  :icon="View"
                  @click="showPreview = !showPreview"
                >
                  {{ showPreview ? '编辑' : '预览' }}
                </el-button>
              </div>
            </template>

            <!-- Markdown Editor -->
            <div v-if="!showPreview" class="markdown-editor">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="20"
                placeholder="请输入 Markdown 格式的指南内容..."
                class="markdown-textarea"
              />
              <div class="editor-toolbar">
                <el-text type="info" size="small">
                  💡 提示：支持标准 Markdown 语法。未来可集成更强大的编辑器（如 md-editor-v3）
                </el-text>
              </div>
            </div>

            <!-- Markdown Preview -->
            <div v-else class="markdown-preview">
              <div v-html="previewHtml" class="preview-content" />
            </div>
          </el-card>
        </el-col>

        <!-- Right Column: Sidebar -->
        <el-col :span="8">
          <el-card class="form-card" shadow="never">
            <template #header>
              <span>发布设置</span>
            </template>

            <el-form-item label="状态">
              <el-tag>草稿</el-tag>
              <div class="form-tip">指南创建后立即可见</div>
            </el-form-item>

            <el-form-item v-if="isEdit" label="浏览量">
              <el-text>{{ guideData?.viewCount || 0 }}</el-text>
            </el-form-item>

            <el-form-item v-if="isEdit" label="知识块">
              <el-text>{{ guideData?._count?.chunks || 0 }} 个</el-text>
              <el-button
                v-if="guideData?._count?.chunks === 0"
                size="small"
                type="primary"
                :icon="Upload"
                style="margin-top: 8px"
                @click="handleIngest"
              >
                同步到知识库
              </el-button>
            </el-form-item>

            <el-form-item v-if="isEdit" label="创建时间">
              <el-text>{{ formatDate(guideData?.createdAt) }}</el-text>
            </el-form-item>

            <el-form-item v-if="isEdit" label="更新时间">
              <el-text>{{ formatDate(guideData?.updatedAt) }}</el-text>
            </el-form-item>

            <el-divider />

            <el-form-item label="操作">
              <el-space direction="vertical" style="width: 100%">
                <el-button
                  v-if="isEdit"
                  style="width: 100%"
                  :icon="View"
                  @click="handleViewGuide"
                >
                  查看指南
                </el-button>
                <el-button
                  v-if="isEdit"
                  style="width: 100%"
                  type="warning"
                  :icon="Upload"
                  @click="handleIngest"
                >
                  同步到知识库
                </el-button>
                <el-button
                  v-if="isEdit"
                  style="width: 100%"
                  type="danger"
                  :icon="Delete"
                  @click="handleDelete"
                >
                  删除指南
                </el-button>
              </el-space>
            </el-form-item>
          </el-card>

          <!-- Markdown Tips -->
          <el-card class="form-card tips-card" shadow="never">
            <template #header>
              <span>💡 Markdown 语法提示</span>
            </template>
            <div class="markdown-tips">
              <el-text size="small" tag="div">
                <strong>标题：</strong># H1, ## H2, ### H3
              </el-text>
              <el-text size="small" tag="div">
                <strong>粗体/斜体：</strong>**粗体**, *斜体*
              </el-text>
              <el-text size="small" tag="div">
                <strong>列表：</strong>- 项目 或 1. 项目
              </el-text>
              <el-text size="small" tag="div">
                <strong>链接：</strong>[文本](url)
              </el-text>
              <el-text size="small" tag="div">
                <strong>图片：</strong>![alt](url)
              </el-text>
              <el-text size="small" tag="div">
                <strong>代码：</strong>`代码` 或 ```代码块```
              </el-text>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  Check,
  View,
  Upload,
  Delete,
  Picture,
  Refresh
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import { pinyin } from 'pinyin-pro'
import {
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide as deleteGuideApi,
  ingestGuide,
  getGuideCategories,
  type Guide,
  type GuideCategory
} from '@/api/admin'

const router = useRouter()
const route = useRoute()

// State
const formRef = ref<FormInstance>()
const saving = ref(false)
const showPreview = ref(false)
const categories = ref<GuideCategory[]>([])
const guideData = ref<Guide | null>(null)

// Check if edit mode
const isEdit = computed(() => !!route.params.id && route.params.id !== 'create')

// Form data
const form = ref({
  title: '',
  slug: '',
  excerpt: '',
  coverImage: '',
  categoryId: '',
  tags: [] as string[],
  content: '',
})

// Suggested tags
const suggestedTags = [
  '健康医疗',
  '喂养营养',
  '行为训练',
  '日常护理',
  '疫苗防疫',
  '体重管理',
  '幼猫护理',
  '成年猫',
  '老年猫',
]

// Form validation rules
const rules: FormRules = {
  title: [
    { required: true, message: '请输入指南标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度应在 2-100 个字符之间', trigger: 'blur' },
  ],
  slug: [
    { required: true, message: '请输入 URL slug', trigger: 'blur' },
    {
      pattern: /^[a-z0-9-]+$/,
      message: 'Slug 只能包含小写字母、数字和连字符',
      trigger: 'blur',
    },
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change' },
  ],
  content: [
    { required: true, message: '请输入指南内容', trigger: 'blur' },
    { min: 10, message: '内容至少需要 10 个字符', trigger: 'blur' },
  ],
}

// Computed preview HTML
const previewHtml = computed(() => {
  if (!form.value.content) return '<p class="empty-preview">暂无内容</p>'
  try {
    return marked(form.value.content)
  } catch (error) {
    return '<p class="preview-error">Markdown 解析错误</p>'
  }
})

// Load categories
async function loadCategories() {
  try {
    const response = await getGuideCategories()
    if (response.success) {
      categories.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to load categories:', error)
  }
}

// Load guide data for edit mode
async function loadGuideData() {
  if (!isEdit.value) return

  try {
    const response = await getGuideById(route.params.id as string)
    if (response.success) {
      guideData.value = response.data
      form.value = {
        title: response.data.title,
        slug: response.data.slug,
        excerpt: response.data.excerpt || '',
        coverImage: response.data.coverImage || '',
        categoryId: response.data.categoryId,
        tags: response.data.tags || [],
        content: response.data.content,
      }
    } else {
      ElMessage.error(response.message || '加载指南失败')
      router.push('/admin/guides')
    }
  } catch (error: any) {
    console.error('Failed to load guide:', error)
    ElMessage.error('加载指南失败')
    router.push('/admin/guides')
  }
}

// Auto-generate slug from title (中文标题 → 拼音 slug)
// 例：「幼猫疫苗接种时间表」→ you-mao-yi-miao-jie-zhong-shi-jian-biao
function generateSlug(title: string) {
  if (!title) return ''
  return pinyin(title, {
    toneType: 'none',     // 不带声调
    type: 'array',        // 输出数组，每个字一项
    nonZh: 'consecutive', // 非中文字符（英文/数字）原样保留并连写
  })
    .join('-')            // 用连字符拼接
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')  // 去掉标点、空格等
    .replace(/-+/g, '-')         // 合并连续连字符
    .replace(/^-+|-+$/g, '')     // 去掉首尾连字符
}

// 监听标题变化，自动生成 slug（仅新建模式；编辑模式保留已有 slug）
watch(
  () => form.value.title,
  (newTitle) => {
    if (isEdit.value) return
    form.value.slug = generateSlug(newTitle)
  }
)

// 根据当前标题重新生成 slug（手动触发的重置入口）
function regenerateSlug() {
  form.value.slug = generateSlug(form.value.title)
}

// Save guide
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写是否正确')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const response = await updateGuide(route.params.id as string, form.value)
      if (response.success) {
        ElMessage.success('指南更新成功')
        await loadGuideData()
      } else {
        ElMessage.error(response.message || '更新失败')
      }
    } else {
      const response = await createGuide(form.value)
      if (response.success) {
        ElMessage.success('指南创建成功')
        router.push(`/admin/guides/${response.data.id}/edit`)
      } else {
        ElMessage.error(response.message || '创建失败')
      }
    }
  } catch (error: any) {
    console.error('Failed to save guide:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Delete guide
async function handleDelete() {
  if (!isEdit.value || !guideData.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除指南「${guideData.value.title}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    const response = await deleteGuideApi(guideData.value.id)
    if (response.success) {
      ElMessage.success('删除成功')
      router.push('/admin/guides')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete guide:', error)
      ElMessage.error('删除失败')
    }
  }
}

// Ingest to knowledge base
async function handleIngest() {
  if (!isEdit.value || !guideData.value) return

  try {
    const response = await ingestGuide(guideData.value.id)
    if (response.success) {
      ElMessage.success('同步到知识库成功')
      await loadGuideData()
    } else {
      ElMessage.error(response.message || '同步失败')
    }
  } catch (error: any) {
    console.error('Failed to ingest guide:', error)
    ElMessage.error('同步失败')
  }
}

// View guide
function handleViewGuide() {
  if (!isEdit.value) return
  // TODO: Navigate to public guide view or admin preview
  ElMessage.info('指南预览功能开发中')
}

// Back to list
function handleBack() {
  router.push('/admin/guides')
}

// Format date
function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Lifecycle
onMounted(() => {
  loadCategories()
  loadGuideData()
})
</script>

<style scoped>
.guide-form-page {
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-header:hover {
  box-shadow: 0 2px 16px rgba(59, 130, 246, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1f2c;
  letter-spacing: -0.3px;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.form-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-card:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.form-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
  padding: 16px 20px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1f2c;
}

.form-card :deep(.el-card__body) {
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.5;
}

.image-preview {
  margin-top: 12px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 12px;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.markdown-card {
  margin-top: 24px;
}

.markdown-editor {
  position: relative;
}

.markdown-textarea :deep(textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.editor-toolbar {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
}

.markdown-preview {
  min-height: 400px;
}

.preview-content {
  font-size: 15px;
  line-height: 1.8;
  color: #1a1f2c;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #1a1f2c;
}

.preview-content :deep(p) {
  margin-bottom: 16px;
}

.preview-content :deep(code) {
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
}

.preview-content :deep(pre) {
  background: #1a1f2c;
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.preview-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.preview-content :deep(li) {
  margin-bottom: 8px;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  margin-bottom: 16px;
  color: #64748b;
}

.empty-preview,
.preview-error {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.tips-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.markdown-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 1200px) {
  .guide-form-page :deep(.el-col-16) {
    width: 100%;
  }

  .guide-form-page :deep(.el-col-8) {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }

  .header-left {
    width: 100%;
  }

  .header-right {
    width: 100%;
  }

  .header-right .el-button {
    flex: 1;
  }

  .form-card :deep(.el-card__body) {
    padding: 16px;
  }
}
</style>

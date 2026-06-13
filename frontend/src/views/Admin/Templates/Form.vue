<template>
  <div class="template-form-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="handleBack" />
        <div>
          <h1>{{ isEdit ? '编辑模板' : '新建模板' }}</h1>
          <p class="subtitle">{{ isEdit ? '修改计划模板内容' : '创建新的计划模板' }}</p>
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
          {{ isEdit ? '保存修改' : '创建模板' }}
        </el-button>
      </div>
    </div>

    <!-- Form -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="template-form"
    >
      <el-row :gutter="24">
        <!-- Left Column: Main Content -->
        <el-col :span="16">
          <el-card class="form-card" shadow="never">
            <template #header>
              <span>基本信息</span>
            </template>

            <el-form-item label="模板名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入模板名称"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="分类" prop="category">
              <el-select
                v-model="form.category"
                placeholder="请选择分类"
                style="width: 100%"
              >
                <el-option label="健康护理" value="健康护理" />
                <el-option label="疫苗接种" value="疫苗接种" />
                <el-option label="驱虫计划" value="驱虫计划" />
                <el-option label="体重管理" value="体重管理" />
                <el-option label="日常护理" value="日常护理" />
                <el-option label="行为训练" value="行为训练" />
              </el-select>
            </el-form-item>

            <el-form-item label="适用阶段" prop="stageId">
              <el-select
                v-model="form.stageId"
                placeholder="选择适用阶段（可选）"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="stage in stages"
                  :key="stage.id"
                  :label="`${stage.name} (${stage.ageRange})`"
                  :value="stage.id"
                />
              </el-select>
              <div class="form-tip">留空表示适用于所有阶段</div>
            </el-form-item>

            <el-form-item label="描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请输入模板描述"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-card>

          <el-card class="form-card json-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>模板内容 (JSON)</span>
                <el-button-group>
                  <el-button
                    size="small"
                    :icon="DocumentCopy"
                    @click="handleFormatJson"
                  >
                    格式化
                  </el-button>
                  <el-button
                    size="small"
                    :icon="MagicStick"
                    @click="handleValidateJson"
                  >
                    验证
                  </el-button>
                  <el-button
                    size="small"
                    :icon="Box"
                    @click="showTemplateHelp = true"
                  >
                    模板示例
                  </el-button>
                </el-button-group>
              </div>
            </template>

            <!-- JSON Editor -->
            <div class="json-editor">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="20"
                placeholder='请输入 JSON 格式的模板内容，例如：{"tasks": [{"name": "定期称重", "frequency": "weekly"}]}'
                class="json-textarea"
                @input="handleJsonInput"
              />
              <div v-if="jsonError" class="json-error">
                <el-icon><Warning /></el-icon>
                <span>{{ jsonError }}</span>
              </div>
              <div v-else-if="jsonValid" class="json-success">
                <el-icon><SuccessFilled /></el-icon>
                <span>JSON 格式正确</span>
              </div>
            </div>

            <!-- JSON Preview (if valid) -->
            <div v-if="parsedContent && jsonValid" class="json-preview">
              <div class="preview-header">
                <el-text weight="bold">内容预览</el-text>
              </div>
              <el-descriptions :column="2" border>
                <el-descriptions-item
                  v-for="(value, key) in parsedContent"
                  :key="key"
                  :label="key"
                >
                  {{ formatValue(value) }}
                </el-descriptions-item>
              </el-descriptions>
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
              <el-tag>活跃</el-tag>
              <div class="form-tip">模板创建后立即可用</div>
            </el-form-item>

            <el-form-item v-if="isEdit" label="使用次数">
              <el-text>{{ templateData?.usageCount || 0 }} 次</el-text>
            </el-form-item>

            <el-form-item v-if="isEdit" label="创建时间">
              <el-text>{{ formatDate(templateData?.createdAt) }}</el-text>
            </el-form-item>

            <el-form-item v-if="isEdit" label="更新时间">
              <el-text>{{ formatDate(templateData?.updatedAt) }}</el-text>
            </el-form-item>

            <el-divider />

            <el-form-item label="操作">
              <el-space direction="vertical" style="width: 100%">
                <el-button
                  v-if="isEdit"
                  style="width: 100%"
                  :icon="View"
                  @click="handleViewTemplate"
                >
                  查看模板
                </el-button>
                <el-button
                  v-if="isEdit"
                  style="width: 100%"
                  type="danger"
                  :icon="Delete"
                  @click="handleDelete"
                >
                  删除模板
                </el-button>
              </el-space>
            </el-form-item>
          </el-card>

          <!-- JSON Tips -->
          <el-card class="form-card tips-card" shadow="never">
            <template #header>
              <span>💡 JSON 格式提示</span>
            </template>
            <div class="json-tips">
              <el-text size="small" tag="div">
                <strong>基本格式：</strong>{"key": "value"}
              </el-text>
              <el-text size="small" tag="div">
                <strong>数组：</strong>{"items": [1, 2, 3]}
              </el-text>
              <el-text size="small" tag="div">
                <strong>嵌套：</strong>{"task": {"name": "任务", "done": false}}
              </el-text>
              <el-text size="small" tag="div">
                <strong>注意：</strong>键名必须使用双引号
              </el-text>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-form>

    <!-- Template Help Dialog -->
    <el-dialog
      v-model="showTemplateHelp"
      title="模板示例"
      width="800px"
    >
      <el-tabs v-model="activeTemplateTab">
        <el-tab-pane label="基础模板" name="basic">
          <pre class="template-example">{{ templateExamples.basic }}</pre>
        </el-tab-pane>
        <el-tab-pane label="任务模板" name="tasks">
          <pre class="template-example">{{ templateExamples.tasks }}</pre>
        </el-tab-pane>
        <el-tab-pane label="健康计划" name="health">
          <pre class="template-example">{{ templateExamples.health }}</pre>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showTemplateHelp = false">关闭</el-button>
        <el-button type="primary" @click="useTemplateExample">
          使用此模板
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  Check,
  View,
  Delete,
  DocumentCopy,
  MagicStick,
  Box,
  Warning,
  SuccessFilled
} from '@element-plus/icons-vue'
import {
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate as deleteTemplateApi,
  getTemplateStages,
  type Template,
  type TemplateStage
} from '@/api/admin'

const router = useRouter()
const route = useRoute()

// State
const formRef = ref<FormInstance>()
const saving = ref(false)
const jsonError = ref('')
const jsonValid = ref(false)
const showTemplateHelp = ref(false)
const activeTemplateTab = ref('basic')
const stages = ref<TemplateStage[]>([])
const templateData = ref<Template | null>(null)

// Check if edit mode
const isEdit = computed(() => !!route.params.id && route.params.id !== 'create')

// Form data
const form = ref({
  name: '',
  category: '',
  description: '',
  stageId: '',
  content: '',
})

// Template examples
const templateExamples = {
  basic: `{
  "title": "基础护理计划",
  "description": "日常基本护理任务",
  "duration": "30天"
}`,
  tasks: `{
  "title": "疫苗接种计划",
  "tasks": [
    {
      "name": "第一次疫苗接种",
      "ageWeeks": 8,
      "vaccine": "FVRCP",
      "description": "核心疫苗第一次接种"
    },
    {
      "name": "第二次疫苗接种",
      "ageWeeks": 12,
      "vaccine": "FVRCP",
      "description": "核心疫苗第二次接种"
    }
  ]
}`,
  health: `{
  "title": "健康管理计划",
  "checkups": [
    {
      "type": "体重检查",
      "frequency": "weekly",
      "notes": "记录体重变化"
    },
    {
      "type": "健康检查",
      "frequency": "yearly",
      "notes": "年度体检"
    }
  ],
  "reminders": [
    "保持充足饮水",
    "定期清理猫砂盆",
    "观察食欲和精神状态"
  ]
}`,
}

// Parsed content
const parsedContent = computed(() => {
  if (!form.value.content || !jsonValid.value) return null
  try {
    return JSON.parse(form.value.content)
  } catch {
    return null
  }
})

// Form validation rules
const rules: FormRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度应在 2-100 个字符之间', trigger: 'blur' },
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' },
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' },
    { min: 10, max: 500, message: '描述长度应在 10-500 个字符之间', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        try {
          JSON.parse(value)
          if (jsonError.value) {
            callback(new Error(jsonError.value))
          } else {
            callback()
          }
        } catch (error) {
          callback(new Error('内容必须是有效的 JSON 格式'))
        }
      },
      trigger: 'blur',
    },
  ],
}

// Load stages
async function loadStages() {
  try {
    const response = await getTemplateStages()
    if (response.success) {
      stages.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to load stages:', error)
  }
}

// Load template data for edit mode
async function loadTemplateData() {
  if (!isEdit.value) return

  try {
    const response = await getTemplateById(route.params.id as string)
    if (response.success) {
      templateData.value = response.data
      form.value = {
        name: response.data.name,
        category: response.data.category,
        description: response.data.description,
        stageId: response.data.stageId || '',
        content: typeof response.data.content === 'string'
          ? response.data.content
          : JSON.stringify(response.data.content, null, 2),
      }
      handleJsonInput()
    } else {
      ElMessage.error(response.message || '加载模板失败')
      router.push('/admin/templates')
    }
  } catch (error: any) {
    console.error('Failed to load template:', error)
    ElMessage.error('加载模板失败')
    router.push('/admin/templates')
  }
}

// Handle JSON input
function handleJsonInput() {
  if (!form.value.content) {
    jsonError.value = ''
    jsonValid.value = false
    return
  }

  try {
    JSON.parse(form.value.content)
    jsonError.value = ''
    jsonValid.value = true
  } catch (error: any) {
    jsonError.value = 'JSON 格式错误: ' + error.message
    jsonValid.value = false
  }
}

// Format JSON
function handleFormatJson() {
  if (!form.value.content) return

  try {
    const parsed = JSON.parse(form.value.content)
    form.value.content = JSON.stringify(parsed, null, 2)
    handleJsonInput()
    ElMessage.success('JSON 格式化成功')
  } catch (error) {
    ElMessage.error('JSON 格式错误，无法格式化')
  }
}

// Validate JSON
function handleValidateJson() {
  handleJsonInput()
  if (jsonValid.value) {
    ElMessage.success('JSON 格式正确')
  } else {
    ElMessage.error(jsonError.value || 'JSON 格式错误')
  }
}

// Use template example
function useTemplateExample() {
  form.value.content = templateExamples[activeTemplateTab.value as keyof typeof templateExamples]
  handleJsonInput()
  showTemplateHelp.value = false
  ElMessage.success('模板示例已应用')
}

// Format value for display
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

// Save template
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写是否正确')
    return
  }

  if (!jsonValid.value) {
    ElMessage.warning('请确保 JSON 格式正确')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const response = await updateTemplate(route.params.id as string, form.value)
      if (response.success) {
        ElMessage.success('模板更新成功')
        await loadTemplateData()
      } else {
        ElMessage.error(response.message || '更新失败')
      }
    } else {
      const response = await createTemplate(form.value)
      if (response.success) {
        ElMessage.success('模板创建成功')
        router.push(`/admin/templates/${response.data.id}/edit`)
      } else {
        ElMessage.error(response.message || '创建失败')
      }
    }
  } catch (error: any) {
    console.error('Failed to save template:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Delete template
async function handleDelete() {
  if (!isEdit.value || !templateData.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除模板「${templateData.value.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    const response = await deleteTemplateApi(templateData.value.id)
    if (response.success) {
      ElMessage.success('删除成功')
      router.push('/admin/templates')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  }
}

// View template
function handleViewTemplate() {
  if (!isEdit.value) return
  // TODO: Navigate to public template view or admin preview
  ElMessage.info('模板预览功能开发中')
}

// Back to list
function handleBack() {
  router.push('/admin/templates')
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
  loadStages()
  loadTemplateData()
})
</script>

<style scoped>
.template-form-page {
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

.json-card {
  margin-top: 24px;
}

.json-editor {
  position: relative;
}

.json-textarea :deep(textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.json-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: #ef4444;
  font-size: 14px;
}

.json-success {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  color: #10b981;
  font-size: 14px;
}

.json-preview {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
}

.preview-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.tips-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.json-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-example {
  background: #1a1f2c;
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 1200px) {
  .template-form-page :deep(.el-col-16) {
    width: 100%;
  }

  .template-form-page :deep(.el-col-8) {
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
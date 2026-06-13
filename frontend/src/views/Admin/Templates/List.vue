<template>
  <div class="templates-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1>模板管理</h1>
        <p class="subtitle">管理系统中的计划模板</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleCreate">
        新建模板
      </el-button>
    </div>

    <!-- Search and Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索模板名称或描述"
            clearable
            @change="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="category in categories"
              :key="category.name"
              :label="`${category.name} (${category.count})`"
              :value="category.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Templates Table -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="templates"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="模板名称" min-width="200">
          <template #default="{ row }">
            <div class="template-name">
              <el-text line-clamp="2" weight="bold">{{ row.name }}</el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <el-text line-clamp="2" type="info" size="small">
              {{ row.description }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="stageId" label="适用阶段" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.stageId" size="small" type="info">
              {{ getStageName(row.stageId) }}
            </el-tag>
            <el-text v-else type="info" size="small">通用</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容项数" width="100" align="center">
          <template #default="{ row }">
            <el-text>{{ getContentCount(row.content) }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" :icon="Edit" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button size="small" :icon="View" @click="handleView(row)">
                查看
              </el-button>
              <el-button
                size="small"
                :icon="Delete"
                type="danger"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Search,
  Edit,
  View,
  Delete
} from '@element-plus/icons-vue'
import {
  getTemplates,
  getTemplateCategories,
  deleteTemplate as deleteTemplateApi,
  type Template,
  type TemplateListParams,
  type TemplateCategory
} from '@/api/admin'

const router = useRouter()

// State
const loading = ref(false)
const templates = ref<Template[]>([])
const categories = ref<TemplateCategory[]>([])
const stages = ref<any[]>([])

// Filters
const filters = ref<TemplateListParams>({
  keyword: '',
  category: undefined,
})

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Load templates
async function loadTemplates() {
  loading.value = true
  try {
    const response = await getTemplates({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      keyword: filters.value.keyword,
      category: filters.value.category,
    })

    if (response.success) {
      templates.value = response.data.items
      pagination.value.total = response.data.pagination.total
    } else {
      ElMessage.error(response.message || '加载模板列表失败')
    }
  } catch (error: any) {
    console.error('Failed to load templates:', error)
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

// Load categories
async function loadCategories() {
  try {
    const response = await getTemplateCategories()
    if (response.success) {
      categories.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to load categories:', error)
  }
}

// Get stage name
function getStageName(stageId: string | null): string {
  if (!stageId) return '通用'
  const stage = stages.value.find(s => s.id === stageId)
  return stage?.name || '未知'
}

// Get content count
function getContentCount(content: any): number {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      return 0
    }
  }
  if (content && typeof content === 'object') {
    return Object.keys(content).length
  }
  return 0
}

// Search
function handleSearch() {
  pagination.value.page = 1
  loadTemplates()
}

// Reset filters
function handleReset() {
  filters.value = {
    keyword: '',
    category: undefined,
  }
  pagination.value.page = 1
  loadTemplates()
}

// Pagination
function handlePageChange(page: number) {
  pagination.value.page = page
  loadTemplates()
}

function handleSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadTemplates()
}

// Create template
function handleCreate() {
  router.push('/admin/templates/create')
}

// Edit template
function handleEdit(template: Template) {
  router.push(`/admin/templates/${template.id}/edit`)
}

// View template
function handleView(template: Template) {
  router.push(`/admin/templates/${template.id}`)
}

// Delete template
async function handleDelete(template: Template) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板「${template.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    loading.value = true
    const response = await deleteTemplateApi(template.id)

    if (response.success) {
      ElMessage.success('删除成功')
      await loadTemplates()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

// Format date
function formatDate(dateStr: string) {
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
  loadTemplates()
  loadCategories()
})
</script>

<style scoped>
.templates-list-page {
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

.page-header h1 {
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

.filter-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.06);
}

.filter-card :deep(.el-card__body) {
  padding: 20px;
}

.filter-form {
  margin: 0;
}

.table-card {
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-card:hover {
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.table-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
  padding: 18px 24px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1f2c;
  letter-spacing: -0.2px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.template-name {
  max-width: 200px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 24px;
  border-top: 1px solid rgba(59, 130, 246, 0.06);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
  }
}
</style>

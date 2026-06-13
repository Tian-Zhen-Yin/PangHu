<template>
  <div class="guides-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1>指南管理</h1>
        <p class="subtitle">管理系统中的知识指南内容</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleCreate">
        新建指南
      </el-button>
    </div>

    <!-- Search and Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索标题或内容"
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
            v-model="filters.categoryId"
            placeholder="选择分类"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="`${category.name} (${category._count?.guides || 0})`"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Guides Table -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="guides"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="guide-title">
              <el-text line-clamp="2">{{ row.title }}</el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category.name" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryTagType(row.category)">
              {{ row.category.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="slug" label="Slug" width="150">
          <template #default="{ row }">
            <el-text type="info" size="small">{{ row.slug }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览量" width="100" align="center">
          <template #default="{ row }">
            <el-text>{{ row.viewCount }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="_count.chunks" label="知识块" width="100" align="center">
          <template #default="{ row }">
            <el-text>{{ row._count?.chunks || 0 }}</el-text>
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

    <!-- Batch Actions (optional feature for future) -->
    <el-card v-if="selectedGuides.length > 0" class="batch-actions-card" shadow="never">
      <div class="batch-actions">
        <el-text>已选择 {{ selectedGuides.length }} 项</el-text>
        <el-button-group>
          <el-button :icon="Upload" @click="handleBatchIngest">
            批量同步到知识库
          </el-button>
          <el-button :icon="Delete" type="danger" @click="handleBatchDelete">
            批量删除
          </el-button>
        </el-button-group>
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
  Delete,
  Upload
} from '@element-plus/icons-vue'
import {
  getGuides,
  getGuideCategories,
  deleteGuide as deleteGuideApi,
  ingestGuide,
  type Guide,
  type GuideListParams,
  type GuideCategory
} from '@/api/admin'

const router = useRouter()

// 分类标签颜色映射：基于分类 ID 稳定哈希到 5 种 el-tag 内置 type，
// 保证同一分类永远是同一颜色，不同分类尽量不同色
const TAG_TYPES = ['primary', 'success', 'warning', 'danger', 'info'] as const

function getCategoryTagType(category: { id?: string; name?: string } | null | undefined) {
  if (!category) return 'info'
  const key = category.id || category.name || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return TAG_TYPES[Math.abs(hash) % TAG_TYPES.length]
}

// State
const loading = ref(false)
const guides = ref<Guide[]>([])
const categories = ref<GuideCategory[]>([])
const selectedGuides = ref<string[]>([])

// Filters
const filters = ref<GuideListParams>({
  keyword: '',
  categoryId: undefined,
})

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Load guides
async function loadGuides() {
  loading.value = true
  try {
    const response = await getGuides({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      keyword: filters.value.keyword,
      categoryId: filters.value.categoryId,
    })

    if (response.success) {
      guides.value = response.data.items
      pagination.value.total = response.data.pagination.total
    } else {
      ElMessage.error(response.message || '加载指南列表失败')
    }
  } catch (error: any) {
    console.error('Failed to load guides:', error)
    ElMessage.error('加载指南列表失败')
  } finally {
    loading.value = false
  }
}

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

// Search
function handleSearch() {
  pagination.value.page = 1
  loadGuides()
}

// Reset filters
function handleReset() {
  filters.value = {
    keyword: '',
    categoryId: undefined,
  }
  pagination.value.page = 1
  loadGuides()
}

// Pagination
function handlePageChange(page: number) {
  pagination.value.page = page
  loadGuides()
}

function handleSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadGuides()
}

// Create guide
function handleCreate() {
  router.push('/admin/guides/create')
}

// Edit guide
function handleEdit(guide: Guide) {
  router.push(`/admin/guides/${guide.id}/edit`)
}

// View guide
function handleView(guide: Guide) {
  router.push(`/admin/guides/${guide.id}`)
}

// Delete guide
async function handleDelete(guide: Guide) {
  try {
    await ElMessageBox.confirm(
      `确定要删除指南「${guide.title}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    loading.value = true
    const response = await deleteGuideApi(guide.id)

    if (response.success) {
      ElMessage.success('删除成功')
      await loadGuides()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete guide:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

// Batch ingest to knowledge base
async function handleBatchIngest() {
  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedGuides.value.length} 个指南同步到知识库吗？`,
      '批量同步确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    // TODO: Implement batch ingest
    ElMessage.info('批量同步功能开发中')
  } catch {
    // User cancelled
  }
}

// Batch delete
async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedGuides.value.length} 个指南吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    // TODO: Implement batch delete
    ElMessage.info('批量删除功能开发中')
  } catch {
    // User cancelled
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
  loadGuides()
  loadCategories()
})
</script>

<style scoped>
.guides-list-page {
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

.guide-title {
  max-width: 200px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 24px;
  border-top: 1px solid rgba(59, 130, 246, 0.06);
}

.batch-actions-card {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.batch-actions-card :deep(.el-card__body) {
  padding: 16px 24px;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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

  .batch-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

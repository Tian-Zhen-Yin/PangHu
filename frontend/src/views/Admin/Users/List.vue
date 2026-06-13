<template>
  <div class="users-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1>用户管理</h1>
        <p class="subtitle">管理系统中的用户账户和会员信息</p>
      </div>
      <el-button-group>
        <el-button :icon="Download" @click="handleExport">
          导出用户
        </el-button>
        <el-button type="primary" :icon="Refresh" @click="loadUsers">
          刷新
        </el-button>
      </el-button-group>
    </div>

    <!-- Stats Cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ userStats.totalUsers || 0 }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ userStats.premiumUsers || 0 }}</div>
            <div class="stat-label">会员用户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ userStats.activeUsers || 0 }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-value">{{ userStats.newUsersThisMonth || 0 }}</div>
            <div class="stat-label">本月新增</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Search and Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索用户名或邮箱"
            clearable
            @change="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="会员类型">
          <el-select
            v-model="filters.memberType"
            placeholder="选择会员类型"
            clearable
            @change="handleSearch"
          >
            <el-option label="免费用户" value="free" />
            <el-option label="会员用户" value="premium" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="选择状态"
            clearable
            @change="handleSearch"
          >
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Users Table -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="users"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="username" label="用户名" width="150">
          <template #default="{ row }">
            <el-text weight="bold">{{ row.username }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200">
          <template #default="{ row }">
            <el-text type="info" size="small">{{ row.email }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="memberType" label="会员类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.memberType === 'premium'" type="warning" size="small">
              会员
            </el-tag>
            <el-tag v-else type="info" size="small">免费</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="猫咪数" width="80" align="center">
          <template #default="{ row }">
            <el-text>{{ row._count?.cats || 0 }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="计划数" width="80" align="center">
          <template #default="{ row }">
            <el-text>{{ row._count?.plans || 0 }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="memberExpiredAt" label="会员到期" width="120">
          <template #default="{ row }">
            <el-text v-if="row.memberExpiredAt" type="warning" size="small">
              {{ formatDate(row.memberExpiredAt) }}
            </el-text>
            <el-text v-else type="info" size="small">-</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" :icon="View" @click="handleView(row)">
                查看
              </el-button>
              <el-button size="small" :icon="Edit" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="resetPassword" :icon="RefreshLeft">
                    重置密码
                  </el-dropdown-item>
                  <el-dropdown-item command="toggleStatus" :icon="Switch">
                    {{ row.memberType === 'premium' ? '设为免费' : '设为会员' }}
                  </el-dropdown-item>
                  <el-dropdown-item divided command="delete" :icon="Delete" style="color: #f56c6c">
                    删除用户
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
  Download,
  Refresh,
  Search,
  View,
  Edit,
  ArrowDown,
  RefreshLeft,
  Switch,
  Delete
} from '@element-plus/icons-vue'
import {
  getUsers,
  getUserStats,
  deleteUser as deleteUserApi,
  resetUserPassword,
  toggleUserStatus,
  type User,
  type UserListParams
} from '@/api/admin'

const router = useRouter()

// State
const loading = ref(false)
const users = ref<User[]>([])
const userStats = ref<any>({})

// Filters
const filters = ref<UserListParams>({
  keyword: '',
  memberType: undefined,
  status: undefined,
})

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Load users
async function loadUsers() {
  loading.value = true
  try {
    const response = await getUsers({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      keyword: filters.value.keyword,
      memberType: filters.value.memberType,
      status: filters.value.status,
    })

    if (response.success) {
      users.value = response.data.items
      pagination.value.total = response.data.pagination.total
    } else {
      ElMessage.error(response.message || '加载用户列表失败')
    }
  } catch (error: any) {
    console.error('Failed to load users:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// Load user stats
async function loadUserStats() {
  try {
    const response = await getUserStats()
    if (response.success) {
      userStats.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to load user stats:', error)
  }
}

// Search
function handleSearch() {
  pagination.value.page = 1
  loadUsers()
}

// Reset filters
function handleReset() {
  filters.value = {
    keyword: '',
    memberType: undefined,
    status: undefined,
  }
  pagination.value.page = 1
  loadUsers()
}

// Pagination
function handlePageChange(page: number) {
  pagination.value.page = page
  loadUsers()
}

function handleSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadUsers()
}

// View user
function handleView(user: User) {
  router.push(`/admin/users/${user.id}`)
}

// Edit user
function handleEdit(user: User) {
  // TODO: Navigate to edit page
  ElMessage.info('用户编辑功能开发中')
}

// Handle dropdown commands
async function handleCommand(command: string, user: User) {
  switch (command) {
    case 'resetPassword':
      await handleResetPassword(user)
      break
    case 'toggleStatus':
      await handleToggleStatus(user)
      break
    case 'delete':
      await handleDelete(user)
      break
  }
}

// Reset password
async function handleResetPassword(user: User) {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户「${user.username}」的密码吗？`,
      '重置密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    loading.value = true
    const response = await resetUserPassword(user.id)

    if (response.success) {
      ElMessage.success(`密码已重置为：${response.data.tempPassword}`)
      await loadUsers()
    } else {
      ElMessage.error(response.message || '重置密码失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to reset password:', error)
      ElMessage.error('重置密码失败')
    }
  } finally {
    loading.value = false
  }
}

// Toggle user status
async function handleToggleStatus(user: User) {
  try {
    const newMemberType = user.memberType === 'premium' ? 'free' : 'premium'
    await ElMessageBox.confirm(
      `确定要将用户「${user.username}」设置为${newMemberType === 'premium' ? '会员' : '免费'}用户吗？`,
      '状态变更确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    loading.value = true
    const response = await toggleUserStatus(user.id, { memberType: newMemberType })

    if (response.success) {
      ElMessage.success('用户状态更新成功')
      await loadUsers()
      await loadUserStats()
    } else {
      ElMessage.error(response.message || '更新状态失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to toggle status:', error)
      ElMessage.error('更新状态失败')
    }
  } finally {
    loading.value = false
  }
}

// Delete user
async function handleDelete(user: User) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${user.username}」吗？此操作将删除该用户的所有数据（猫咪、记录、计划等），且不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    loading.value = true
    const response = await deleteUserApi(user.id)

    if (response.success) {
      ElMessage.success('删除成功')
      await loadUsers()
      await loadUserStats()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete user:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

// Export users
async function handleExport() {
  try {
    // TODO: Implement export functionality
    ElMessage.info('导出功能开发中，可先使用 JSON 格式导出')
  } catch (error: any) {
    console.error('Failed to export users:', error)
    ElMessage.error('导出失败')
  }
}

// Format date
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// Lifecycle
onMounted(() => {
  loadUsers()
  loadUserStats()
})
</script>

<style scoped>
.users-list-page {
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

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
}

.stat-card :deep(.el-card__body) {
  padding: 24px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1f2c;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.table-card :deep(.el-card__body) {
  padding: 0;
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

  .stats-row :deep(.el-col-6) {
    width: 50%;
    margin-bottom: 12px;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
  }
}
</style>
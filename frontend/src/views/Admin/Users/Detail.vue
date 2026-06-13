<template>
  <div class="user-detail-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="handleBack" />
        <div>
          <h1>用户详情</h1>
          <p class="subtitle">查看和管理用户信息</p>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="handleBack">返回</el-button>
        <el-button type="primary" :icon="Edit" @click="handleEdit">
          编辑用户
        </el-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-wrapper">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- User Info -->
    <el-row v-else :gutter="24">
      <!-- Left Column -->
      <el-col :span="16">
        <!-- Basic Info Card -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
              <el-tag v-if="user?.memberType === 'premium'" type="warning">会员用户</el-tag>
              <el-tag v-else type="info">免费用户</el-tag>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">
              {{ user?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ user?.email }}
            </el-descriptions-item>
            <el-descriptions-item label="会员类型">
              <el-tag v-if="user?.memberType === 'premium'" type="warning">会员</el-tag>
              <el-tag v-else type="info">免费</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="会员到期时间">
              {{ user?.memberExpiredAt ? formatDate(user.memberExpiredAt) : '永久' }}
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ formatDate(user?.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">
              {{ formatDate(user?.updatedAt) }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- Stats -->
          <div class="stats-section">
            <div class="stat-item">
              <div class="stat-value">{{ user?._count?.cats || 0 }}</div>
              <div class="stat-label">猫咪数量</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ user?._count?.plans || 0 }}</div>
              <div class="stat-label">计划数量</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ user?._count?.conversations || 0 }}</div>
              <div class="stat-label">对话数量</div>
            </div>
          </div>
        </el-card>

        <!-- Cats List -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <span>猫咪列表 ({{ user?.cats?.length || 0 }})</span>
          </template>

          <el-empty v-if="!user?.cats?.length" description="该用户还没有猫咪" />

          <el-table v-else :data="user.cats" stripe style="width: 100%">
            <el-table-column prop="name" label="猫咪名称" width="150">
              <template #default="{ row }">
                <el-text weight="bold">{{ row.name }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="breed" label="品种" width="120">
              <template #default="{ row }">
                <el-text type="info" size="small">{{ row.breed || '-' }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="gender" label="性别" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.gender === 'male' ? 'primary' : row.gender === 'female' ? 'danger' : 'info'">
                  {{ row.gender === 'male' ? '弟弟' : row.gender === 'female' ? '妹妹' : '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="体重 (kg)" width="100" align="center">
              <template #default="{ row }">
                <el-text>{{ row.weight || '-' }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="birthDate" label="出生日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.birthDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Plans List -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <span>计划列表 ({{ user?.plans?.length || 0 }})</span>
          </template>

          <el-empty v-if="!user?.plans?.length" description="该用户还没有计划" />

          <el-table v-else :data="user.plans" stripe style="width: 100%">
            <el-table-column prop="name" label="计划名称" min-width="200">
              <template #default="{ row }">
                <el-text weight="bold">{{ row.name }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="isActive" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                  {{ row.isActive ? '进行中' : '已完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" :icon="View">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- Right Column -->
      <el-col :span="8">
        <!-- Quick Actions -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <span>快捷操作</span>
          </template>

          <el-space direction="vertical" style="width: 100%">
            <el-button
              style="width: 100%"
              :icon="RefreshLeft"
              @click="handleResetPassword"
            >
              重置密码
            </el-button>
            <el-button
              style="width: 100%"
              :icon="Switch"
              type="warning"
              @click="handleToggleStatus"
            >
              {{ user?.memberType === 'premium' ? '设为免费用户' : '设为会员用户' }}
            </el-button>
            <el-button
              style="width: 100%"
              :icon="Delete"
              type="danger"
              @click="handleDelete"
            >
              删除用户
            </el-button>
          </el-space>
        </el-card>

        <!-- Activity Timeline -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <span>最近活动</span>
          </template>

          <el-timeline>
            <el-timeline-item timestamp="2024-01-15" placement="top">
              <el-card>
                <el-text size="small">用户注册了账户</el-text>
              </el-card>
            </el-timeline-item>
            <el-timeline-item timestamp="2024-01-16" placement="top">
              <el-card>
                <el-text size="small">添加了第一只猫咪</el-text>
              </el-card>
            </el-timeline-item>
            <el-timeline-item timestamp="2024-01-20" placement="top">
              <el-card>
                <el-text size="small">创建了健康计划</el-text>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  RefreshLeft,
  Switch,
  Delete,
  View
} from '@element-plus/icons-vue'
import {
  getUserById,
  updateUser,
  deleteUser as deleteUserApi,
  resetUserPassword,
  toggleUserStatus,
  type User
} from '@/api/admin'

const router = useRouter()
const route = useRoute()

// State
const loading = ref(false)
const user = ref<User | null>(null)

// Load user data
async function loadUser() {
  loading.value = true
  try {
    const response = await getUserById(route.params.id as string)
    if (response.success) {
      user.value = response.data
    } else {
      ElMessage.error(response.message || '加载用户详情失败')
      router.push('/admin/users')
    }
  } catch (error: any) {
    console.error('Failed to load user:', error)
    ElMessage.error('加载用户详情失败')
    router.push('/admin/users')
  } finally {
    loading.value = false
  }
}

// Edit user
function handleEdit() {
  ElMessage.info('用户编辑功能开发中')
}

// Reset password
async function handleResetPassword() {
  if (!user.value) return

  try {
    await ElMessageBox.confirm(
      `确定要重置用户「${user.value.username}」的密码吗？`,
      '重置密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const response = await resetUserPassword(user.value.id)
    if (response.success) {
      ElMessage.success(`密码已重置为：${response.data.tempPassword}`)
    } else {
      ElMessage.error(response.message || '重置密码失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to reset password:', error)
      ElMessage.error('重置密码失败')
    }
  }
}

// Toggle user status
async function handleToggleStatus() {
  if (!user.value) return

  try {
    const newMemberType = user.value.memberType === 'premium' ? 'free' : 'premium'
    await ElMessageBox.confirm(
      `确定要将用户「${user.value.username}」设置为${newMemberType === 'premium' ? '会员' : '免费'}用户吗？`,
      '状态变更确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    const response = await toggleUserStatus(user.value.id, { memberType: newMemberType })
    if (response.success) {
      ElMessage.success('用户状态更新成功')
      await loadUser()
    } else {
      ElMessage.error(response.message || '更新状态失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to toggle status:', error)
      ElMessage.error('更新状态失败')
    }
  }
}

// Delete user
async function handleDelete() {
  if (!user.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${user.value.username}」吗？此操作将删除该用户的所有数据（猫咪、记录、计划等），且不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )

    const response = await deleteUserApi(user.value.id)
    if (response.success) {
      ElMessage.success('删除成功')
      router.push('/admin/users')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete user:', error)
      ElMessage.error('删除失败')
    }
  }
}

// Back to list
function handleBack() {
  router.push('/admin/users')
}

// Format date
function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// Lifecycle
onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.user-detail-page {
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

.loading-wrapper {
  padding: 40px;
}

.info-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-card:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.info-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
  padding: 16px 20px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1f2c;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card :deep(.el-card__body) {
  padding: 24px;
}

.stats-section {
  display: flex;
  gap: 32px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
}

.stat-item {
  text-align: center;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }

  .page-header :deep(.el-col-16) {
    width: 100%;
  }

  .page-header :deep(.el-col-8) {
    width: 100%;
  }
}
</style>
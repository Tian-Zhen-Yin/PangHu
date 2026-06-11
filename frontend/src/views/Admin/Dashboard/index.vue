<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h1>数据概览</h1>
      <!-- Date range filter - Feature not yet implemented, will be enabled in future versions -->
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="default"
      />
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon-wrapper primary">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon-wrapper success">
          <el-icon :size="24"><ChatDotRound /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalCats }}</div>
          <div class="stat-label">猫咪总数</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon-wrapper warning">
          <el-icon :size="24"><ChatLineRound /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayChats }}</div>
          <div class="stat-label">今日对话</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon-wrapper info">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalGuides }}</div>
          <div class="stat-label">知识指南</div>
        </div>
      </el-card>
    </div>

    <!-- Charts -->
    <el-row :gutter="24" class="charts-row">
      <el-col :span="16">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <span>用户增长趋势</span>
          </template>
          <div ref="userChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <span>猫咪品种分布</span>
          </template>
          <div ref="catChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Recent Logs -->
    <el-card class="logs-card" shadow="hover">
      <template #header>
        <span>最近操作</span>
      </template>
      <el-table :data="logs" stripe>
        <el-table-column prop="admin.username" label="管理员" width="120" />
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  User,
  ChatDotRound,
  ChatLineRound,
  Document
} from '@element-plus/icons-vue'
import { getDashboardStats, getRecentLogs } from '@/api/admin'
import type { DashboardStats, AdminLog } from '@/types/admin'

const dateRange = ref<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
])

const stats = ref<DashboardStats>({
  totalUsers: 0,
  totalCats: 0,
  totalGuides: 0,
  todayChats: 0,
  userGrowth: [],
  catBreeds: []
})

const logs = ref<AdminLog[]>([])

const userChartRef = ref<HTMLElement>()
const catChartRef = ref<HTMLElement>()

let userChart: echarts.ECharts | null = null
let catChart: echarts.ECharts | null = null

async function loadDashboard() {
  try {
    const [statsData, logsData] = await Promise.all([
      getDashboardStats(),
      getRecentLogs(5)
    ])

    // API returns { success, data, message, error } structure
    stats.value = statsData.data
    logs.value = logsData.data

    // Render charts
    renderCharts()
  } catch (error) {
    console.error('Failed to load dashboard:', error)
    // Show user-friendly error message
    ElMessage.error('加载仪表盘失败，请刷新重试')
  }
}

function renderCharts() {
  if (!userChartRef.value || !catChartRef.value) return

  // User growth chart - initialize only if not exists
  if (!userChart) {
    userChart = echarts.init(userChartRef.value)
  }
  userChart.setOption({
    title: {
      text: '用户增长趋势',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' }
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f2f2', type: 'dashed' } },
      axisLine: { show: false },
      axisLabel: { color: '#909399' }
    },
    series: [{
      type: 'line',
      smooth: true,
      data: stats.value.userGrowth,
      lineStyle: { width: 2, color: '#ffb86c' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 184, 108, 0.3)' },
            { offset: 1, color: 'rgba(255, 184, 108, 0.05)' }
          ]
        }
      },
      itemStyle: { color: '#ffb86c' }
    }],
    grid: { left: 50, right: 20, top: 40, bottom: 30 }
  })

  // Cat breed chart - initialize only if not exists
  if (!catChart) {
    catChart = echarts.init(catChartRef.value)
  }
  catChart.setOption({
    title: {
      text: '猫咪品种分布',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {d}%',
        color: 'inherit'
      },
      data: stats.value.catBreeds.map((item, index) => ({
        value: item.value,
        name: item.name,
        itemStyle: {
          color: ['#ffb86c', '#67c23a', '#e6a23c', '#f56c6c', '#909399'][index % 5]
        }
      }))
    }]
  })
}

function getActionType(action: string) {
  const types: Record<string, any> = {
    login: 'success',
    logout: 'info',
    create: 'primary',
    update: 'warning',
    delete: 'danger'
  }
  return types[action] || 'info'
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    login: '登录',
    logout: '退出',
    create: '创建',
    update: '更新',
    delete: '删除'
  }
  return labels[action] || action
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

function handleResize() {
  userChart?.resize()
  catChart?.resize()
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  userChart?.dispose()
  catChart?.dispose()
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon-wrapper.primary {
  background: linear-gradient(135deg, #ffb86c 0%, #ff9a4d 100%);
}

.stat-icon-wrapper.success {
  background: linear-gradient(135deg, #67c23a 0%, #4daf33 100%);
}

.stat-icon-wrapper.warning {
  background: linear-gradient(135deg, #e6a23c 0%, #cf8e2f 100%);
}

.stat-icon-wrapper.info {
  background: linear-gradient(135deg, #909399 0%, #7e858f 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.charts-row {
  margin-bottom: 24px;
}

.chart-card {
  min-height: 400px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.logs-card {
  margin-bottom: 24px;
}

@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>

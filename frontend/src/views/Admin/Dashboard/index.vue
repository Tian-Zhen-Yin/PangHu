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
      textStyle: { fontSize: 14, color: '#1a1f2c', fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#3b82f6', width: 2 } },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: { color: '#1a1f2c' },
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);'
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 12 }
    },
    series: [{
      type: 'line',
      smooth: true,
      data: stats.value.userGrowth,
      lineStyle: { width: 3, color: '#3b82f6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
          ]
        }
      },
      itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
      symbolSize: 8
    }],
    grid: { left: 50, right: 20, top: 50, bottom: 30, containLabel: true }
  })

  // Cat breed chart - initialize only if not exists
  if (!catChart) {
    catChart = echarts.init(catChartRef.value)
  }
  catChart.setOption({
    title: {
      text: '猫咪品种分布',
      left: 'center',
      textStyle: { fontSize: 14, color: '#1a1f2c', fontWeight: 600 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: { color: '#1a1f2c' },
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);'
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 3,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.1)'
      },
      label: {
        show: true,
        formatter: '{b}: {d}%',
        color: '#1a1f2c',
        fontSize: 12,
        fontWeight: 500
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      },
      data: stats.value.catBreeds.map((item, index) => ({
        value: item.value,
        name: item.name,
        itemStyle: {
          color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]
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
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
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
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(59, 130, 246, 0.06);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.15);
}

.stat-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover .stat-icon-wrapper {
  transform: scale(1.05) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.stat-icon-wrapper.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.stat-icon-wrapper.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.stat-icon-wrapper.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.stat-icon-wrapper.info {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1f2c;
  line-height: 1;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.charts-row {
  margin-bottom: 32px;
}

.chart-card {
  min-height: 420px;
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chart-card:hover {
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.chart-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
  padding: 18px 24px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1f2c;
  letter-spacing: -0.2px;
}

.chart-card :deep(.el-card__body) {
  padding: 24px;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.logs-card {
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.logs-card:hover {
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.logs-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.06);
  padding: 18px 24px;
  font-weight: 600;
  font-size: 15px;
  color: #1a1f2c;
  letter-spacing: -0.2px;
}

.logs-card :deep(.el-card__body) {
  padding: 0;
}

.logs-card :deep(.el-table) {
  font-size: 14px;
}

.logs-card :deep(.el-table th) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #475569;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.logs-card :deep(.el-table tr:hover > td) {
  background: rgba(59, 130, 246, 0.03);
}

.logs-card :deep(.el-tag) {
  font-weight: 500;
  letter-spacing: 0.2px;
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
    gap: 16px;
    padding: 16px 20px;
  }

  .charts-row {
    margin-bottom: 24px;
  }
}
</style>

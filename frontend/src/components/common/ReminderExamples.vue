<script setup lang="ts">
import { ref } from 'vue'
import ScenarioReminder, { type ActionButton, type TrendData } from './ScenarioReminder.vue'
import TrendChart, { type TrendPoint } from './TrendChart.vue'

// ==================== 场景 A：接种提醒 ====================
const vaccineReminder = ref({
  type: 'vaccine' as const,
  title: '疫苗接种提醒',
  message: '奶糖的猫三联第二针时间快到了，准时打针才能变身超强壮猫咪哦！',
  expression: 'waiting' as const,
  priority: 'medium' as const,
  actions: [
    {
      label: '预约医生',
      type: 'primary',
      handler: () => console.log('预约医生'),
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      label: '登记接种',
      type: 'secondary',
      handler: () => console.log('登记接种'),
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ]
})

// ==================== 场景 B：体重异常波动 ====================
const weightReminder = ref({
  type: 'weight' as const,
  title: '体重变化提醒',
  message: '咦？奶糖这周瘦了 0.2kg，是胃口不好吗？要不要问问喵喵医生原因？',
  expression: 'confused' as const,
  priority: 'high' as const,
  trend: {
    direction: 'down',
    value: '-0.2kg',
    status: 'warning'
  } as TrendData,
  actions: [
    {
      label: '咨询喵喵医生',
      type: 'primary',
      handler: () => console.log('咨询医生'),
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    {
      label: '记录今日体重',
      type: 'secondary',
      handler: () => console.log('记录体重'),
      icon: 'M12 4v16m8-8H4'
    }
  ]
})

// 体重趋势数据
const weightTrendData: TrendPoint[] = [
  { date: '3/1', value: 4.2 },
  { date: '3/8', value: 4.1 },
  { date: '3/15', value: 4.0 },
  { date: '3/22', value: 4.0 },
  { date: '3/29', value: 3.8 }
]

// ==================== 场景 C：健康检查提醒 ====================
const healthReminder = ref({
  type: 'health' as const,
  title: '健康检查提醒',
  message: '奶糖上次体检已经是半年前了，建议近期安排一次全面体检哦！',
  expression: 'focused' as const,
  priority: 'medium' as const,
  actions: [
    {
      label: '查看体检项目',
      type: 'outline',
      handler: () => console.log('查看体检项目')
    },
    {
      label: '预约体检',
      type: 'primary',
      handler: () => console.log('预约体检')
    }
  ]
})

// ==================== 场景 D：记录提醒 ====================
const recordReminder = ref({
  type: 'record' as const,
  title: '今日记录提醒',
  message: '还没有记录今天的体重和饮食哦，快来更新奶糖的成长数据吧！',
  expression: 'waiting' as const,
  priority: 'low' as const,
  actions: [
    {
      label: '立即记录',
      type: 'primary',
      handler: () => console.log('立即记录'),
      icon: 'M12 4v16m8-8H4'
    }
  ]
})

// ==================== 场景 E：成就解锁 ====================
const achievementReminder = ref({
  type: 'achievement' as const,
  title: '新成就解锁！',
  message: '恭喜！奶糖已完成"连续7天记录"成就，继续保持这个好习惯吧！',
  expression: 'excited' as const,
  priority: 'medium' as const,
  actions: [
    {
      label: '查看成就',
      type: 'primary',
      handler: () => console.log('查看成就'),
      icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
    }
  ]
})

// 处理关闭
function handleDismiss(type: string) {
  console.log(`关闭提醒: ${type}`)
}
</script>

<template>
  <div class="reminder-examples">
    <h2 class="page-title">场景化提醒卡片示例</h2>

    <div class="examples-grid">
      <!-- 场景 A：接种提醒 -->
      <section class="example-section">
        <h3 class="section-title">场景 A：接种提醒</h3>
        <ScenarioReminder
          v-bind="vaccineReminder"
          @dismiss="handleDismiss('vaccine')"
        />
      </section>

      <!-- 场景 B：体重异常（带趋势图） -->
      <section class="example-section">
        <h3 class="section-title">场景 B：体重异常波动</h3>
        <div class="weight-anomaly-card">
          <ScenarioReminder
            v-bind="weightReminder"
            @dismiss="handleDismiss('weight')"
          />
          <!-- 趋势图 -->
          <div class="trend-chart-wrapper">
            <TrendChart
              :data="weightTrendData"
              unit="kg"
              direction="down"
              status="warning"
              size="medium"
            />
          </div>
        </div>
      </section>

      <!-- 场景 C：健康检查 -->
      <section class="example-section">
        <h3 class="section-title">场景 C：健康检查提醒</h3>
        <ScenarioReminder
          v-bind="healthReminder"
          @dismiss="handleDismiss('health')"
        />
      </section>

      <!-- 场景 D：记录提醒 -->
      <section class="example-section">
        <h3 class="section-title">场景 D：记录提醒</h3>
        <ScenarioReminder
          v-bind="recordReminder"
          @dismiss="handleDismiss('record')"
        />
      </section>

      <!-- 场景 E：成就解锁 -->
      <section class="example-section">
        <h3 class="section-title">场景 E：成就解锁</h3>
        <ScenarioReminder
          v-bind="achievementReminder"
          @dismiss="handleDismiss('achievement')"
        />
      </section>
    </div>

    <!-- 尺寸示例 -->
    <div class="size-examples">
      <h3 class="section-title">趋势图尺寸示例</h3>
      <div class="size-grid">
        <TrendChart
          :data="weightTrendData"
          unit="kg"
          direction="down"
          status="warning"
          size="small"
        />
        <TrendChart
          :data="weightTrendData"
          unit="kg"
          direction="down"
          status="warning"
          size="medium"
        />
        <TrendChart
          :data="weightTrendData"
          unit="kg"
          direction="down"
          status="warning"
          size="large"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminder-examples {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #FAF8F5;
  min-height: 100vh;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 32px 0;
  text-align: center;
}

.examples-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 48px;
}

.example-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

/* 体重异常卡片特殊布局 */
.weight-anomaly-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-chart-wrapper {
  padding: 0 20px;
}

/* 尺寸示例 */
.size-examples {
  padding: 24px;
  background: linear-gradient(145deg, #FFFFFF 0%, #FFFBF7 100%);
  border-radius: 20px;
  border: 1px solid #F5F0E8;
}

.size-grid {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.size-grid > * {
  flex: 1;
}

@media (max-width: 768px) {
  .reminder-examples {
    padding: 16px;
  }

  .size-grid {
    flex-direction: column;
  }
}
</style>

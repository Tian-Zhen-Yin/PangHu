# 场景化提醒卡片组件

## 组件概述

场景化提醒卡片组件结合胖虎吉祥物，为不同类型的通知和提醒提供统一的视觉体验。

## 组件列表

### 1. ScenarioReminder（提醒卡片）

主要的通知卡片组件，支持多种提醒类型和自定义操作。

#### Props

```typescript
interface Props {
  type: ReminderType        // 提醒类型
  title: string            // 标题
  message: string          // 消息内容
  expression?: MascotExpression  // 吉祥物表情（可选，根据类型自动选择）
  actions?: ActionButton[] // 操作按钮
  trend?: TrendData       // 趋势数据（可选）
  priority?: 'low' | 'medium' | 'high'  // 优先级
  dismissible?: boolean   // 是否可关闭
}
```

#### 提醒类型

```typescript
type ReminderType =
  | 'vaccine'      // 疫苗提醒 - waiting 表情
  | 'weight'       // 体重异常 - confused 表情
  | 'health'       // 健康检查 - focused 表情
  | 'record'       // 记录提醒 - waiting 表情
  | 'achievement'  // 成就解锁 - excited 表情
  | 'custom'       // 自定义
```

#### 使用示例

```vue
<script setup>
import ScenarioReminder from '@/components/common/ScenarioReminder.vue'

const handleBook = () => {
  // 预约逻辑
}

const handleDismiss = () => {
  // 关闭提醒
}
</script>

<template>
  <ScenarioReminder
    type="vaccine"
    title="疫苗接种提醒"
    message="奶糖的猫三联第二针时间快到了！"
    priority="high"
    :actions="[
      { label: '预约医生', type: 'primary', handler: handleBook },
      { label: '稍后提醒', type: 'secondary', handler: () => {} }
    ]"
    @dismiss="handleDismiss"
  />
</template>
```

### 2. TrendChart（趋势图表）

用于展示体重、体温等健康数据的趋势变化。

#### Props

```typescript
interface Props {
  data: TrendPoint[]       // 数据点
  unit?: string           // 单位（如 "kg"）
  direction?: 'up' | 'down' | 'stable'  // 趋势方向
  status?: 'normal' | 'warning' | 'danger'  // 状态
  size?: 'small' | 'medium' | 'large'  // 尺寸
}
```

#### 使用示例

```vue
<script setup>
import TrendChart from '@/components/common/TrendChart.vue'

const weightData = [
  { date: '3/1', value: 4.2 },
  { date: '3/8', value: 4.1 },
  { date: '3/15', value: 4.0 },
  { date: '3/22', value: 4.0 },
  { date: '3/29', value: 3.8 }
]
</script>

<template>
  <TrendChart
    :data="weightData"
    unit="kg"
    direction="down"
    status="warning"
  />
</template>
```

## 集成到页面

### Dashboard 集成

在首页 Dashboard 中添加提醒区域：

```vue
<script setup>
import { computed } from 'vue'
import ScenarioReminder from '@/components/common/ScenarioReminder.vue'
import TrendChart from '@/components/common/TrendChart.vue'
import { useCatStore } from '@/stores/cat'

const catStore = useCatStore()

// 根据数据动态生成提醒
const reminders = computed(() => {
  const list = []
  const currentCat = catStore.currentCat

  // 疫苗提醒
  if (currentCat?.pendingVaccines?.length > 0) {
    list.push({
      type: 'vaccine',
      title: '疫苗接种提醒',
      message: `${currentCat.name}的${currentCat.pendingVaccines[0].name}时间快到了！`,
      priority: 'medium',
      actions: [
        { label: '预约医生', type: 'primary', handler: () => {} },
        { label: '查看详情', type: 'secondary', handler: () => {} }
      ]
    })
  }

  // 体重异常提醒
  if (currentCat?.weightChange && Math.abs(currentCat.weightChange) > 0.15) {
    list.push({
      type: 'weight',
      title: '体重变化提醒',
      message: `${currentCat.name}最近${currentCat.weightChange > 0 ? '增重' : '减重'}了${Math.abs(currentCat.weightChange)}kg`,
      priority: 'high',
      trend: {
        direction: currentCat.weightChange > 0 ? 'up' : 'down',
        value: `${currentCat.weightChange > 0 ? '+' : ''}${currentCat.weightChange}kg`,
        status: 'warning'
      }
    })
  }

  return list
})
</script>

<template>
  <div class="dashboard">
    <!-- 提醒区域 -->
    <div class="reminders-section">
      <ScenarioReminder
        v-for="(reminder, index) in reminders"
        :key="index"
        v-bind="reminder"
        @dismiss="() => reminders.splice(index, 1)"
      />
    </div>

    <!-- 体重趋势图 -->
    <div v-if="currentCat?.weightHistory?.length > 1" class="trend-section">
      <TrendChart
        :data="currentCat.weightHistory"
        unit="kg"
        direction="down"
        status="warning"
      />
    </div>
  </div>
</template>
```

## 样式定制

组件使用奶油风设计系统，颜色变量：

```css
--primary: #F4A261      /* 品牌橙色 */
--primary-light: #FED7AA  /* 浅橙色 */
--bg-cream: #FAF8F5      /* 奶油背景 */
--bg-white: #FFFFFF      /* 纯白背景 */
--border-cream: #F5F0E8  /* 奶油边框 */
```

## 设计规范

| 优先级 | 边框色 | 徽章背景 | 徽章文字 |
|--------|--------|----------|----------|
| low    | #E5E7EB | #F3F4F6  | #6B7280  |
| medium | #FED7AA | #FFF7ED  | #F4A261  |
| high   | #FECACA | #FEF2F2  | #EF4444  |

| 状态   | 趋势线颜色 | 图表背景 |
|--------|------------|----------|
| normal | #22C55E    | #FAF8F5  |
| warning| #F59E0B    | #FFFBF7  |
| danger | #EF4444    | #FEF2F2  |

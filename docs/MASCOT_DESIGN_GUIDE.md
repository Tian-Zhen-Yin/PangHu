# 胖虎吉祥物视觉系统开发文档

> 版本: v1.0
> 更新时间: 2026-03-01

## 概述

胖虎是「哈吉咪养成计划」的品牌吉祥物，一只美短银虎斑猫，采用扁平插画风格。通过8种不同表情传递情感，增强用户与产品的情感连接。

---

## 一、表情系统

### 1.1 表情类型

| 表情 | 文件名 | 使用场景 | 情绪含义 |
|------|--------|----------|----------|
| default | default.png | 默认/首页/登录页 | 微笑陪伴，温暖友好 |
| sleepy | sleepy.png | 深夜模式/休息中 | 困困模式，放松舒适 |
| happy | happy.png | 成功/完成/好评 | 被摸舒服，开心满足 |
| confused | confused.png | 空状态/404 | 有点疑惑，引导用户 |
| excited | excited.png | 庆祝/里程碑 | 小开心，激动兴奋 |
| yawning | yawning.png | 加载中/等待 | 打哈欠，稍等片刻 |
| waiting | waiting.png | 待办/提醒 | 等你记录，期待互动 |
| focused | focused.png | AI助手/数据分析 | 认真看数据，专注专业 |

### 1.2 表情选择决策树

```
页面状态判断
├── 未登录 → default（登录页品牌展示）
├── 加载中 → yawning（等待加载）
├── 空状态 → confused（引导用户操作）
├── 有提醒/待办 → waiting（期待互动）
├── 有数据/完成 → happy（满足开心）
├── AI/分析场景 → focused（专业专注）
└── 成功/庆祝 → excited（激动兴奋）
```

---

## 二、组件使用

### 2.1 MascotCharacter 核心组件

**路径**: `frontend/src/components/mascot/MascotCharacter.vue`

#### 基础用法

```vue
<script setup>
import MascotCharacter from '@/components/mascot/MascotCharacter.vue'
</script>

<template>
  <!-- 最小配置 -->
  <MascotCharacter />

  <!-- 自定义表情和尺寸 -->
  <MascotCharacter
    expression="happy"
    size="large"
  />
</template>
```

#### Props 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| expression | `MascotExpression` | `'default'` | 吉祥物表情 |
| size | `'small' \| 'medium' \| 'large' \| 'hero'` | `'medium'` | 显示尺寸 |
| animated | `boolean` | `true` | 是否启用呼吸动画 |
| floatAnimation | `boolean` | `true` | 是否启用浮动动画 |
| clickable | `boolean` | `false` | 是否可点击切换表情 |

#### 尺寸规格

| 尺寸 | 像素 | 使用场景 |
|------|------|----------|
| small | 48px | 头像、Toast通知、内嵌图标 |
| medium | 80px | 卡片内、列表旁 |
| large | 160px | 空状态、加载页 |
| hero | 240px | 首屏主视觉、登录页 |

#### Events 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| click | `expression: MascotExpression` | 点击时触发（需 `clickable=true`） |

#### 高级用法

```vue
<script setup>
import { ref } from 'vue'
import MascotCharacter from '@/components/mascot/MascotCharacter.vue'

const currentExpression = ref('default')

function handleExpressionChange(newExpr) {
  console.log('表情切换为:', newExpr)
}
</script>

<template>
  <!-- 可点击切换表情 -->
  <MascotCharacter
    :expression="currentExpression"
    size="large"
    :clickable="true"
    @click="handleExpressionChange"
  />

  <!-- 禁用浮动动画（适合内嵌场景） -->
  <MascotCharacter
    expression="focused"
    size="small"
    :float-animation="false"
  />
</template>
```

---

### 2.2 EmptyState 空状态组件

**路径**: `frontend/src/components/common/EmptyState.vue`

#### 基础用法

```vue
<script setup>
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <EmptyState
    title="这里空空如也"
    description="还没有内容哦"
    expression="confused"
    :show-action="true"
    action-text="去添加"
    action-path="/add"
  />
</template>
```

#### Props 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | `string` | `'这里空空如也'` | 空状态标题 |
| description | `string` | `'还没有内容哦'` | 空状态描述 |
| expression | `MascotExpression` | `'confused'` | 吉祥物表情 |
| showAction | `boolean` | `false` | 是否显示操作按钮 |
| actionText | `string` | `'去添加'` | 按钮文字 |
| actionPath | `string` | `'/'` | 按钮跳转路径 |

---

## 三、页面集成指南

### 3.1 登录/注册页

**设计意图**: 品牌首印象，传递温暖陪伴感

```vue
<template>
  <div class="auth-page">
    <!-- 左侧：品牌展示区 -->
    <div class="brand-section">
      <MascotCharacter
        expression="default"
        size="hero"
        :animated="true"
        :float-animation="true"
      />
      <div class="brand-content">
        <h1>哈吉咪养成计划</h1>
        <p>记录喵星人的成长足迹</p>
      </div>
    </div>

    <!-- 右侧：表单区 -->
    <form class="auth-form">...</form>
  </div>
</template>
```

### 3.2 Dashboard 首页

**设计意图**: 动态情感反馈，根据页面状态自动切换表情

```vue
<script setup>
import { ref, computed } from 'vue'
import MascotCharacter from '@/components/mascot/MascotCharacter.vue'

const isLoading = ref(true)
const reminders = ref([])
const recentRecords = ref([])

// 动态表情逻辑
const mascotExpression = computed(() => {
  if (isLoading.value) return 'yawning'      // 加载中：打哈欠
  if (reminders.value.length > 0) return 'waiting'  // 有提醒：等你记录
  if (recentRecords.value.length > 0) return 'happy'   // 有记录：开心
  return 'default'                         // 默认：微笑
})
</script>

<template>
  <div class="dashboard">
    <!-- 浮动吉祥物（固定在右下角） -->
    <div class="dashboard-mascot">
      <MascotCharacter
        :expression="mascotExpression"
        size="large"
        :clickable="true"
      />
    </div>

    <!-- 主内容区 -->
    <CatsOverview />
    <QuickActions />
    <RemindersCard />
  </div>
</template>

<style scoped>
.dashboard-mascot {
  position: fixed;
  bottom: var(--space-2xl);
  right: var(--space-2xl);
  z-index: 10;
}
</style>
```

### 3.3 空状态页面

**设计意图**: 引导用户操作，减少失落感

```vue
<template>
  <div v-if="cats.length === 0">
    <EmptyState
      title="还没有添加猫咪档案"
      description="添加你的第一只喵星人，开始记录成长足迹"
      expression="confused"
      :show-action="true"
      action-text="添加第一只猫咪"
      action-path="/my-cats/new"
    />
  </div>
</template>
```

### 3.4 AI 聊天页面

**设计意图**: 传递专业、专注的品牌形象

```vue
<template>
  <header class="chat-header">
    <MascotCharacter
      expression="focused"
      size="small"
      :float-animation="false"
    />
    <h1>喵喵医生</h1>
  </header>
</template>
```

### 3.5 加载状态

**设计意图**: 缓解等待焦虑

```vue
<template>
  <div v-if="loading" class="loading-state">
    <MascotCharacter
      expression="yawning"
      size="large"
      :animated="true"
    />
    <p>正在加载数据...</p>
  </div>
</template>
```

---

## 四、动画效果

### 4.1 内置动画

| 动画名称 | 效果描述 | 适用场景 |
|----------|----------|----------|
| breathe | 轻微缩放（1.0 ↔ 1.02） | 呼吸感，3秒循环 |
| float | Y轴位移（0 ↔ -4px） | 浮动感，2秒循环 |

### 4.2 动画组合

```vue
<!-- 完整动画效果：呼吸 + 浮动 -->
<MascotCharacter
  expression="default"
  :animated="true"
  :float-animation="true"
/>

<!-- 仅呼吸动画（适合固定位置） -->
<MascotCharacter
  expression="focused"
  :animated="true"
  :float-animation="false"
/>

<!-- 无动画（适合头饰/徽章） -->
<MascotCharacter
  expression="happy"
  :animated="false"
  :float-animation="false"
/>
```

### 4.3 点击反馈

启用 `clickable` 后的交互效果：

```vue
<MascotCharacter
  :clickable="true"
  @click="handleClick"
/>
```

- **悬停**: 放大 1.05 倍
- **按下**: 缩小 0.95 倍
- **点击**: 循环切换到下一个表情

---

## 五、设计规范

### 5.1 阴影规范

| 尺寸 | 阴影效果 |
|------|----------|
| small | `drop-shadow(var(--shadow-xs))` |
| medium | `drop-shadow(var(--shadow-sm))` |
| large | `drop-shadow(var(--shadow-md))` |
| hero | `drop-shadow(var(--shadow-lg))` |

### 5.2 品牌色配合

吉祥物采用奶油色背景，与品牌色系完美融合：

```css
--color-primary: #F6B26B;    /* 暖橙色 - 主按钮 */
--color-bg: #FAF8F5;         /* 奶油色 - 页面背景 */
--color-card: #FFFFFF;       /* 纯白色 - 卡片背景 */
```

### 5.3 无障碍支持

```css
/* 尊重用户的动画偏好设置 */
@media (prefers-reduced-motion: reduce) {
  .mascot-wrapper.animated,
  .mascot-wrapper.float-animation {
    animation: none;
  }
}
```

---

## 六、资源文件

### 6.1 图片目录

```
frontend/src/assets/mascot/
├── default.png     (121KB) - 微笑陪伴
├── sleepy.png      (119KB) - 困困模式
├── happy.png       (119KB) - 被摸舒服
├── confused.png    (121KB) - 有点疑惑
├── excited.png     (119KB) - 小开心
├── yawning.png     (119KB) - 打哈欠
├── waiting.png     (123KB) - 等你记录
└── focused.png     (120KB) - 认真看数据
```

### 6.2 原始文件

```
scripts/generated_images/
├── 01_微笑陪伴.png
├── 02_困困模式.png
├── 03_被摸舒服.png
├── 04_有点疑惑.png
├── 05_小开心.png
├── 06_打哈欠.png
├── 07_等你记录.png
└── 08_认真看数据.png
```

---

## 七、常见问题

### Q1: 图片不显示？

**原因**: Vite 需要显式导入图片资源。

**解决**: 确保使用显式 import（已在组件内部处理）

### Q2: 动画卡顿？

**原因**: 设备性能问题或动画过多。

**解决**:
```vue
<!-- 减少动画或降低复杂度 -->
<MascotCharacter
  :animated="false"
  :float-animation="false"
/>
```

### Q3: 如何添加新的表情？

1. 将新图片放入 `frontend/src/assets/mascot/`
2. 在 `MascotCharacter.vue` 中添加导入和类型定义

---

## 八、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-03-01 | 初始版本，完成8个表情系统集成 |

---

## 九、相关文档

- [品牌视觉语言手册结构 v1.0.md](../PangHu/docs/品牌视觉语言手册结构%20v1.0.md)
- [Design System](frontend/src/styles/)
- [组件开发规范](./COMPONENT_GUIDE.md)

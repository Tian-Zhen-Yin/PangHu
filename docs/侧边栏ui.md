好！我给你设计一版 **完整可落地的侧栏 UI 结构**，目标是：

**统一你现在的产品风格：温暖、轻量、宠物产品感，而不是后台系统。**

我会给你 4 部分：

1️⃣ 完整 UI 结构
2️⃣ 设计规范（颜色 / 间距 / 字号）
3️⃣ 组件结构（Vue）
4️⃣ 可直接用的 Vue + TypeScript 示例代码

---

# 一、完整侧栏 UI 结构（推荐版）

整体布局：

```
┌──────────────────────┐
│ 🐱 哈吉咪             │
│  Cat Care Center     │
│                      │
│  主功能              │
│  ─────────────────   │
│  🏠 首页             │
│  📈 成长记录         │
│  🐱 我的猫咪         │
│                      │
│  服务                │
│  ─────────────────   │
│  📚 养猫指南         │
│  🤖 喵星小顾问       │
│                      │
│                      │
│                      │
│  ─────────────────   │
│  ⚙ 设置             │
└──────────────────────┘
```

关键设计点：

* **分组导航**
* **柔和背景**
* **hover效果**
* **选中态指示条**
* **图标统一**

---

# 二、视觉设计规范

## 1️⃣ 侧栏宽度

推荐：

```
220px
```

---

## 2️⃣ 侧栏背景

```
#FFF7ED
```

或

```
#FDF6F0
```

效果：

温暖但不抢主体。

---

## 3️⃣ 菜单样式

默认：

```
字体：#6B7280
图标：#9CA3AF
```

hover：

```
背景：#FFF1E6
```

选中：

```
背景：#FFF1E6
文字：#F97316
图标：#F97316
```

---

## 4️⃣ 选中指示条

左侧 indicator：

```
宽度：3px
颜色：#F97316
```

示例：

```
│ 首页
```

---

## 5️⃣ 间距系统

菜单间距：

```
padding: 10px 14px
```

菜单之间：

```
gap: 6px
```

分组之间：

```
margin-top: 24px
```

---

## 6️⃣ 图标大小

统一：

```
20px
```

推荐 icon 库：

```
lucide-vue
```

---

# 三、Vue组件结构

推荐目录结构：

```
components/
   sidebar/
       Sidebar.vue
       SidebarGroup.vue
       SidebarItem.vue
```

---

# 四、数据驱动导航

用配置控制菜单。

```ts
export interface MenuItem {
  name: string
  icon: string
  route: string
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}
```

---

# 五、菜单配置

```ts
export const sidebarMenu = [
  {
    title: '主功能',
    items: [
      { name: '首页', icon: 'home', route: '/' },
      { name: '成长记录', icon: 'activity', route: '/growth' },
      { name: '我的猫咪', icon: 'cat', route: '/cats' }
    ]
  },
  {
    title: '服务',
    items: [
      { name: '养猫指南', icon: 'book', route: '/guide' },
      { name: '喵星小顾问', icon: 'bot', route: '/ai' }
    ]
  }
]
```

---

# 六、Sidebar.vue（核心）

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { sidebarMenu } from './menu'

const route = useRoute()
const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar">

    <div class="logo">
      <img src="/cat.png" class="logo-img" />
      <div class="logo-text">
        <div class="title">哈吉咪</div>
        <div class="sub">Cat Care</div>
      </div>
    </div>

    <div
      v-for="group in sidebarMenu"
      :key="group.title"
      class="group"
    >
      <div class="group-title">
        {{ group.title }}
      </div>

      <div
        v-for="item in group.items"
        :key="item.route"
        class="menu-item"
        :class="{ active: route.path === item.route }"
        @click="go(item.route)"
      >
        <i class="icon">{{ item.icon }}</i>
        <span>{{ item.name }}</span>
      </div>

    </div>

  </aside>
</template>
```

---

# 七、CSS样式

```css
.sidebar {
  width: 220px;
  background: #fff7ed;
  height: 100vh;
  padding: 20px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.logo-img {
  width: 36px;
  height: 36px;
}

.logo-text .title {
  font-weight: 600;
}

.logo-text .sub {
  font-size: 12px;
  color: #9ca3af;
}

.group {
  margin-bottom: 24px;
}

.group-title {
  font-size: 12px;
  color: #9ca3af;
  margin: 10px 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: #6b7280;
  position: relative;
}

.menu-item:hover {
  background: #fff1e6;
}

.menu-item.active {
  background: #fff1e6;
  color: #f97316;
}

.menu-item.active::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 3px;
  background: #f97316;
}
```

---

# 八、视觉效果会变成这样

```
🐱 哈吉咪

主功能
│ 首页
  成长记录
  我的猫咪

服务
  养猫指南
  喵星小顾问
```

风格：

* 柔和
* 轻量
* 产品感
* 和你的卡片UI一致

---

# 九、再给你一个 **高级优化（推荐）**

增加 **收缩侧栏模式**：

展开：

```
🐱 哈吉咪
🏠 首页
📈 成长记录
```

收缩：

```
🐱
🏠
📈
```

宽度：

```
220px → 72px
```

这会让界面 **产品级感瞬间提升**。

---

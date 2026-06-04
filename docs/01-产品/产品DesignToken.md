太好了 😼✨
既然你要做成 **小众可爱宠物产品**，那我们就做一套：

> 🐾 可爱但不幼稚
> 🐾 温柔但不廉价
> 🐾 统一且可扩展
> 🐾 适合工程落地

下面是一份 **可直接放进 Vue3 + Vite 项目的完整 Design Token 文件结构**。

---

# 📁 建议目录结构

```
src/styles/tokens/
├── color.css
├── radius.css
├── spacing.css
├── shadow.css
├── typography.css
├── motion.css
└── index.css
```

---

# 🎨 1️⃣ color.css

```css
:root {
  /* ========== 品牌主色（猫咪橙） ========== */
  --color-primary: #F6B26B;
  --color-primary-hover: #F3A14E;
  --color-primary-press: #E5903A;
  --color-primary-soft: #FFF4E5;
  --color-primary-bg: #FFE8CC;

  /* ========== 健康绿 ========== */
  --color-success: #9ED5B8;
  --color-success-soft: #EAF7F0;

  /* ========== 可爱粉点缀 ========== */
  --color-accent: #F8C8DC;
  --color-accent-soft: #FFF0F6;

  /* ========== 警告 / 错误 ========== */
  --color-warning: #F9C97C;
  --color-error: #F28B82;

  /* ========== 背景系统（奶油风） ========== */
  --color-bg-page: #FAF8F5;
  --color-bg-card: #FFFFFF;
  --color-bg-soft: #F7F3EE;

  /* ========== 边框 ========== */
  --color-border-light: #F0ECE6;
  --color-border-normal: #E6DFD7;

  /* ========== 字体颜色 ========== */
  --color-text-main: #5C4B3A;
  --color-text-secondary: #9B8C7C;
  --color-text-light: #B9ADA1;
  --color-text-white: #FFFFFF;
}
```

---

# 🐾 2️⃣ radius.css

```css
:root {
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-round: 999px;
}
```

### 使用规范：

| 场景   | 使用 |
| ---- | -- |
| 小按钮  | sm |
| 普通按钮 | md |
| 卡片   | lg |
| 大展示卡 | xl |

---

# 📏 3️⃣ spacing.css

```css
:root {
  --space-xxs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-xxl: 48px;
}
```

规则：

* 卡片 padding ≥ lg
* 页面边距 ≥ xl

---

# 🌤 4️⃣ shadow.css

```css
:root {
  --shadow-soft: 0 8px 24px rgba(246, 178, 107, 0.15);
  --shadow-hover: 0 12px 30px rgba(246, 178, 107, 0.25);
  --shadow-card: 0 6px 18px rgba(0, 0, 0, 0.05);
  --shadow-none: none;
}
```

小众可爱产品 → 阴影必须柔。

---

# ✍️ 5️⃣ typography.css

```css
:root {
  --font-family-base: -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "PingFang SC", "Helvetica Neue",
    Arial, sans-serif;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;
  --font-size-xxl: 28px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 600;

  --line-height-base: 1.6;
}
```

建议：

* 主标题 600
* 正文 400
* 不要 700 太重

---

# 🌬 6️⃣ motion.css

宠物产品一定要有“呼吸感”。

```css
:root {
  --motion-fast: 0.2s ease;
  --motion-normal: 0.3s ease;
  --motion-slow: 0.5s ease;
}
```

建议通用：

```css
.transition-default {
  transition: all var(--motion-normal);
}
```

---

# 🧩 7️⃣ index.css（统一入口）

```css
@import "./color.css";
@import "./radius.css";
@import "./spacing.css";
@import "./shadow.css";
@import "./typography.css";
@import "./motion.css";

body {
  background: var(--color-bg-page);
  font-family: var(--font-family-base);
  color: var(--color-text-main);
  line-height: var(--line-height-base);
}
```

---

# 🐱 推荐基础组件风格（可直接落地）

---

## 🟠 基础按钮

```css
.pet-button {
  height: 44px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: var(--shadow-soft);
  transition: all var(--motion-normal);
}

.pet-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
```

---

## 🐾 基础卡片

```css
.pet-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border-light);
}
```

---

# 🎯 产品气质会变成什么样？

升级后整体气质：

* 奶油色温暖
* 圆润有陪伴感
* 不像管理系统
* 更像“养猫日记 App”

---

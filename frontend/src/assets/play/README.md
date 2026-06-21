# 陪玩游戏插图

把生成好的插图放进**本目录**即可自动生效，无需改任何代码
（前端用 Vite `import.meta.glob` 自动收集，见 `index.ts`）。

## 命名规则

**文件名 = 游戏 id**，支持 `.png` / `.jpg` / `.jpeg` / `.webp` / `.svg`。

| 游戏 | 文件名 | 类别 |
| --- | --- | --- |
| 激光追逐 | `laser-chase.png` | 追逐 |
| 羽毛钓鱼 | `feather-fishing.png` | 狩猎 |
| 食物谜题 | `food-puzzle.png` | 益智 |
| 藏猫猫 | `hide-seek.png` | 互动 |
| 猫隧道探险 | `tunnel-explore.png` | 追逐 |
| 逗猫老鼠 | `mouse-toy.png` | 狩猎 |
| 高处瞭望 | `high-perch.png` | 攀爬 |
| 响纸追逐 | `crinkle-chase.png` | 追逐 |
| 训练握手 | `training-handshake.png` | 互动 |
| 猫薄荷玩具 | `catnip-toy.png` | 独处 |

> 游戏 id 以后端 `backend/src/data/playGames.ts` 为准。

## 出图建议

- **尺寸**：正方形（1:1），建议 ≥ 256×256，卡片缩略图按 48×48 显示。
- **风格统一前缀**（每张都加）：
  ```
  Flat vector illustration, cream pastel color palette, soft warm beige and orange tones,
  minimal clean composition, rounded shapes, centered object, soft shadows, no text,
  gentle cozy pet app illustration style
  ```
- **各游戏主体描述**（接在前缀后）：
  - laser-chase: a laser pointer pen with a glowing red dot
  - feather-fishing: a feather wand teaser toy with colorful feathers
  - food-puzzle: a treat puzzle feeder ball with kibble pieces
  - hide-seek: a half-open cardboard box with peeking cat ears
  - tunnel-explore: a colorful crinkle cat tunnel with two open ends
  - mouse-toy: a plush toy mouse with a long tail
  - high-perch: a tall cat tree tower near a sunny window
  - crinkle-chase: a shiny crinkle paper ball with motion lines
  - training-handshake: a raised cat paw and a hand offering a treat
  - catnip-toy: a catnip mouse toy with green catnip leaves

## 中文提示词（即梦 / 通义万相 / 文心一格）

国产工具中文提示词出图更准。结构：**通用前缀（每张照抄，不要改）+ 主体（只换这一句）**。

**通用风格前缀**（原样复制）：

```
扁平矢量插画风格，奶油色调，米白、暖橙、浅棕配色，圆润可爱，构图简洁居中，单一主体，柔和阴影，干净背景，无文字，温馨萌系宠物App插画
```

**各游戏主体**（接在前缀后）：

| 文件名 | 主体描述 |
| --- | --- |
| `laser-chase.png` | 一支可爱的激光笔，地面上有一个发光的红色光点 |
| `feather-fishing.png` | 一根逗猫棒，顶端有彩色羽毛，连着细线 |
| `food-puzzle.png` | 一个漏食益智球，周围散落几颗猫粮 |
| `hide-seek.png` | 一个半开的纸箱，箱子上方露出一对猫耳朵 |
| `tunnel-explore.png` | 一条彩色的猫咪隧道，两端开口 |
| `mouse-toy.png` | 一只长尾巴的毛绒玩具老鼠 |
| `high-perch.png` | 一座高高的猫爬架，带多层平台，旁边是洒满阳光的窗户 |
| `crinkle-chase.png` | 一个闪亮的响纸球，正在弹跳，带动态线条 |
| `training-handshake.png` | 一只抬起的猫爪和一只递出零食的手，握手训练 |
| `catnip-toy.png` | 一个猫薄荷玩具老鼠，配绿色的猫薄荷叶子 |

**完整示例**（可直接粘进输入框，以 laser-chase 为例）：

```
扁平矢量插画风格，奶油色调，米白、暖橙、浅棕配色，圆润可爱，构图简洁居中，单一主体，柔和阴影，干净背景，无文字，温馨萌系宠物App插画，一支可爱的激光笔，地面上有一个发光的红色光点
```

后面 9 张前缀完全不动，只替换最后的主体那一句。

### 推荐工具与流程

- **优先即梦 AI**（jimeng.jianying.com）：国内稳定、有每日免费额度、扁平插画强，且支持「参考图」锁风格。其次 **通义万相**、**文心一格**（均国内直连、中文友好、每日免费）。
- **锁风格批量出图**：先出满意的第一张 → 设为参考图（或固定 seed）→ 依次换主体出其余 9 张，统一性最好。
- **比例选 1:1**，按上表文件名命名后放进本目录即可。

### 出图微调技巧

- 太写实/有照片感 → 加「矢量插画，无渐变写实质感」
- 颜色偏冷或太艳 → 强调「低饱和奶油色，柔和暖色」
- 画面太满/有杂物 → 强调「极简，大量留白，仅一个主体」
- 冒出文字水印 → 再次强调「画面中无任何文字」

## 占位逻辑

未放入对应图片的游戏，卡片会自动显示**按类别区分的 emoji 占位图**
（🏃追逐 / 🎯狩猎 / 🧩益智 / 🤝互动 / 🧗攀爬 / 🌿独处），
所以你可以一张一张陆续补，不必一次性凑齐。

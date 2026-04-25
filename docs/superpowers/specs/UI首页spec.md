「哈吉咪养成计划」首页 UI 重构 Spec
1. 布局重构
当前问题：
信息模块排版松散，缺乏网格对齐逻辑，视觉重心不突出
左侧导航与主内容区间距不合理，层级模糊
「其他家庭成员」「成长足迹」模块无统一间距规范，视觉节奏差
响应式适配缺失，小屏易出现内容挤压、横向溢出
修改方案：
采用「左侧导航（200px）+ 主内容区（calc (100% - 200px)）」固定网格布局，桌面端最大宽度 1280px，居中对齐
主内容区按 2 列网格划分：上半部分「猫咪信息卡片（占 2/3）+ 近期待办（占 1/3）」，下半部分「体重仪表盘（占 1/2）+ 家庭成员 / 成长足迹（占 1/2）」
统一模块间距为 24px，卡片内边距统一为 24px，建立 8px 间距系统
新增响应式规则：＜768px 时，左侧导航转为顶部抽屉导航，主内容区改为单列布局
DOM 结构变化：
html
预览
<div class="layout-container">
  <!-- 左侧导航 -->
  <aside class="sidebar">
    <div class="sidebar-header"><img src="logo.png" alt="logo"><span>哈吉咪</span></div>
    <div class="sidebar-menu">
      <div class="menu-item active"><i class="icon-home"></i><span>首页</span></div>
      <div class="menu-item"><i class="icon-record"></i><span>成长记录</span></div>
      <div class="menu-item"><i class="icon-guide"></i><span>养猫指南</span></div>
      <div class="menu-item"><i class="icon-qa"></i><span>喵星小顾问</span></div>
      <div class="menu-item"><i class="icon-mine"></i><span>我的猫咪</span></div>
    </div>
  </aside>
  <!-- 主内容区 -->
  <main class="main-content">
    <div class="grid grid-cols-3 gap-6">
      <!-- 猫咪信息卡片 -->
      <div class="col-span-2 cat-info-card">...</div>
      <!-- 近期待办 -->
      <div class="col-span-1 todo-card">...</div>
      <!-- 体重仪表盘 -->
      <div class="col-span-1 weight-gauge-card">...</div>
      <!-- 家庭成员+成长足迹 -->
      <div class="col-span-1 right-column">
        <div class="family-card">...</div>
        <div class="timeline-card">...</div>
      </div>
    </div>
  </main>
</div>
2. 视觉系统
颜色：
主色：#FF7D4E（品牌橙，按钮 / 强调文本）
状态色：#52C41A（正常 / 健康）、#FAAD14（预警）、#F5222D（异常）
中性色：#1D2129（主标题）、#4E5969（正文）、#86909C（辅助文字）、#F5F5F5（背景）、#FFFFFF（卡片背景）、#C9CDD4（边框 / 分割线）
字体：
页面标题：20px/28px，字重 600
卡片标题：16px/24px，字重 600
正文 / 数据：14px/22px，字重 400
辅助文字 / 标签：12px/18px，字重 400
spacing：
页面内边距：24px（桌面端）、16px（移动端）
模块间距：24px
卡片内边距：24px
组件内间距：16px（标题与内容）、12px（数据项间距）、8px（图标与文字）
圆角：
卡片：16px
按钮：12px
头像 / 标签：8px
输入框 / 仪表盘：12px
3. 组件改造
CatInfoCard
修改点：
优化卡片布局，采用 Flex 水平分布：左侧猫咪信息，右侧健康状态标签 + 操作按钮
统一按钮样式，「记一笔」主按钮使用品牌橙，「AI 咨询」使用白色描边样式
新增状态标签的 hover 动效，强化交互反馈
新结构：
html
预览
<div class="cat-info-card">
  <div class="cat-info-left">
    <img src="cat-avatar.png" alt="奶糖" class="cat-avatar">
    <div class="cat-info-text">
      <h2 class="cat-name">奶糖 <span class="tag-current">当前</span></h2>
      <p class="cat-desc">1岁8个月 · 2.8kg</p>
    </div>
  </div>
  <div class="cat-info-right">
    <div class="status-tag">
      <span class="status-dot"></span>
      <span class="status-text">体型正常</span>
      <span class="status-desc">奶糖整体健康状况良好，继续保持当前的养护方式。</span>
    </div>
    <div class="action-buttons">
      <button class="btn-primary">+ 记一笔</button>
      <button class="btn-secondary">AI 咨询</button>
    </div>
  </div>
</div>
WeightGauge
修改点：
优化仪表盘刻度与数据展示，增加标准范围提示的可读性
调整仪表盘尺寸与配色，强化当前体重数据的视觉层级
新增体重变化趋势小图标，直观展示体重增减状态
新结构：
html
预览
<div class="weight-gauge-card">
  <h3 class="card-title">当前体重</h3>
  <div class="gauge-container">
    <div class="gauge">
      <div class="gauge-scale">
        <span class="scale-min">2.5</span>
        <span class="scale-normal">2.7</span>
        <span class="scale-max">3.1</span>
      </div>
      <div class="gauge-value">
        <span class="value-text">2.8</span>
        <span class="unit">kg</span>
      </div>
      <div class="standard-range">标准：2.52-3.08kg</div>
    </div>
  </div>
</div>
FamilyMember
修改点：
统一成员卡片样式，增加 hover 放大效果与选中态高亮
调整「+」添加按钮样式，与成员卡片视觉风格统一
新增成员数量统计标签，强化模块信息层级
新结构：
html
预览
<div class="family-card">
  <div class="card-header">
    <h3 class="card-title">其他家庭成员</h3>
    <span class="count-tag">共4只</span>
  </div>
  <div class="family-list">
    <div class="member-item">
      <img src="cat1.png" alt="咪咪" class="member-avatar">
      <span class="member-name">咪咪</span>
      <span class="member-weight">3.5kg</span>
    </div>
    <!-- 其他成员... -->
    <div class="add-btn">+</div>
  </div>
</div>
GrowthTimeline
修改点：
重构时间线布局，采用垂直时间线设计，强化日期与记录的层级
统一记录卡片样式，区分「日常」「医疗」「饮食」等不同记录类型
优化「查看全部」按钮位置与样式，增强引导性
新结构：
html
预览
<div class="timeline-card">
  <div class="card-header">
    <h3 class="card-title">成长足迹</h3>
    <a href="#" class="view-all">查看全部 ></a>
  </div>
  <div class="timeline-list">
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="date">2026/3/8</span>
          <span class="tag-daily">日常</span>
        </div>
        <div class="timeline-body">
          <p class="record-title">体重：5.5kg</p>
          <p class="record-desc">定期体检，健康状况良好</p>
        </div>
      </div>
    </div>
    <!-- 其他记录... -->
  </div>
</div>
4. Tailwind / CSS 变更
css
/* 全局布局 */
.layout-container {
  @apply flex w-full min-h-screen bg-[#FAF9F7];
}

.sidebar {
  @apply w-[200px] bg-white border-r border-[#F0F0F0] flex flex-col py-6 px-4;
}

.sidebar-header {
  @apply flex items-center space-x-2 mb-8 px-4;
}

.sidebar-menu {
  @apply flex flex-col space-y-2;
}

.menu-item {
  @apply flex items-center space-x-3 px-4 py-3 rounded-[8px] text-[14px] text-[#4E5969] hover:bg-[#FFF3EB] hover:text-[#FF7D4E] transition-colors;
}

.menu-item.active {
  @apply bg-[#FFF3EB] text-[#FF7D4E] font-medium;
}

.main-content {
  @apply flex-1 p-6 overflow-auto;
}

/* 通用卡片 */
.card {
  @apply bg-white rounded-[16px] p-6 shadow-sm;
}

.card-title {
  @apply text-[16px] font-semibold text-[#1D2129] mb-4;
}

/* 猫咪信息卡片 */
.cat-info-card {
  @apply card flex justify-between items-center;
}

.cat-info-left {
  @apply flex items-center space-x-4;
}

.cat-avatar {
  @apply w-[64px] h-[64px] rounded-[12px] object-cover;
}

.cat-name {
  @apply text-[20px] font-semibold text-[#1D2129];
}

.tag-current {
  @apply ml-2 px-2 py-0.5 rounded-[4px] bg-[#FFF3EB] text-[#FF7D4E] text-[12px];
}

.cat-desc {
  @apply text-[14px] text-[#4E5969] mt-1;
}

.cat-info-right {
  @apply flex flex-col items-end space-y-4;
}

.status-tag {
  @apply flex items-center space-x-2 bg-[#E6F7EF] px-3 py-2 rounded-[8px];
}

.status-dot {
  @apply w-2 h-2 rounded-full bg-[#52C41A];
}

.status-text {
  @apply text-[12px] font-medium text-[#52C41A];
}

.status-desc {
  @apply text-[12px] text-[#4E5969] ml-2;
}

.action-buttons {
  @apply flex space-x-3;
}

.btn-primary {
  @apply px-6 py-2.5 bg-[#FF7D4E] text-white rounded-[12px] text-[14px] font-medium hover:bg-[#FF6A33] transition-colors;
}

.btn-secondary {
  @apply px-6 py-2.5 border border-[#C9CDD4] text-[#4E5969] rounded-[12px] text-[14px] hover:border-[#FF7D4E] hover:text-[#FF7D4E] transition-colors;
}

/* 体重仪表盘 */
.weight-gauge-card {
  @apply card;
}

.gauge-container {
  @apply flex justify-center items-center py-4;
}

.gauge {
  @apply relative w-[200px] h-[120px];
}

.gauge-value {
  @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center;
}

.value-text {
  @apply text-[24px] font-bold text-[#1D2129];
}

.unit {
  @apply text-[14px] text-[#4E5969] ml-1;
}

.standard-range {
  @apply absolute bottom-0 left-1/2 -translate-x-1/2 text-[12px] text-[#86909C];
}

/* 家庭成员卡片 */
.family-card {
  @apply card;
}

.family-list {
  @apply flex items-center space-x-4 mt-4;
}

.member-item {
  @apply flex flex-col items-center space-y-1 p-2 rounded-[8px] hover:bg-[#F5F5F5] cursor-pointer transition-colors;
}

.member-avatar {
  @apply w-[40px] h-[40px] rounded-full object-cover;
}

.member-name {
  @apply text-[12px] text-[#1D2129];
}

.member-weight {
  @apply text-[10px] text-[#86909C];
}

.add-btn {
  @apply w-[40px] h-[40px] rounded-full border border-dashed border-[#C9CDD4] flex items-center justify-center text-[#86909C] hover:border-[#FF7D4E] hover:text-[#FF7D4E] transition-colors;
}

/* 成长足迹时间线 */
.timeline-card {
  @apply card mt-6;
}

.timeline-list {
  @apply mt-4 space-y-4;
}

.timeline-item {
  @apply flex;
}

.timeline-dot {
  @apply w-3 h-3 rounded-full bg-[#FF7D4E] mt-1.5 mr-4;
}

.timeline-content {
  @apply flex-1 border-l border-[#F0F0F0] pl-4 pb-4;
}

.timeline-header {
  @apply flex items-center space-x-2 mb-1;
}

.date {
  @apply text-[12px] text-[#86909C];
}

.tag-daily {
  @apply px-2 py-0.5 rounded-[4px] bg-[#F5F5F5] text-[12px] text-[#4E5969];
}

.record-title {
  @apply text-[14px] font-medium text-[#1D2129];
}

.record-desc {
  @apply text-[12px] text-[#86909C] mt-0.5;
}

.view-all {
  @apply text-[12px] text-[#FF7D4E] hover:text-[#FF6A33] transition-colors;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .sidebar {
    @apply fixed left-0 top-0 h-full -translate-x-full z-50 transition-transform;
  }
  .sidebar.open {
    @apply translate-x-0;
  }
  .main-content {
    @apply p-4;
  }
  .grid {
    @apply grid-cols-1;
  }
  .cat-info-card {
    @apply flex-col items-start space-y-4;
  }
  .cat-info-right {
    @apply items-start w-full;
  }
  .action-buttons {
    @apply w-full justify-between;
  }
  .btn-primary, .btn-secondary {
    @apply flex-1;
  }
}
5. Vue 代码改造建议
组件删除
删除无结构的零散 div 容器，替换为语义化组件
删除非标准的仪表盘自定义实现，替换为可复用的 GaugeChart 组件
删除重复的时间线样式代码，整合为 Timeline 通用组件
组件合并
合并左侧导航、头部栏为统一的 Layout 布局组件，实现路由级复用
合并猫咪信息展示、操作按钮为 CatInfoHeader 组件，适配不同猫咪详情页
合并家庭成员列表与添加功能为 FamilyMemberList 组件，支持动态添加 / 编辑
Props 修改
Layout 组件：
新增 props：activeMenu: String（控制当前选中的导航项）
新增 props：sidebarOpen: Boolean（控制移动端抽屉导航的展开状态）
CatInfoHeader 组件：
新增 props：catData: Object（猫咪基础信息：name、age、weight、avatar）
新增 props：status: String（健康状态：normal/warning/error）
新增 props：onAddRecord: Function（「记一笔」按钮点击事件）
新增 props：onAiConsult: Function（「AI 咨询」按钮点击事件）
Timeline 组件：
新增 props：records: Array（成长记录列表：包含 date、type、title、desc）
新增 props：onViewAll: Function（「查看全部」按钮点击事件）
FamilyMemberList 组件：
新增 props：members: Array（成员列表：包含 name、weight、avatar）
新增 props：onAddMember: Function（添加成员按钮点击事件）
新增 props：onSelectMember: Function（成员项点击事件）
新增功能
仪表盘数据联动：体重数据与健康状态标签自动同步，超出标准范围时自动切换状态色
时间线记录类型区分：根据记录类型（日常 / 医疗 / 饮食）显示不同颜色标签与图标
成员选中态：点击家庭成员时，自动切换当前猫咪信息与仪表盘数据
移动端适配：新增抽屉导航与单列布局，适配小屏设备
数据懒加载：成长足迹列表支持分页加载，优化首屏性能
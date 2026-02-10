<script setup lang="ts">
const templates = ref([
  {
    id: '1',
    name: '新手入门计划',
    description: '适合第一次养猫的新手，涵盖前3个月的重要事项',
    category: '新手',
    icon: '🌟',
    items: 6
  },
  {
    id: '2',
    name: '疫苗接种提醒',
    description: '跟踪猫咪的疫苗接种进度',
    category: '健康',
    icon: '💉',
    items: 3
  },
  {
    id: '3',
    name: '幼猫护理清单',
    description: '3-6个月幼猫的日常护理要点',
    category: '护理',
    icon: '🧼',
    items: 8
  },
  {
    id: '4',
    name: '成猫健康管理',
    description: '成年猫咪的年度健康检查计划',
    category: '健康',
    icon: '🏥',
    items: 5
  }
])

function useTemplate(template: any) {
  // TODO: 实现模板使用功能
  alert(`将使用模板：${template.name}`)
}
</script>

<template>
  <div class="templates-page">
    <div class="page-header">
      <h1 class="page-title">📋 计划模板</h1>
      <p class="page-subtitle">预设的养成计划，轻松管理猫咪成长</p>
    </div>

    <div class="templates-grid">
      <div
        v-for="template in templates"
        :key="template.id"
        class="template-card"
      >
        <div class="template-header">
          <span class="template-icon">{{ template.icon }}</span>
          <span class="template-category">{{ template.category }}</span>
        </div>
        <h3 class="template-name">{{ template.name }}</h3>
        <p class="template-description">{{ template.description }}</p>
        <div class="template-footer">
          <span class="template-items">{{ template.items }} 项任务</span>
          <button class="use-btn" @click="useTemplate(template)">
            使用模板
          </button>
        </div>
      </div>
    </div>

    <!-- 创建自定义计划 -->
    <div class="create-section">
      <h2 class="section-title">创建自定义计划</h2>
      <p class="section-text">根据您猫咪的具体情况，创建个性化的养成计划</p>
      <button class="create-btn">
        <span>+</span>
        创建新计划
      </button>
    </div>
  </div>
</template>

<style scoped>
.templates-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.template-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.template-icon {
  font-size: 2rem;
}

.template-category {
  background: #f1f5f9;
  color: #64748b;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.template-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.75rem 0;
}

.template-description {
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-items {
  color: #94a3b8;
  font-size: 0.875rem;
}

.use-btn {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.use-btn:hover {
  transform: scale(1.05);
}

.create-section {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.section-text {
  color: #a16207;
  margin: 0 0 2rem 0;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #92400e;
  border: 2px dashed #f59e0b;
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.create-btn:hover {
  border-color: #f97316;
  background: #fff7ed;
}
</style>

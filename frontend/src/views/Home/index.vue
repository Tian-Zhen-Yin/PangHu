<script setup lang="ts">
import { RouterLink } from 'vue-router'

const features = [
  {
    title: '养成时间线',
    description: '从新生到成年，了解猫咪成长的每个阶段',
    icon: '📅',
    path: '/timeline',
    color: 'bg-gradient-to-br from-orange-400 to-pink-500'
  },
  {
    title: '知识指南',
    description: '喂养、护理、健康全方位知识库',
    icon: '📚',
    path: '/guides',
    color: 'bg-gradient-to-br from-blue-400 to-purple-500'
  },
  {
    title: '计划模板',
    description: '预设养成计划，轻松管理猫咪成长',
    icon: '📋',
    path: '/templates',
    color: 'bg-gradient-to-br from-green-400 to-teal-500'
  }
]

const stages = [
  { name: '新生期', age: '0-2周', emoji: '👶' },
  { name: '过渡期', age: '2-4周', emoji: '🔄' },
  { name: '社交期', age: '4-12周', emoji: '🤝' },
  { name: '幼猫期', age: '3-6个月', emoji: '🐱' },
  { name: '青春期', age: '6-12个月', emoji: '😼' },
  { name: '成年期', age: '1岁+', emoji: '😺' }
]
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="emoji">🐱</span>
          猫咪养成计划
        </h1>
        <p class="hero-subtitle">
          从幼猫到成年，全程陪伴您的猫咪健康成长
        </p>
        <div class="hero-actions">
          <RouterLink to="/timeline" class="btn btn-primary">
            开始探索
            <span class="arrow">→</span>
          </RouterLink>
          <RouterLink to="/guides" class="btn btn-secondary">
            浏览指南
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <h2 class="section-title">核心功能</h2>
      <div class="features-grid">
        <RouterLink
          v-for="feature in features"
          :key="feature.title"
          :to="feature.path"
          class="feature-card"
        >
          <div :class="['feature-icon', feature.color]">
            {{ feature.icon }}
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </RouterLink>
      </div>
    </section>

    <!-- Stages Overview -->
    <section class="stages-section">
      <h2 class="section-title">成长阶段</h2>
      <p class="section-subtitle">猫咪成长的六个重要阶段</p>
      <div class="stages-grid">
        <div v-for="stage in stages" :key="stage.name" class="stage-card">
          <span class="stage-emoji">{{ stage.emoji }}</span>
          <h4 class="stage-name">{{ stage.name }}</h4>
          <p class="stage-age">{{ stage.age }}</p>
        </div>
      </div>
      <div class="stages-action">
        <RouterLink to="/timeline" class="text-link">
          查看完整时间线 →
        </RouterLink>
      </div>
    </section>

    <!-- Tips Section -->
    <section class="tips-section">
      <h2 class="section-title">养猫小贴士</h2>
      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon">💧</div>
          <h4 class="tip-title">保证饮水</h4>
          <p class="tip-text">猫咪需要充足的清洁饮水，建议使用流动水源</p>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🏠</div>
          <h4 class="tip-title">安全环境</h4>
          <p class="tip-text">为猫咪提供安全舒适的生活空间</p>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🏥</div>
          <h4 class="tip-title">定期体检</h4>
          <p class="tip-text">定期带猫咪体检，预防疾病</p>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🎾</div>
          <h4 class="tip-title">适度运动</h4>
          <p class="tip-text">每天安排适量玩耍时间，保持活力</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hero Section */
.hero {
  text-align: center;
  padding: 4rem 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%);
  border-radius: 1.5rem;
  margin-bottom: 3rem;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.emoji {
  font-size: 3.5rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #64748b;
  margin: 0 0 2rem 0;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.875rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(249, 115, 22, 0.3);
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  border-color: #f97316;
  color: #f97316;
}

.arrow {
  transition: transform 0.3s ease;
}

.btn:hover .arrow {
  transform: translateX(4px);
}

/* Section Styles */
.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  margin: 0 0 0.5rem 0;
}

.section-subtitle {
  text-align: center;
  color: #64748b;
  margin: 0 0 2rem 0;
}

/* Features Section */
.features-section {
  margin-bottom: 4rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.feature-description {
  color: #64748b;
  margin: 0;
}

/* Stages Section */
.stages-section {
  margin-bottom: 4rem;
}

.stages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stage-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.stage-card:hover {
  transform: scale(1.05);
}

.stage-emoji {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.stage-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stage-age {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

.stages-action {
  text-align: center;
}

.text-link {
  color: #f97316;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.text-link:hover {
  color: #ea580c;
}

/* Tips Section */
.tips-section {
  margin-bottom: 2rem;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.tip-card {
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
  padding: 1.5rem;
  border-radius: 1rem;
}

.tip-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.tip-title {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.tip-text {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .stages-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

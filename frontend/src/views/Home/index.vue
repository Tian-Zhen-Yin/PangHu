<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { getProactiveAdvice } from '../../api/proactive.js'
import type { ProactiveAdvice } from '../../types/proactive.js'
import type { Cat } from '../../types/cat.js'
import { getAvatarUrl } from '../../utils/format.js'

const authStore = useAuthStore()
const catStore = useMyCatStore()

const selectedCat = ref<Cat | null>(null)
const todayAdvice = ref<ProactiveAdvice | null>(null)

onMounted(async () => {
  await catStore.fetchCats()
  const cats = catStore.cats
  if (cats.length > 0) {
    selectedCat.value = cats[0]!
    try {
      todayAdvice.value = await getProactiveAdvice(selectedCat.value!.id, ['vaccine', 'weight', 'general'])
    } catch (err) {
      console.error('获取 AI 建议失败:', err)
    }
  }
})

function getWeightIcon(status: string): string {
  switch (status) {
    case 'thin': return '📉'
    case 'normal': return '✅'
    case 'overweight': return '📈'
    default: return '❓'
  }
}

const features = [
  {
    title: '成长记录',
    description: '记下相遇后的每一天，留住每一段温暖时光',
    icon: '📸',
    path: '/timeline',
    color: 'bg-primary-soft'
  },
  {
    title: '养猫指南',
    description: '吃什么、怎么养、何时护理，简单易懂，不踩坑',
    icon: '📚',
    path: '/guides',
    color: 'bg-secondary-soft'
  },
  {
    title: '记录模板',
    description: '日常、体重、疫苗、驱虫，点一下就能快速记',
    icon: '📋',
    path: '/templates',
    color: 'bg-accent-soft'
  },
  {
    title: '喵星小顾问',
    description: '有疑问随时问，轻松养好你的喵星小居民',
    icon: '🤖',
    path: '/ai-chat',
    color: 'bg-primary-soft',
    requiresAuth: true
  }
]

const stages = [
  { name: '新生期', age: '0-2周', emoji: '👶' },
  { name: '过渡期', age: '2-4周', emoji: '🔄' },
  { name: '社交期', age: '4-12周', emoji: '🤝' },
  { name: '幼猫期', age: '3-6个月', emoji: '🌱' },
  { name: '青春期', age: '6-12个月', emoji: '⚡' },
  { name: '成年期', age: '1岁+', emoji: '🏠' }
]
</script>

<template>
  <div class="home-page">
    <!-- Hero Section with Image -->
    <section class="hero">
      <div class="hero-image" role="img" aria-label="哈吉咪养成计划"></div>
      <div class="hero-overlay">
        <div class="page-container">
          <div class="hero-content">
            <h1 class="hero-title">哈吉咪养成计划</h1>
            <p class="hero-subtitle">
              从相遇那天起，陪你的每一位喵星小居民，好好长大。
            </p>
            <div class="hero-actions">
              <RouterLink to="/timeline" class="hero-btn primary">
                开始记录
                <span class="arrow">→</span>
              </RouterLink>
              <RouterLink to="/guides" class="hero-btn secondary">
                养猫指南
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="page-container">
      <!-- AI 今日建议（仅登录用户显示） -->
    <section v-if="authStore.isAuthenticated && todayAdvice" class="ai-advice-section">
      <h2 class="section-title">AI 今日建议</h2>
      <div class="advice-card">
        <div class="cat-info">
          <img v-if="selectedCat?.avatarData || selectedCat?.avatar" :src="getAvatarUrl(selectedCat)" class="cat-avatar" :alt="selectedCat.name" />
          <div v-else class="cat-avatar-placeholder">{{ selectedCat?.name?.charAt(0) || '?' }}</div>
          <span class="cat-name">{{ selectedCat?.name }}</span>
        </div>
        <div class="advice-items">
          <div v-if="todayAdvice.vaccineAdvice" class="quick-advice">
            <span class="advice-icon">💉</span>
            <span class="advice-text">{{ todayAdvice.vaccineAdvice.nextAction }}</span>
          </div>
          <div v-if="todayAdvice.weightAdvice" class="quick-advice">
            <span class="advice-icon">
              {{ getWeightIcon(todayAdvice.weightAdvice.status) }}
            </span>
            <span class="advice-text">{{ todayAdvice.weightAdvice.suggestion }}</span>
          </div>
          <div v-if="todayAdvice.generalAdvice" class="quick-advice general">
            <span class="advice-icon">🤖</span>
            <span class="advice-text">{{ todayAdvice.generalAdvice }}</span>
          </div>
        </div>
        <RouterLink v-if="selectedCat" :to="`/my-cats/${selectedCat.id}`" class="view-detail-link">
          查看详情 →
        </RouterLink>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <h2 class="section-title">开始你的养猫之旅</h2>
      <div class="features-grid">
        <RouterLink
          v-for="feature in features"
          :key="feature.title"
          :to="feature.path"
          class="feature-card"
          v-show="!feature.requiresAuth || authStore.isAuthenticated"
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
  </div>
</template>

<style scoped>
.home-page {
  animation: fadeIn var(--transition-slow);
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

.page-container {
  width: 100%;
  margin: 0 auto;
  padding: 0 32px;
}

/* Hero Section */
.hero {
  position: relative;
  width: 100%;
  min-height: 500px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin: 0 -32px var(--space-3xl);
}

.hero-image {
  width: 100%;
  height: 100%;
  display: block;
  background: linear-gradient(135deg, #FFF5EB 0%, #FFE8D6 50%, #FFD4B8 100%);
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3xl) 32px;
  background: linear-gradient(to top, rgba(90, 74, 66, 0.7), transparent);
}

.hero-content {
  max-width: 500px;
}

.hero-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-white);
  margin: 0 0 var(--space-sm) 0;
}

.hero-subtitle {
  font-size: var(--text-lg);
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 var(--space-lg) 0;
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.hero-btn {
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-base);
}

.hero-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: var(--shadow-warm-sm);
}

.hero-btn.primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-warm-md);
}

.hero-btn.secondary {
  background: rgba(255, 255, 255, 0.95);
  color: var(--color-text-main);
}

.hero-btn.secondary:hover {
  background: var(--color-text-white);
}

.arrow {
  transition: transform var(--transition-base);
}

.hero-btn:hover .arrow {
  transform: translateX(4px);
}

/* Section Styles */
.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  text-align: center;
  margin: 0 0 var(--space-sm) 0;
}

.section-subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-xl) 0;
}

/* Features Section */
.features-section {
  margin-bottom: var(--space-4xl);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

.feature-card {
  background: var(--color-bg-card);
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--color-border-light);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
}

.feature-icon {
  width: 4rem;
  height: 4rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  margin-bottom: var(--space-md);
}

.feature-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-xs) 0;
}

.feature-description {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: var(--text-sm);
}

/* Stages Section */
.stages-section {
  margin-bottom: var(--space-4xl);
}

.stages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.stage-card {
  background: var(--color-bg-card);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  text-align: center;
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-base);
  border: 1px solid var(--color-border-light);
}

.stage-card:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-sm);
}

.stage-emoji {
  font-size: var(--text-3xl);
  display: block;
  margin-bottom: var(--space-sm);
}

.stage-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-xxs) 0;
}

.stage-age {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  margin: 0;
}

.stages-action {
  text-align: center;
}

.text-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: color var(--transition-base);
}

.text-link:hover {
  color: var(--color-primary-hover);
}

/* Tips Section */
.tips-section {
  margin-bottom: var(--space-xl);
}

/* AI Advice Section */
.ai-advice-section {
  max-width: 800px;
  margin: 0 auto var(--space-3xl);
}

.advice-card {
  background: linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-secondary-soft) 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.cat-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.cat-avatar,
.cat-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.cat-avatar-placeholder {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-white);
  font-weight: var(--font-semibold);
  font-size: var(--text-xl);
}

.cat-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  font-size: var(--text-lg);
}

.advice-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.quick-advice {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
}

.quick-advice.general {
  background: var(--color-primary-soft);
  border-left: 3px solid var(--color-primary);
}

.advice-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.advice-text {
  font-size: var(--text-sm);
  color: var(--color-text-main);
  line-height: var(--leading-normal);
}

.view-detail-link {
  display: inline-block;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.view-detail-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-lg);
}

.tip-card {
  background: linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-bg-soft) 100%);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
}

.tip-icon {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-sm);
}

.tip-title {
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-xs) 0;
}

.tip-text {
  color: var(--color-text-secondary);
  margin: 0;
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .hero {
    min-height: 400px;
    margin: 0 calc(-1 * var(--space-md)) var(--space-2xl);
  }

  .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-subtitle {
    font-size: var(--text-base);
  }

  .section-title {
    font-size: var(--text-xl);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .stages-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 小屏幕优化 (< 375px) */
@media (max-width: 374px) {
  .page-container {
    padding: 0 var(--space-md);
  }

  .hero {
    min-height: 350px;
    border-radius: var(--radius-md);
  }

  .hero-title {
    font-size: var(--text-xl);
  }

  .hero-subtitle {
    font-size: var(--text-sm);
  }

  .hero-btn {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-sm);
  }

  .section-title {
    font-size: var(--text-lg);
  }

  .stages-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }

  .tips-grid {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }
}

/* 横屏模式优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .hero {
    min-height: 300px;
  }

  .hero-overlay {
    padding: var(--space-xl) var(--space-lg);
  }

  .main-content {
    padding-top: calc(48px + var(--space-md));
  }
}
</style>

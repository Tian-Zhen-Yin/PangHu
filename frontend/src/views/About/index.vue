<script setup lang="ts">
</script>

<template>
  <div class="about-page">
    <div class="about-header">
      <span class="about-emoji">🐱</span>
      <h1 class="about-title">关于哈吉咪养成计划</h1>
      <p class="about-subtitle">帮助每一位猫友更好地照顾自己的毛孩子</p>
    </div>

    <div class="about-content">
      <section class="about-section">
        <h2 class="section-title">我们的使命</h2>
        <p class="section-text">
          哈吉咪养成计划致力于为猫咪主人提供全面、科学的养护指导。
          从幼猫到成年，我们陪伴您的猫咪走过每一个重要阶段。
        </p>
      </section>

      <section class="about-section">
        <h2 class="section-title">功能特色</h2>
        <div class="features-list">
          <div class="feature-item">
            <span class="feature-icon">📅</span>
            <h3 class="feature-name">成长时间线</h3>
            <p class="feature-description">清晰的阶段划分和里程碑追踪</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📚</span>
            <h3 class="feature-name">知识指南</h3>
            <p class="feature-description">全面覆盖喂养、健康、训练等知识</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <h3 class="feature-name">任务清单</h3>
            <p class="feature-description">实用的待办事项管理</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">💉</span>
            <h3 class="feature-name">疫苗提醒</h3>
            <p class="feature-description">疫苗接种时间表和提醒</p>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2 class="section-title">技术栈</h2>
        <div class="tech-stack">
          <div class="tech-column">
            <h3 class="tech-title">前端</h3>
            <ul class="tech-list">
              <li>Vue 3</li>
              <li>TypeScript</li>
              <li>Vite</li>
              <li>Element Plus</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
          <div class="tech-column">
            <h3 class="tech-title">后端</h3>
            <ul class="tech-list">
              <li>Node.js</li>
              <li>Express</li>
              <li>TypeScript</li>
              <li>Prisma ORM</li>
              <li>SQLite</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2 class="section-title">联系我们</h2>
        <p class="section-text">
          如果您有任何问题或建议，欢迎通过以下方式联系我们：
        </p>
        <div class="contact-links">
          <a href="mailto:contact@example.com" class="contact-link">
            <span class="contact-icon">📧</span>
            contact@example.com
          </a>
          <a href="https://github.com" target="_blank" class="contact-link">
            <span class="contact-icon">🐱</span>
            GitHub
          </a>
        </div>
      </section>
    </div>

    <div class="about-footer">
      <p>用爱陪伴每一只小猫成长 🐾</p>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.about-header {
  text-align: center;
  margin-bottom: 3rem;
}

.about-emoji {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.about-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.about-subtitle {
  color: #64748b;
  font-size: 1.125rem;
  margin: 0;
}

.about-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.section-text {
  color: #64748b;
  line-height: 1.7;
  margin: 0;
}

/* 功能列表 */
.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  text-align: center;
}

.feature-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.75rem;
}

.feature-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.feature-description {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

/* 技术栈 */
.tech-stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.tech-title {
  font-weight: 600;
  color: #475569;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f97316;
}

.tech-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tech-list li {
  color: #64748b;
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.tech-list li::before {
  content: '▹';
  position: absolute;
  left: 0;
  color: #f97316;
}

/* 联系方式 */
.contact-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #f8fafc;
  color: #475569;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.contact-link:hover {
  background: #f97316;
  color: white;
}

.contact-icon {
  font-size: 1.25rem;
}

/* 页脚 */
.about-footer {
  text-align: center;
  padding: 2rem 0;
  color: #64748b;
}
</style>

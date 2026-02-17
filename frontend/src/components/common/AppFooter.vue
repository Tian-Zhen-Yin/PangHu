<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <p class="footer-text">
        © {{ year }} 哈吉咪养成计划. 用爱陪伴每一只小猫成长 🐾
      </p>
      <p class="footer-links">
        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
        <span class="separator">•</span>
        <a href="mailto:contact@example.com">联系我们</a>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #1e293b;
  color: #94a3b8;
  padding: 2rem 1rem;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-text {
  margin: 0 0 0.5rem 0;
}

.footer-links {
  margin: 0.5rem 0 0 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-links a {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: #f97316;
}

.separator {
  color: #475569;
}
</style>

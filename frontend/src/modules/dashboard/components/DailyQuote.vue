<script setup lang="ts">
import { ref, onMounted } from 'vue'

const quote = ref('')

const dailyQuotes = [
  '今天也要给小猫一个温柔的拥抱呀 🐾',
  '你的喵星人正在用呼噜声说爱你 💕',
  '慢下来，和小猫一起享受午后的阳光 ☀️',
  '每一次陪伴，都是成长的印记 🌸',
  '小猫的世界很小，装满你就是全部 🏠',
  '今日份的可爱已送达，请查收 📦'
]

onMounted(() => {
  quote.value = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]
})
</script>

<template>
  <div class="daily-quote">
    <div class="quote-icon">💭</div>
    <p class="quote-text">{{ quote }}</p>
    <span class="quote-time">{{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
  </div>
</template>

<style scoped>
.daily-quote {
  background: linear-gradient(135deg, var(--color-bg-alt) 0%, var(--color-secondary-dim) 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.quote-icon {
  font-size: var(--text-3xl);
  margin-bottom: var(--space-sm);
}

.quote-text {
  font-size: var(--text-lg);
  color: var(--color-text-main);
  margin: 0 0 var(--space-md) 0;
  line-height: var(--leading-normal);
}

.quote-time {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}
</style>

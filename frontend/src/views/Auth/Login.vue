<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'

const router = useRouter()
const authStore = useAuthStore()

const account = ref('')
const password = ref('')
const showError = ref(false)

// 处理登录
async function handleLogin() {
  if (!account.value || !password.value) {
    showError.value = true
    return
  }

  const success = await authStore.loginAction({
    account: account.value,
    password: password.value
  })

  if (success) {
    router.push('/')
  } else {
    showError.value = true
  }
}

// 跳转注册页
function goToRegister() {
  router.push('/register')
}
</script>

<template>
  <div class="auth-page">
    <!-- 移动端顶部品牌栏 -->
    <div class="mobile-brand">
      <h1 class="mobile-brand-title">哈吉咪养成计划</h1>
      <MascotCharacter
        expression="default"
        size="small"
        :animated="false"
      />
    </div>

    <!-- 左侧：吉祥物品牌展示区（仅桌面端显示） -->
    <div class="brand-section desktop-only">
      <MascotCharacter
        expression="default"
        size="hero"
        :animated="true"
        :float-animation="true"
      />
      <div class="brand-content">
        <h1 class="brand-title">哈吉咪养成计划</h1>
        <p class="brand-subtitle">记录喵星人的成长足迹</p>
        <div class="brand-features">
          <div class="feature-item">
            <span class="feature-icon">📸</span>
            <span>成长记录</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">⚖️</span>
            <span>体重追踪</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">💉</span>
            <span>健康提醒</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：登录表单 -->
    <div class="auth-container">
      <div class="auth-header">
        <h2 class="auth-title">欢迎回来</h2>
        <p class="auth-subtitle">登录账号继续记录美好时光</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="account">邮箱或用户名</label>
          <input
            id="account"
            v-model="account"
            type="text"
            placeholder="请输入邮箱或用户名"
            class="form-input"
            :class="{ error: showError && !account }"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            class="form-input"
            :class="{ error: showError && !password }"
          />
        </div>

        <div v-if="showError && authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <button type="submit" class="auth-btn" :disabled="authStore.loading">
          {{ authStore.loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>还没有账号？ <a @click="goToRegister">立即注册</a></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: var(--space-md);
}

/* 移动端顶部品牌栏 */
.mobile-brand {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: var(--color-card);
  padding: var(--space-md) var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.mobile-brand-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  max-width: 480px;
}

/* 在移动端隐藏桌面端品牌区 */
.desktop-only {
  display: none;
}

.brand-content {
  margin-top: var(--space-2xl);
}

.brand-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-md) 0;
}

.brand-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-sub);
  margin: 0 0 var(--space-2xl) 0;
}

.brand-features {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.feature-icon {
  font-size: 24px;
}

.auth-container {
  background: var(--color-card);
  border-radius: var(--radius-2xl);
  padding: var(--space-3xl);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.4s ease-out;
  margin-top: 60px; /* 为移动端顶部栏留出空间 */
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-md) 0;
}

.auth-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.form-input {
  padding: var(--space-md) var(--space-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  transition: all var(--transition-base);
  background: var(--color-bg);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(246, 178, 107, 0.15);
}

.form-input.error {
  border-color: var(--color-error);
}

.error-message {
  background: var(--color-error-light);
  color: var(--color-error-dark);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  text-align: center;
}

.auth-btn {
  padding: var(--space-lg) var(--space-2xl);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.auth-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-warm-sm);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: var(--space-2xl);
  text-align: center;
  color: var(--color-text-sub);
  font-size: var(--text-sm);
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
  cursor: pointer;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* 移动端优化 */
@media (max-width: 767px) {
  .auth-page {
    flex-direction: column;
    padding: 0;
    justify-content: flex-start;
  }

  .mobile-brand {
    position: fixed;
    top: 0;
  }

  .auth-container {
    margin: 80px var(--space-md) var(--space-md);
    padding: var(--space-2xl);
    max-width: 100%;
  }

  .auth-title {
    font-size: var(--text-xl);
  }

  .brand-features {
    flex-wrap: wrap;
    gap: var(--space-md);
  }
}

/* 桌面端左右布局 */
@media (min-width: 768px) {
  .auth-page {
    flex-direction: row;
    gap: var(--space-5xl);
    padding: var(--space-3xl);
  }

  /* 隐藏移动端品牌栏 */
  .mobile-brand {
    display: none;
  }

  /* 显示桌面端品牌区 */
  .desktop-only {
    display: flex;
  }

  .auth-container {
    margin-top: 0;
    max-width: 440px;
    padding: var(--space-4xl);
  }

  .brand-section {
    align-items: flex-start;
    text-align: left;
  }

  .brand-content {
    margin-top: 0;
    margin-left: var(--space-3xl);
  }

  .brand-features {
    justify-content: flex-start;
  }
}
</style>

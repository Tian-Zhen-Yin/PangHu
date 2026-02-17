<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

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
    <div class="auth-container">
      <div class="auth-header">
        <h1 class="auth-title">🐱 哈吉咪养成计划</h1>
        <p class="auth-subtitle">登录您的账号</p>
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
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  padding: 1rem;
}

.auth-container {
  background: white;
  border-radius: 1.5rem;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.4s ease-out;
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
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.auth-subtitle {
  color: #64748b;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.form-input.error {
  border-color: #ef4444;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  text-align: center;
}

.auth-btn {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.auth-footer a {
  color: #f97316;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>

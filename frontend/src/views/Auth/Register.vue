<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const showError = ref(false)
const passwordError = ref('')

// 验证表单
function validateForm(): boolean {
  passwordError.value = ''

  if (!email.value || !username.value || !password.value || !confirmPassword.value) {
    showError.value = true
    return false
  }

  if (password.value.length < 6) {
    passwordError.value = '密码长度至少6个字符'
    return false
  }

  if (password.value !== confirmPassword.value) {
    passwordError.value = '两次输入的密码不一致'
    return false
  }

  return true
}

// 处理注册
async function handleRegister() {
  if (!validateForm()) {
    return
  }

  const success = await authStore.register({
    email: email.value,
    username: username.value,
    password: password.value
  })

  if (success) {
    router.push('/')
  } else {
    showError.value = true
  }
}

// 跳转登录页
function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <h1 class="auth-title">胖虎 · 哈吉咪养成计划</h1>
        <p class="auth-subtitle">创建您的账号</p>
      </div>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
            class="form-input"
            :class="{ error: showError && !email }"
          />
        </div>

        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="3-20个字符（支持中文、字母、数字）"
            class="form-input"
            :class="{ error: showError && !username }"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="至少6个字符"
            class="form-input"
            :class="{ error: showError && !password }"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            class="form-input"
            :class="{ error: showError && !confirmPassword }"
          />
        </div>

        <div v-if="passwordError" class="error-message">
          {{ passwordError }}
        </div>

        <div v-else-if="showError && authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <button type="submit" class="auth-btn" :disabled="authStore.loading">
          {{ authStore.loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>已有账号？ <a @click="goToLogin">立即登录</a></p>
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
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.auth-subtitle {
  color: var(--color-text-regular);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.form-input.error {
  border-color: var(--color-danger);
}

.error-message {
  background: #fef2f2;
  color: var(--color-danger);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  text-align: center;
}

.auth-btn {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
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
  color: var(--color-text-regular);
  font-size: 0.875rem;
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>

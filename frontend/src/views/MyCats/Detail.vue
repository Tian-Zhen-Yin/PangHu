<template>
  <div class="cat-detail-page">
    <div v-if="loading" class="loading">
      <MascotCharacter expression="yawning" size="large" :animated="true" />
      <p>正在加载档案...</p>
    </div>

    <div v-else-if="error" class="error">
      <MascotCharacter expression="confused" size="large" :animated="false" />
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchCatDetail">重试</button>
    </div>

    <div v-else-if="cat" class="detail-content">
      <!-- 档案头部卡片 - 玻璃拟态设计 -->
      <section class="profile-hero-card">
        <div class="hero-main">
          <div class="avatar-container" @click="handleAvatarClick">
            <div class="avatar-ring-large">
              <img v-if="cat.avatar" :src="avatarUrl" :alt="cat.name" class="pet-avatar-large" />
              <span v-else class="avatar-placeholder">{{ cat.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="avatar-upload-overlay">
              <span v-if="uploadingAvatar" class="uploading">上传中...</span>
              <span v-else class="upload-icon">📷</span>
            </div>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              style="display: none"
            />
          </div>

          <div class="info-group">
            <h2 class="pet-name-hero">
              {{ cat.name }}
              <span class="breed-tag">{{ cat.breed || '未知品种' }}</span>
            </h2>

            <!-- 微缩胶囊标签 -->
            <div class="meta-pills">
              <span class="pill gender" :class="cat.gender">
                <svg v-if="cat.gender === 'female'" class="pill-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C14.5 2 16.5 4 16.5 6.5C16.5 9 14.5 11 12 11C9.5 11 7.5 9 7.5 6.5C7.5 4 9.5 2 12 2M12 13C16.97 13 21 15.79 21 19V21H3V19C3 15.79 7.03 13 12 13Z"/>
                </svg>
                <svg v-else class="pill-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9.5 11 12 11C14.5 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2M12 13C7.03 13 3 15.79 3 19V21H21V19C21 15.79 16.97 13 12 13Z"/>
                </svg>
                {{ genderText }}
              </span>
              <span class="pill age">
                <svg class="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                {{ cat.ageFormatted }}
              </span>
              <span v-if="cat.weight" class="pill weight">
                <svg class="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3v18M6 12h12"/>
                </svg>
                {{ cat.weight }} kg
              </span>
              <span class="pill neutered" :class="{ 'is-neutered': cat.isNeutered }">
                <svg class="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12l5 5L20 7"/>
                </svg>
                {{ cat.isNeutered ? '已绝育' : '未绝育' }}
              </span>
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <button class="btn-outline-pill" @click="$router.push(`/my-cats/${cat.id}/edit`)">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            编辑档案
          </button>
          <button class="btn-primary-pill" @click="$router.push(`/my-cats/${cat.id}/vaccines`)">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            疫苗记录
          </button>
        </div>

        <!-- 健康备注 -->
        <div v-if="cat.allergies || cat.diseases || cat.features" class="health-notes">
          <div v-if="cat.features" class="note-item">
            <span class="note-emoji">✨</span>
            <span>{{ cat.features }}</span>
          </div>
        </div>
      </section>

      <!-- 体重趋势图 -->
      <WeightTrend :cat-id="cat.id" :cat-name="cat.name" />

      <!-- AI 健康分析 - 对话气泡风格 -->
      <AIHealthAdvice
        v-if="cat"
        :cat-id="cat.id"
        :types="['weight', 'vaccine', 'age', 'general']"
      />

      <!-- 底部功能入口 - 双栏大卡片 -->
      <footer class="bottom-action-dock">
        <button class="action-card record" @click="$router.push('/timeline')">
          <div class="icon-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <div class="text">
            <strong>添加成长记录</strong>
            <span>记下 {{ cat.name }} 的精彩瞬间</span>
          </div>
        </button>

        <button class="action-card ai" @click="$router.push('/ai-chat')">
          <div class="icon-bg">
            <MascotCharacter expression="focused" size="small" :animated="false" />
          </div>
          <div class="text">
            <strong>健康 AI 咨询</strong>
            <span>向胖虎医生提问</span>
          </div>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import WeightTrend from '../../components/cat/WeightTrend.vue'
import AIHealthAdvice from '../../components/cat/AIHealthAdvice.vue'
import { getMyCatById, uploadCatAvatar } from '../../api/myCat'
import { toast } from '../../composables/useToast'
import type { Cat } from '../../types/cat'

const route = useRoute()

const cat = ref<Cat | null>(null)
const loading = ref(true)
const error = ref('')
const uploadingAvatar = ref(false)
const avatarInputRef = ref<HTMLInputElement>()

const genderText = computed(() => {
  if (!cat.value) return ''
  return cat.value.gender === 'male' ? '公猫' :
         cat.value.gender === 'female' ? '母猫' : '未知'
})

const avatarUrl = computed(() => {
  if (!cat.value?.avatar) return ''
  const avatarPath = cat.value.avatar

  // 如果是完整的 URL，直接返回
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath
  }

  // 基础 URL（不含 /api）
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const baseURL = apiBase.replace('/api', '').replace(/\/$/, '')

  // 处理路径前导斜杠
  const path = avatarPath.startsWith('/') ? avatarPath : '/' + avatarPath

  return baseURL + path
})

function handleAvatarClick() {
  avatarInputRef.value?.click()
}

async function handleAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !cat.value) return

  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过5MB')
    return
  }

  uploadingAvatar.value = true
  try {
    const croppedFile = await cropAvatarToCircle(file)
    const response = await uploadCatAvatar(cat.value.id, croppedFile)
    console.log('[Avatar Upload] Response:', response)
    console.log('[Avatar Upload] response.data:', response.data)
    console.log('[Avatar Upload] avatar path:', response.data.avatar)

    // 直接更新头像数据
    if (cat.value) {
      cat.value.avatar = response.data.avatar
      console.log('[Avatar Upload] Updated cat.avatar:', cat.value.avatar)
      console.log('[Avatar Upload] Computed avatarUrl:', avatarUrl.value)
    }
    toast.success('头像更新成功')
  } catch (err: any) {
    console.error('头像上传失败:', err)
    toast.error(err.message || '头像上传失败')
  } finally {
    uploadingAvatar.value = false
    target.value = ''
  }
}

function cropAvatarToCircle(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('无法创建canvas'))

      const size = Math.min(img.width, img.height) * 0.8
      canvas.width = size
      canvas.height = size

      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      const scale = size / Math.min(img.width, img.height)
      const x = (size - img.width * scale) / 2
      const y = (size - img.height * scale) / 2

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('图片处理失败'))
        const croppedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        resolve(croppedFile)
      }, 'image/jpeg', 0.95)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

async function fetchCatDetail() {
  const catId = route.params.id as string
  loading.value = true
  error.value = ''

  try {
    const response = await getMyCatById(catId)
    cat.value = response.data
  } catch (err: any) {
    console.error('[Detail] Error fetching cat detail:', err)
    error.value = err.message || '获取猫咪详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCatDetail()
})
</script>

<style scoped>
.cat-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 加载/错误状态 */
.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
  color: #9CA3AF;
}

.retry-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ================= 档案头部卡片 - 玻璃拟态 ================= */
.profile-hero-card {
  background: linear-gradient(145deg, #FFFFFF 0%, #FDF3E9 100%);
  border-radius: 32px;
  padding: 28px;
  box-shadow:
    0 8px 32px rgba(244, 162, 97, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.03);
  border: 2px solid #FFFFFF;
  position: relative;
}

.hero-main {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 头像容器 */
.avatar-container {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-ring-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, #FDF3E9 0%, #FED7AA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.2);
}

.pet-avatar-large {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 44px;
}

.avatar-upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.avatar-container:hover .avatar-upload-overlay {
  opacity: 1;
}

.upload-icon {
  font-size: 24px;
}

.uploading {
  font-size: 10px;
  color: white;
  text-align: center;
  padding: 0 4px;
}

/* 猫咪名称 */
.pet-name-hero {
  font-size: 26px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.breed-tag {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  background: #F3F4F6;
  padding: 4px 10px;
  border-radius: 100px;
}

/* 微缩胶囊标签 */
.meta-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.pill-icon {
  width: 14px;
  height: 14px;
}

.pill.gender {
  background: #FFF1F2;
  color: #F43F5E;
}

.pill.gender.male {
  background: #E0F2FE;
  color: #0284C7;
}

.pill.age {
  background: #F0FDF4;
  color: #16A34A;
}

.pill.weight {
  background: #FEF3C7;
  color: #D97706;
}

.pill.neutered {
  background: #F3E8FF;
  color: #9333EA;
}

.pill.neutered.is-neutered {
  background: #DCFCE7;
  color: #16A34A;
}

/* 快捷操作按钮 */
.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #F3F4F6;
}

.btn-outline-pill,
.btn-primary-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline-pill {
  background: #FFFFFF;
  border: 1.5px solid #E5E7EB;
  color: #6B7280;
}

.btn-outline-pill:hover {
  border-color: #F4A261;
  color: #F4A261;
}

.btn-primary-pill {
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  border: none;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

.btn-primary-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 162, 97, 0.4);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 健康备注 */
.health-notes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #E5E7EB;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6B7280;
}

.note-emoji {
  font-size: 14px;
}

/* ================= 底部功能入口 ================= */
.bottom-action-dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  border: 1.5px solid #F3F4F6;
}

.action-card:hover {
  border-color: #FED7AA;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.1);
}

.action-card:active {
  transform: scale(0.98);
}

.icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-bg svg {
  width: 24px;
  height: 24px;
  color: #F4A261;
}

.action-card .text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-card .text strong {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
}

.action-card .text span {
  font-size: 12px;
  color: #9CA3AF;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .profile-hero-card {
    padding: 20px;
    border-radius: 24px;
  }

  .hero-main {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .avatar-ring-large {
    width: 90px;
    height: 90px;
  }

  .pet-name-hero {
    justify-content: center;
    font-size: 22px;
  }

  .meta-pills {
    justify-content: center;
  }

  .hero-actions {
    flex-direction: column;
  }

  .btn-outline-pill,
  .btn-primary-pill {
    justify-content: center;
    width: 100%;
  }

  .bottom-action-dock {
    grid-template-columns: 1fr;
  }

  .action-card {
    padding: 16px;
  }
}
</style>
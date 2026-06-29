<template>
  <div class="cat-form-page">
    <div class="page-header">
      <button class="btn-back" @click="$router.back()">← 返回</button>
      <h1>{{ isEdit ? '编辑猫咪档案' : '添加新猫咪' }}</h1>
    </div>

    <form class="cat-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h2>基本信息</h2>

        <!-- 头像上传 -->
        <div class="avatar-upload-section">
          <div class="avatar-preview" @click="handleAvatarClick">
            <img v-if="form.avatar" :src="avatarPreviewUrl" alt="头像预览" />
            <span v-else class="avatar-placeholder">📷</span>
            <div class="avatar-overlay">
              <span v-if="uploadingAvatar">上传中...</span>
              <span v-else>点击更换</span>
            </div>
          </div>
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            @change="handleAvatarChange"
            style="display: none"
          />
          <div class="avatar-info">
            <p class="avatar-title">猫咪头像</p>
            <p class="avatar-hint">支持 JPG、PNG 格式，建议正方形图片，会自动裁剪为圆形</p>
          </div>
        </div>

        <div class="form-group">
          <label>名字 <span class="required">*</span></label>
          <input v-model="form.name" type="text" placeholder="猫咪的名字" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>性别 <span class="required">*</span></label>
            <select v-model="form.gender" required>
              <option value="male">公猫</option>
              <option value="female">母猫</option>
              <option value="unknown">未知</option>
            </select>
          </div>

          <div class="form-group">
            <label>品种</label>
            <input v-model="form.breed" type="text" placeholder="如：英短、橘猫" />
          </div>
        </div>

        <div class="form-group">
          <label>猫咪来源 <span class="required">*</span></label>
          <select v-model="form.adoptStatus" required>
            <option v-for="(info, status) in adoptStatusConfig" :key="status" :value="status">
              {{ info.label }} - {{ info.description }}
            </option>
          </select>
          <p class="field-hint">选择猫咪来源会帮助优化成长记录和健康建议</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>出生日期 <span class="required">*</span></label>
            <input v-model="form.birthDate" type="date" required />
          </div>

          <div class="form-group checkbox-group" style="padding-top: 24px;">
            <label>
              <input v-model="form.birthDateEstimated" type="checkbox" />
              出生日期是估算的
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>开始饲养日期（领养日期）</label>
          <input v-model="form.adoptDate" type="date" />
          <p class="field-hint">记录开始饲养猫咪的日期，成长记录将从此日期开始显示</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>毛色</label>
            <input v-model="form.color" type="text" placeholder="如：橘色、黑白" />
          </div>

          <div class="form-group">
            <label>体重 (kg)</label>
            <input v-model.number="form.weight" type="number" step="0.1" min="0" max="20" placeholder="0.0" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h2>健康信息</h2>

        <div class="form-group checkbox-group">
          <label>
            <input v-model="form.isNeutered" type="checkbox" />
            已绝育
          </label>
        </div>

        <div class="form-group" v-if="form.isNeutered">
          <label>绝育日期</label>
          <input v-model="form.neuteredDate" type="date" />
        </div>

        <div class="form-group">
          <label>过敏信息</label>
          <textarea v-model="form.allergies" placeholder="记录已知的过敏原" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label>既往病史</label>
          <textarea v-model="form.diseases" placeholder="记录重要的病史信息" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label>特征描述</label>
          <textarea v-model="form.features" placeholder="外貌特征、性格等" rows="2"></textarea>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$router.back()">取消</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMyCatStore } from '../../stores/myCat.js'
import { getMyCatById, uploadCatAvatar } from '../../api/myCat.js'
import { toast } from '../../composables/useToast.js'
import type { CatFormData } from '../../types/cat.js'
import { ADOPT_STATUS_CONFIG } from '../../types/cat.js'
import { getAvatarUrl } from '../../utils/format.js'
import { cropAvatarToCircle } from '../../utils/imageCompress.js'

const route = useRoute()
const router = useRouter()
const catStore = useMyCatStore()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)

const form = ref<CatFormData & { neuteredDate?: string }>({
  name: '',
  gender: 'unknown',
  birthDate: '',
  birthDateEstimated: false,
  breed: '',
  avatar: '',
  adoptDate: '',
  adoptStatus: 'raisedFromBaby',
  weight: undefined,
  isNeutered: false,
  neuteredDate: '',
  color: '',
  features: '',
  allergies: '',
  diseases: ''
})

const uploadingAvatar = ref(false)
const avatarInputRef = ref<HTMLInputElement>()
const avatarFile = ref<File | null>(null) // 保存待上传的头像文件

// 获取头像预览URL
const avatarPreviewUrl = computed(() => {
  if (!form.value.avatar) return ''
  // 如果是本地 blob URL，直接返回
  if (form.value.avatar.startsWith('blob:')) return form.value.avatar
  // 使用共享工具函数构建相对路径 URL
  return getAvatarUrl({ avatar: form.value.avatar })
})

// 处理头像上传
function handleAvatarClick() {
  avatarInputRef.value?.click()
}

async function handleAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 源文件上限 20MB（避免 canvas 内存爆掉）；实际输出由 cropAvatarToCircle 压到 <300KB
  if (file.size > 20 * 1024 * 1024) {
    toast.error('图片过大，请选择小于 20MB 的图片')
    return
  }

  uploadingAvatar.value = true
  try {
    // 裁剪图片为圆形
    const croppedFile = await cropAvatarToCircle(file)

    // 如果是编辑模式且有猫咪ID，直接上传到服务器
    if (isEdit.value) {
      const catId = route.params.id as string
      const response = await uploadCatAvatar(catId, croppedFile)
      form.value.avatar = response.data.avatar
      toast.success('头像上传成功')
    } else {
      // 新建模式，保存文件并在提交时上传
      avatarFile.value = croppedFile
      // 显示预览
      form.value.avatar = URL.createObjectURL(croppedFile)
    }
  } catch (err: any) {
    console.error('头像处理失败:', err)
    toast.error(err.message || '头像处理失败')
  } finally {
    uploadingAvatar.value = false
    target.value = ''
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const res = await getMyCatById(route.params.id as string)
    if (res.success) {
      const cat = res.data
      form.value = {
        name: cat.name,
        gender: cat.gender,
        birthDate: cat.birthDate ? cat.birthDate.slice(0, 10) : '',
        birthDateEstimated: cat.birthDateEstimated || false,
        breed: cat.breed || '',
        avatar: cat.avatar || '',
        adoptDate: cat.adoptDate ? cat.adoptDate.slice(0, 10) : '',
        adoptStatus: cat.adoptStatus || 'raisedFromBaby',
        weight: cat.weight || undefined,
        isNeutered: cat.isNeutered,
        neuteredDate: cat.neuteredDate ? cat.neuteredDate.slice(0, 10) : '',
        color: cat.color || '',
        features: cat.features || '',
        allergies: cat.allergies || '',
        diseases: cat.diseases || ''
      }
    }
  }
})

async function handleSubmit() {
  submitting.value = true
  try {
    const data: any = { ...form.value }
    // 清理空字符串
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = undefined })

    // 处理头像：如果是本地blob URL，不需要在创建时发送
    if (data.avatar?.startsWith('blob:')) {
      data.avatar = undefined
    }

    let catId: string

    if (isEdit.value) {
      catId = route.params.id as string
      await catStore.updateCat(catId, data)
    } else {
      const result = await catStore.createCat(data)
      catId = result.data!.id
    }

    // 如果有头像文件需要上传
    if (avatarFile.value && catId) {
      try {
        uploadingAvatar.value = true
        await uploadCatAvatar(catId, avatarFile.value)
        toast.success('猫咪档案和头像保存成功')
      } catch (err: any) {
        console.error('头像上传失败:', err)
        toast.warning('猫咪档案已保存，但头像上传失败')
      }
    } else {
      toast.success(isEdit.value ? '猫咪档案更新成功' : '猫咪档案创建成功')
    }

    router.push('/my-cats')
  } finally {
    submitting.value = false
    uploadingAvatar.value = false
  }
}

// 获取领养状态配置
const adoptStatusConfig = ADOPT_STATUS_CONFIG
</script>

<style scoped>
.cat-form-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 700;
}

.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  padding: 4px 0;
}

.cat-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.form-section h2 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.avatar-preview:hover {
  transform: scale(1.05);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 32px;
  color: #999;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-info {
  flex: 1;
}

.avatar-title {
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.avatar-hint {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #555;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #ff6b35;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.required {
  color: #e53e3e;
}

.field-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
</style>

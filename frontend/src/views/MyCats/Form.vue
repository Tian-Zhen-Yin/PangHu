<template>
  <div class="cat-form-page">
    <div class="page-header">
      <button class="btn-back" @click="$router.back()">← 返回</button>
      <h1>{{ isEdit ? '编辑猫咪档案' : '添加新猫咪' }}</h1>
    </div>

    <form class="cat-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h2>基本信息</h2>

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

        <div class="form-row">
          <div class="form-group">
            <label>出生日期 <span class="required">*</span></label>
            <input v-model="form.birthDate" type="date" required />
          </div>

          <div class="form-group">
            <label>领养日期</label>
            <input v-model="form.adoptDate" type="date" />
          </div>
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
import { useMyCatStore } from '../../stores/myCat'
import { getMyCatById } from '../../api/myCat'
import type { CatFormData } from '../../types/cat'

const route = useRoute()
const router = useRouter()
const catStore = useMyCatStore()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)

const form = ref<CatFormData & { neuteredDate?: string }>({
  name: '',
  gender: 'unknown',
  birthDate: '',
  breed: '',
  adoptDate: '',
  weight: undefined,
  isNeutered: false,
  neuteredDate: '',
  color: '',
  features: '',
  allergies: '',
  diseases: ''
})

onMounted(async () => {
  if (isEdit.value) {
    const res = await getMyCatById(route.params.id as string)
    if (res.success) {
      const cat = res.data
      form.value = {
        name: cat.name,
        gender: cat.gender,
        birthDate: cat.birthDate.split('T')[0],
        breed: cat.breed || '',
        adoptDate: cat.adoptDate ? cat.adoptDate.split('T')[0] : '',
        weight: cat.weight || undefined,
        isNeutered: cat.isNeutered,
        neuteredDate: cat.neuteredDate ? cat.neuteredDate.split('T')[0] : '',
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

    if (isEdit.value) {
      await catStore.updateCat(route.params.id as string, data)
    } else {
      await catStore.createCat(data)
    }
    router.push('/my-cats')
  } finally {
    submitting.value = false
  }
}
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

<template>
  <div class="vaccines-page">
    <div class="page-header">
      <button class="btn-back" @click="$router.back()">← 返回</button>
      <h1>{{ catName }} · 疫苗记录</h1>
      <button class="btn-primary" @click="showForm = true">＋ 添加记录</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="vaccines.length === 0" class="empty-state">
      <div class="empty-icon">💉</div>
      <p>暂无疫苗记录</p>
    </div>

    <div v-else class="vaccine-timeline">
      <div v-for="vaccine in vaccines" :key="vaccine.id" class="vaccine-item">
        <div class="timeline-dot" :class="{ upcoming: isUpcoming(vaccine.nextDueDate) }"></div>
        <div class="vaccine-card">
          <div class="vaccine-header">
            <span class="vaccine-name">{{ vaccine.vaccineName }}</span>
            <span class="vaccine-type">{{ vaccine.vaccineType }}</span>
          </div>
          <div class="vaccine-date">接种日期：{{ formatDate(vaccine.vaccinatedAt) }}</div>
          <div v-if="vaccine.nextDueDate" class="vaccine-next" :class="{ urgent: isUpcoming(vaccine.nextDueDate) }">
            下次接种：{{ formatDate(vaccine.nextDueDate) }}
            <span v-if="isUpcoming(vaccine.nextDueDate)" class="badge-urgent">即将到期</span>
          </div>
          <div v-if="vaccine.clinic" class="vaccine-clinic">诊所：{{ vaccine.clinic }}</div>
          <div v-if="vaccine.notes" class="vaccine-notes">{{ vaccine.notes }}</div>
          <div class="vaccine-actions">
            <button class="btn-sm" @click="handleEdit(vaccine)">编辑</button>
            <button class="btn-sm danger" @click="handleDelete(vaccine.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑表单弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ editingId ? '编辑疫苗记录' : '添加疫苗记录' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>疫苗名称 <span class="required">*</span></label>
            <input v-model="form.vaccineName" type="text" placeholder="如：猫三联、狂犬疫苗" required />
          </div>
          <div class="form-group">
            <label>疫苗类型</label>
            <input v-model="form.vaccineType" type="text" placeholder="综合疫苗" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>接种日期 <span class="required">*</span></label>
              <input v-model="form.vaccinatedAt" type="date" required />
            </div>
            <div class="form-group">
              <label>下次接种日期</label>
              <input v-model="form.nextDueDate" type="date" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>接种诊所</label>
              <input v-model="form.clinic" type="text" />
            </div>
            <div class="form-group">
              <label>接种医生</label>
              <input v-model="form.veterinarian" type="text" />
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="form.notes" rows="2"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeForm">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getVaccinesByCat, createVaccine, updateVaccine, deleteVaccine } from '../../api/vaccine'
import { getMyCatById } from '../../api/myCat'
import type { VaccineRecord } from '../../types/cat'

const route = useRoute()
const catId = route.params.id as string

const vaccines = ref<VaccineRecord[]>([])
const loading = ref(false)
const showForm = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)
const catName = ref('')

const emptyForm = () => ({
  vaccineName: '',
  vaccineType: '综合疫苗',
  vaccinatedAt: '',
  nextDueDate: '',
  clinic: '',
  veterinarian: '',
  notes: ''
})

const form = ref(emptyForm())

onMounted(async () => {
  loading.value = true
  const [catRes, vaccineRes] = await Promise.all([
    getMyCatById(catId),
    getVaccinesByCat(catId)
  ])
  if (catRes.success) catName.value = catRes.data.name
  if (vaccineRes.success) vaccines.value = vaccineRes.data
  loading.value = false
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function isUpcoming(nextDueDate: string | null) {
  if (!nextDueDate) return false
  const diff = new Date(nextDueDate).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function handleEdit(vaccine: VaccineRecord) {
  editingId.value = vaccine.id
  form.value = {
    vaccineName: vaccine.vaccineName,
    vaccineType: vaccine.vaccineType,
    vaccinatedAt: vaccine.vaccinatedAt.split('T')[0],
    nextDueDate: vaccine.nextDueDate ? vaccine.nextDueDate.split('T')[0] : '',
    clinic: vaccine.clinic || '',
    veterinarian: vaccine.veterinarian || '',
    notes: vaccine.notes || ''
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
}

async function handleSubmit() {
  submitting.value = true
  try {
    const data: any = { ...form.value, catId }
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = undefined })

    if (editingId.value) {
      const res = await updateVaccine(editingId.value, data)
      if (res.success) {
        const idx = vaccines.value.findIndex(v => v.id === editingId.value)
        if (idx !== -1) vaccines.value[idx] = res.data
      }
    } else {
      const res = await createVaccine(data)
      if (res.success) vaccines.value.unshift(res.data)
    }
    closeForm()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('确定删除这条疫苗记录吗？')) return
  const res = await deleteVaccine(id)
  if (res.success) vaccines.value = vaccines.value.filter(v => v.id !== id)
}
</script>

<style scoped>
.vaccines-page {
  max-width: 700px;
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
  font-size: 18px;
  font-weight: 700;
  flex: 1;
}

.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 14px;
}

.loading, .empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.vaccine-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 20px;
  border-left: 2px solid #f0f0f0;
}

.vaccine-item {
  position: relative;
  padding-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -27px;
  top: 8px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ddd;
  border: 2px solid white;
}

.timeline-dot.upcoming {
  background: #ff6b35;
}

.vaccine-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 14px 16px;
}

.vaccine-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.vaccine-name {
  font-weight: 600;
  font-size: 15px;
}

.vaccine-type {
  font-size: 11px;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
  color: #666;
}

.vaccine-date, .vaccine-clinic {
  font-size: 13px;
  color: #666;
  margin: 3px 0;
}

.vaccine-next {
  font-size: 13px;
  color: #666;
  margin: 3px 0;
}

.vaccine-next.urgent {
  color: #ff6b35;
}

.badge-urgent {
  background: #fff0e8;
  color: #ff6b35;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
}

.vaccine-notes {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.vaccine-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.btn-sm {
  background: #f5f5f5;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-sm.danger:hover {
  background: #ffe0e0;
  color: #e53e3e;
}

.btn-primary {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background: #f5f5f5;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #555;
  margin-bottom: 4px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #ff6b35;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

.required {
  color: #e53e3e;
}
</style>

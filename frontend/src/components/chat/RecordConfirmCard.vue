<script setup lang="ts">
/**
 * 通用录入确认卡片
 *
 * 处理成长记录 / 疫苗记录 / 体重记录三类写入工具的确认。
 * 后端推送 pending_confirmation（含 toolName + draft）时渲染此卡片。
 * 用户确认后调用 POST /api/chat/confirm。
 */
import { ref, computed } from 'vue'
import { confirmAction } from '../../api/chat.js'
import { getImageUrl } from '../../utils/format.js'
import { useChatStore } from '../../stores/chat.js'
import type { PendingConfirmation } from '../../types/chat.js'

const chatStore = useChatStore()

const props = defineProps<{
  confirmation: PendingConfirmation
}>()

const emit = defineEmits<{
  (e: 'resolved'): void
}>()

type Status = 'idle' | 'submitting' | 'success' | 'error'
const status = ref<Status>('idle')
const errorMsg = ref('')

const toolName = computed(() => props.confirmation.toolName)
const draft = computed<any>(() => props.confirmation.draft || {})

const config = computed(() => {
  switch (toolName.value) {
    case 'ADD_growth_record':
      return { icon: '📖', title: '保存成长记录' }
    case 'ADD_vaccine_record':
      return { icon: '💉', title: '登记疫苗记录' }
    case 'ADD_weight_record':
      return { icon: '⚖️', title: '记录体重' }
    default:
      return { icon: '📝', title: '确认记录' }
  }
})

// 各类型表单字段
const notes = ref<string>(draft.value.notes || draft.value.userMessage || '')
const weight = ref<string>(draft.value.weight != null ? String(draft.value.weight) : '')
const vaccineName = ref<string>(draft.value.vaccineName || '')
const photos = computed<string[]>(() => (Array.isArray(draft.value.photos) ? draft.value.photos : []))

function resolveUrl(url: string): string {
  if (!url || url.startsWith('blob:')) return url
  return getImageUrl(url)
}

const canSubmit = computed(() => {
  if (status.value !== 'idle') return false
  if (toolName.value === 'ADD_weight_record') return weight.value.trim().length > 0
  if (toolName.value === 'ADD_vaccine_record') return vaccineName.value.trim().length > 0
  return notes.value.trim().length > 0 || photos.value.length > 0
})

function buildEdits(): Record<string, unknown> {
  if (toolName.value === 'ADD_weight_record') {
    return { weight: parseFloat(weight.value), notes: notes.value.trim() || undefined }
  }
  if (toolName.value === 'ADD_vaccine_record') {
    return { vaccineName: vaccineName.value.trim(), notes: notes.value.trim() || undefined }
  }
  // 成长记录
  return {
    notes: notes.value.trim(),
    photos: photos.value,
    type: draft.value.type,
    isAdoptionDay: draft.value.isAdoptionDay,
    weight: draft.value.weight,
  }
}

async function onConfirm() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  errorMsg.value = ''
  try {
    const res = await confirmAction({
      confirmationId: props.confirmation.confirmationId,
      action: 'confirm',
      edits: buildEdits(),
    })
    if (res.success && res.data?.success !== false) {
      status.value = 'success'
      const okMsg = (res.data && res.data.message) || res.message || '已为你记录好啦'
      chatStore.appendRecordSuccessMessage(toolName.value, okMsg + ' 🐾', res.data?.record)
      emit('resolved')
    } else {
      status.value = 'error'
      errorMsg.value = res.message || (res.data && res.data.message) || '确认失败'
    }
  } catch (err: any) {
    status.value = 'error'
    errorMsg.value = err.message || '网络错误'
  }
}

async function onCancel() {
  if (status.value === 'submitting') return
  status.value = 'submitting'
  try {
    await confirmAction({
      confirmationId: props.confirmation.confirmationId,
      action: 'cancel',
    })
    status.value = 'idle'
    emit('resolved')
  } catch {
    emit('resolved')
  }
}
</script>

<template>
  <div class="record-confirm-card">
    <div v-if="status === 'success'" class="confirm-success">
      <span class="success-icon">✅</span>
      <span class="success-text">{{ config.title }}成功</span>
    </div>

    <div v-else class="confirm-form">
      <div class="confirm-header">
        <span class="confirm-icon">{{ config.icon }}</span>
        <span class="confirm-title">{{ config.title }}</span>
        <span class="confirm-hint">{{ confirmation.message }}</span>
      </div>

      <!-- 图片预览（成长记录） -->
      <div v-if="photos.length > 0" class="photo-preview">
        <img
          v-for="(p, idx) in photos"
          :key="idx"
          :src="resolveUrl(p)"
          class="photo-thumb"
          alt="待保存照片"
        />
      </div>

      <!-- 疫苗名称 -->
      <div v-if="toolName === 'ADD_vaccine_record'" class="form-field">
        <label class="field-label">疫苗名称 <span class="required">*</span></label>
        <input
          v-model="vaccineName"
          class="field-input"
          placeholder="如：妙三多、狂犬疫苗..."
          :disabled="status === 'submitting'"
        />
      </div>

      <!-- 体重 -->
      <div v-if="toolName === 'ADD_weight_record'" class="form-field">
        <label class="field-label">体重 (kg) <span class="required">*</span></label>
        <input
          v-model="weight"
          type="number"
          step="0.1"
          class="field-input"
          placeholder="如：4.2"
          :disabled="status === 'submitting'"
        />
      </div>

      <!-- 描述/备注 -->
      <div class="form-field">
        <label class="field-label">
          {{ toolName === 'ADD_growth_record' ? '记录描述' : '备注（可选）' }}
          <span v-if="toolName === 'ADD_growth_record' && photos.length === 0" class="required">*</span>
        </label>
        <textarea
          v-model="notes"
          class="field-input field-textarea"
          rows="2"
          placeholder="补充描述..."
          :disabled="status === 'submitting'"
        ></textarea>
      </div>

      <div v-if="status === 'error'" class="confirm-error">⚠️ {{ errorMsg }}</div>

      <div class="confirm-actions">
        <button class="action-btn cancel" :disabled="status === 'submitting'" @click="onCancel">取消</button>
        <button class="action-btn confirm" :disabled="!canSubmit" @click="onConfirm">
          {{ status === 'submitting' ? '保存中...' : '确认保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-confirm-card {
  margin: 12px 18px;
  background: linear-gradient(135deg, #FFFEF8 0%, #FFF8E7 100%);
  border: 1px solid rgba(255, 228, 181, 0.5);
  border-radius: 12px;
  padding: 14px 16px;
}
.confirm-success {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
}
.success-icon { font-size: 18px }
.success-text { font-size: 13px; font-weight: 600; color: #4CAF50 }
.confirm-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.confirm-icon { font-size: 15px }
.confirm-title { font-size: 14px; font-weight: 700; color: #5D4E37 }
.confirm-hint { font-size: 11px; color: #BC8F6F; margin-left: auto }
.photo-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.photo-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}
.form-field { margin-bottom: 10px }
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #8B7355;
  margin-bottom: 4px;
}
.required { color: #E53935 }
.field-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid rgba(255, 228, 181, 0.5);
  border-radius: 6px;
  background: rgba(255, 251, 240, 0.6);
  font-size: 13px;
  color: #5D4E37;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.field-textarea { resize: vertical; font-family: inherit }
.field-input:focus { border-color: #E8924A }
.field-input:disabled { opacity: 0.6 }
.confirm-error { font-size: 12px; color: #E53935; margin-bottom: 8px }
.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
.action-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn.cancel { background: transparent; color: #BC8F6F }
.action-btn.cancel:hover { background: rgba(255, 228, 181, 0.2) }
.action-btn.confirm {
  background: linear-gradient(135deg, #E8924A 0%, #D4A574 100%);
  color: white;
}
.action-btn.confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(232, 146, 74, 0.3);
}
.action-btn.confirm:disabled { opacity: 0.5; cursor: not-allowed }
</style>

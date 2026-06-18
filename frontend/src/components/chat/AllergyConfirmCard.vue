<script setup lang="ts">
/**
 * 过敏录入确认卡片
 *
 * 当 Agent 遇到 ADD_allergy_record（requiresConfirmation）时，
 * 后端推送 pending_confirmation 事件，前端渲染此卡片。
 *
 * 用户填写过敏信息后点确认 → 调用 POST /api/chat/confirm。
 */
import { ref, computed } from 'vue'
import { confirmAction } from '../../api/chat.js'
import type { PendingConfirmation } from '../../types/chat.js'

const props = defineProps<{
  confirmation: PendingConfirmation
}>()

const emit = defineEmits<{
  (e: 'resolved'): void
}>()

type Status = 'idle' | 'submitting' | 'success' | 'error'
const status = ref<Status>('idle')
const errorMsg = ref('')

// 表单数据
const allergen = ref('')
const symptoms = ref('')
const severity = ref<'mild' | 'moderate' | 'severe'>('moderate')
const notes = ref('')

const severityLabel: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
}

const canSubmit = computed(() => {
  return allergen.value.trim().length > 0 && status.value === 'idle'
})

async function onConfirm() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  errorMsg.value = ''

  try {
    const res = await confirmAction({
      confirmationId: props.confirmation.confirmationId,
      action: 'confirm',
      edits: {
        allergen: allergen.value.trim(),
        symptoms: symptoms.value.trim() || '未描述',
        severity: severity.value,
        notes: notes.value.trim() || undefined,
      },
    })
    if (res.success) {
      status.value = 'success'
      emit('resolved')
    } else {
      status.value = 'error'
      errorMsg.value = res.message || '确认失败'
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
  <div class="allergy-confirm-card">
    <!-- 成功状态 -->
    <div v-if="status === 'success'" class="confirm-success">
      <span class="success-icon">✅</span>
      <span class="success-text">过敏记录已保存</span>
    </div>

    <!-- 表单状态 -->
    <div v-else class="confirm-form">
      <div class="confirm-header">
        <span class="confirm-icon">📝</span>
        <span class="confirm-title">记录过敏事件</span>
        <span class="confirm-hint">{{ confirmation.message }}</span>
      </div>

      <div class="form-field">
        <label class="field-label">过敏原 <span class="required">*</span></label>
        <input
          v-model="allergen"
          class="field-input"
          placeholder="如：鸡肝、鱼粮、跳蚤..."
          :disabled="status === 'submitting'"
        />
      </div>

      <div class="form-field">
        <label class="field-label">症状描述</label>
        <input
          v-model="symptoms"
          class="field-input"
          placeholder="如：皮肤红斑、呕吐、抓挠..."
          :disabled="status === 'submitting'"
        />
      </div>

      <div class="form-field">
        <label class="field-label">严重程度</label>
        <div class="severity-options">
          <button
            v-for="(label, key) in severityLabel"
            :key="key"
            :class="['severity-btn', severity === key ? 'active' : '']"
            :disabled="status === 'submitting'"
            @click="severity = key as any"
          >{{ label }}</button>
        </div>
      </div>

      <div class="form-field">
        <label class="field-label">备注（可选）</label>
        <input
          v-model="notes"
          class="field-input"
          placeholder="其他需要记录的信息"
          :disabled="status === 'submitting'"
        />
      </div>

      <div v-if="status === 'error'" class="confirm-error">
        ⚠️ {{ errorMsg }}
      </div>

      <div class="confirm-actions">
        <button
          class="action-btn cancel"
          :disabled="status === 'submitting'"
          @click="onCancel"
        >取消</button>
        <button
          class="action-btn confirm"
          :disabled="!canSubmit"
          @click="onConfirm"
        >{{ status === 'submitting' ? '保存中...' : '确认记录' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.allergy-confirm-card {
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
.success-text {
  font-size: 13px;
  font-weight: 600;
  color: #4CAF50;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.confirm-icon { font-size: 15px }
.confirm-title {
  font-size: 14px;
  font-weight: 700;
  color: #5D4E37;
}
.confirm-hint {
  font-size: 11px;
  color: #BC8F6F;
  margin-left: auto;
}

.form-field {
  margin-bottom: 10px;
}
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
.field-input:focus {
  border-color: #E8924A;
}
.field-input:disabled {
  opacity: 0.6;
}

.severity-options {
  display: flex;
  gap: 6px;
}
.severity-btn {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(255, 228, 181, 0.5);
  border-radius: 6px;
  background: rgba(255, 251, 240, 0.6);
  font-size: 12px;
  color: #8B7355;
  cursor: pointer;
  transition: all 0.2s;
}
.severity-btn.active {
  background: linear-gradient(135deg, #FFECC8 0%, #FFE5B4 100%);
  border-color: #E8924A;
  color: #5D4E37;
  font-weight: 600;
}
.severity-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-error {
  font-size: 12px;
  color: #E53935;
  margin-bottom: 8px;
}

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
.action-btn.cancel {
  background: transparent;
  color: #BC8F6F;
}
.action-btn.cancel:hover {
  background: rgba(255, 228, 181, 0.2);
}
.action-btn.confirm {
  background: linear-gradient(135deg, #E8924A 0%, #D4A574 100%);
  color: white;
}
.action-btn.confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(232, 146, 74, 0.3);
}
.action-btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

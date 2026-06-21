<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadChatImages } from '../../api/chat.js'
import { getImageUrl } from '../../utils/format.js'

interface Props {
  disabled?: boolean
  placeholder?: string
}

interface Emits {
  (e: 'send', content: string, attachments: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '请输入您的问题...'
})

const emit = defineEmits<Emits>()

const input = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const content = ref('')
const isFocused = ref(false)

interface PendingImage {
  url: string
  uploading: boolean
}
const images = ref<PendingImage[]>([])
const MAX_IMAGES = 9

// 自动调整高度
function adjustHeight() {
  if (input.value) {
    input.value.style.height = 'auto'
    const newHeight = Math.min(input.value.scrollHeight, 200)
    input.value.style.height = newHeight + 'px'
  }
}

watch(content, () => {
  adjustHeight()
})

function triggerFilePick() {
  if (props.disabled) return
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (files.length === 0) return

  const remaining = MAX_IMAGES - images.value.length
  if (remaining <= 0) {
    ElMessage.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    target.value = ''
    return
  }
  const toUpload = files.slice(0, remaining)

  const placeholders: PendingImage[] = toUpload.map((f) => ({
    url: URL.createObjectURL(f),
    uploading: true,
  }))
  images.value.push(...placeholders)

  try {
    const res = await uploadChatImages(toUpload)
    const urls = res.data?.urls || []
    placeholders.forEach((p, i) => {
      if (urls[i]) {
        p.url = urls[i]
        p.uploading = false
      }
    })
    images.value = images.value.filter((img) => !img.uploading || urls.length > 0)
  } catch (err: any) {
    ElMessage.error('图片上传失败，请重试')
    images.value = images.value.filter((img) => !placeholders.includes(img))
  } finally {
    target.value = ''
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

function resolveUrl(url: string): string {
  if (!url || url.startsWith('blob:')) return url
  return getImageUrl(url)
}

// 处理发送
function handleSend() {
  const trimmed = content.value.trim()
  const uploaded = images.value.filter((img) => !img.uploading).map((img) => img.url)
  if (images.value.some((img) => img.uploading)) {
    ElMessage.warning('图片还在上传中，请稍候')
    return
  }
  if ((trimmed || uploaded.length > 0) && !props.disabled) {
    emit('send', trimmed || '记录一下', uploaded)
    content.value = ''
    images.value = []
    if (input.value) {
      input.value.style.height = 'auto'
    }
  }
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// 聚焦输入框
function focus() {
  input.value?.focus()
}

defineExpose({
  focus
})
</script>

<template>
  <div :class="['chat-input', { focused: isFocused, disabled }]">
    <div v-if="images.length > 0" class="image-preview-list">
      <div v-for="(img, index) in images" :key="index" class="image-preview">
        <img :src="resolveUrl(img.url)" class="preview-thumb" alt="待发送图片" />
        <div v-if="img.uploading" class="preview-loading">上传中…</div>
        <button class="preview-remove" @click="removeImage(index)" aria-label="移除">×</button>
      </div>
    </div>
    <div class="input-wrapper">
      <button
        :class="['upload-button', { disabled }]"
        :disabled="disabled"
        @click="triggerFilePick"
        aria-label="上传图片"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="upload-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
          <circle cx="8.5" cy="8.5" r="1.5" stroke-width="2" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15l-5-5L5 21" />
        </svg>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        class="file-input-hidden"
        @change="handleFileChange"
      />
      <textarea
        ref="input"
        v-model="content"
        class="input-textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      ></textarea>
      <button
        :class="['send-button', { disabled: (!content.trim() && images.length === 0) || disabled }]"
        :disabled="(!content.trim() && images.length === 0) || disabled"
        @click="handleSend"
        aria-label="发送"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="send-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border-radius: 20px;
  border: 2px solid #FFF5DC;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(188, 143, 111, 0.08);
}

.chat-input.focused {
  border-color: #FFE5B4;
  box-shadow: 0 4px 20px rgba(255, 228, 181, 0.18);
}

.chat-input.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 14px 12px 20px;
}

.image-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px 0 20px;
}

.image-preview {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #FFF5DC;
}

.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 10px;
}

.preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-input-hidden {
  display: none;
}

.upload-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #FFF5E6;
  color: #BC8F6F;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.upload-button:hover:not(.disabled) {
  background: #FFE5B4;
  color: #D2691E;
}

.upload-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.upload-button .upload-icon {
  width: 20px;
  height: 20px;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary, #303133);
  background: transparent;
  font-family: inherit;
  min-height: 28px;
  max-height: 200px;
}

.input-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.input-textarea:disabled {
  cursor: not-allowed;
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary-gradient);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.3);
}

.send-button:hover:not(.disabled) {
  background: var(--color-primary-gradient-hover);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.4);
}

.send-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.send-button .send-icon {
  width: 18px;
  height: 18px;
}
</style>

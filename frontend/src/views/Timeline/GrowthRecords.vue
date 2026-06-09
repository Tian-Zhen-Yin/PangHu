<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePetStore } from '../../stores/pet.js'
import { useAuthStore } from '../../stores/auth.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { storeToRefs } from 'pinia'
import { toast } from '../../composables/useToast.js'
import ImageLoader from '../../components/common/ImageLoader.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import { sectionIcons } from './composables/sectionIcons.js'
import { getImageUrl } from '../../utils/format.js'
import type { CreatePetRecordParams } from '../../api/pet.js'

const petStore = usePetStore()
const authStore = useAuthStore()
const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)

// Record modal state
const showAddRecordModal = ref(false)
const recordPhotoFiles = ref<File[]>([])
const recordPhotoPreviews = ref<string[]>([])
const recordType = ref<'daily' | 'vaccine' | 'deworm' | 'healthCheck' | 'free'>('daily')
const isAdoptionDay = ref(false)
const recordForm = ref({
  petName: '猫咪',
  ageWeeks: 0,
  ageMonths: 0,
  weight: 0,
  notes: '',
  recordDate: new Date().toISOString().slice(0, 10),
  vaccineName: '', vaccineNextDate: '', vaccineClinic: '',
  dewormDrug: '', dewormType: '体内', dewormNextDate: '',
  checkClinic: '', checkVet: '', checkFindings: ''
})

// Filter state
type RecordFilterType = 'all' | 'photos' | 'important' | 'daily'
const recordFilter = ref<RecordFilterType>('all')
const showFilterMenu = ref(false)

// Date filter state
const startDate = ref('')
const endDate = ref('')
const selectedDatePreset = ref('all')
const showDateFilterMenu = ref(false)
const today = computed(() => new Date().toISOString().slice(0, 10))

// Dropdown positioning refs
const filterTriggerRef = ref<HTMLElement | null>(null)
const dateFilterTriggerRef = ref<HTMLElement | null>(null)
const filterDropdownStyle = computed(() => {
  if (!filterTriggerRef.value) return {}
  const rect = filterTriggerRef.value.getBoundingClientRect()
  // Check if menu would overflow left edge
  const menuWidth = 280
  const wouldOverflow = rect.left < menuWidth

  // Calculate vertical position - check if menu would extend beyond viewport bottom
  const spaceBelow = window.innerHeight - rect.bottom
  const menuHeight = 300 // Estimated menu height
  const shouldPositionAbove = spaceBelow < menuHeight + 16 // 16px safety margin

  return {
    position: 'fixed',
    top: shouldPositionAbove ? 'auto' : `${rect.bottom + 8}px`,
    bottom: shouldPositionAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto',
    right: wouldOverflow ? '16px' : `${window.innerWidth - rect.right}px`,
    left: wouldOverflow ? '16px' : 'auto',
    zIndex: 1001
  }
})
const dateDropdownStyle = computed(() => {
  if (!dateFilterTriggerRef.value) return {}
  const rect = dateFilterTriggerRef.value.getBoundingClientRect()
  // Check if menu would overflow left edge
  const menuWidth = 320
  const wouldOverflow = rect.left < menuWidth

  // Calculate vertical position - check if menu would extend beyond viewport bottom
  const spaceBelow = window.innerHeight - rect.bottom
  const menuHeight = 360 // Estimated menu height (date picker is taller)
  const shouldPositionAbove = spaceBelow < menuHeight + 16 // 16px safety margin

  return {
    position: 'fixed',
    top: shouldPositionAbove ? 'auto' : `${rect.bottom + 8}px`,
    bottom: shouldPositionAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto',
    right: wouldOverflow ? '16px' : `${window.innerWidth - rect.right}px`,
    left: wouldOverflow ? '16px' : 'auto',
    zIndex: 1001
  }
})

// Close dropdowns on escape key
function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showFilterMenu.value = false
    showDateFilterMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
})

const DATE_PRESETS = [
  { key: 'all', label: '全部日期' },
  { key: '7days', label: '最近7天' },
  { key: '30days', label: '最近30天' },
  { key: '3months', label: '最近3个月' },
  { key: '6months', label: '最近6个月' },
  { key: '1year', label: '最近1年' }
]

const FILTER_CONFIG: Record<RecordFilterType, { label: string; icon: string; description: string }> = {
  all: { label: '全部记录', icon: '📋', description: '显示所有记录' },
  photos: { label: '仅照片', icon: '📷', description: '只显示有照片的记录' },
  important: { label: '重要记录', icon: '⭐', description: '纪念日、疫苗、体检等' },
  daily: { label: '日常记录', icon: '📝', description: '只显示日常记录' }
}

const RECORD_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  daily:       { label: '日常', icon: 'daily', color: '#4ade80' },
  vaccine:     { label: '疫苗', icon: 'vaccine', color: '#60a5fa' },
  deworm:      { label: '驱虫', icon: 'deworm', color: 'var(--color-primary)' },
  healthCheck: { label: '体检', icon: 'health', color: '#a78bfa' },
  free:        { label: '自由', icon: 'free', color: 'var(--color-text-placeholder)' },
}

// Computed: whether to hide age display for adopted/unknown-age cats
const shouldHideAge = computed(() => {
  if (!currentCat.value) return false
  return ['adoptedYoung', 'adoptedAdult', 'unknownAge'].includes(currentCat.value.adoptStatus)
})

const catDisplayLabel = computed(() => {
  if (!currentCat.value) return ''
  switch (currentCat.value.adoptStatus) {
    case 'adoptedYoung': return '幼年猫'
    case 'adoptedAdult': return '成年猫'
    case 'unknownAge': return '年龄不详'
    default: return ''
  }
})

// Filtered records (type + date range)
const filteredRecords = computed(() => {
  let records = petStore.sortedRecords

  switch (recordFilter.value) {
    case 'photos':
      records = records.filter(r => (r.photos && r.photos.length > 0) || r.photoUrl)
      break
    case 'important':
      records = records.filter(r => r.isAdoptionDay || ['vaccine', 'deworm', 'healthCheck'].includes(r.type))
      break
    case 'daily':
      records = records.filter(r => r.type === 'daily' || !r.type)
      break
  }

  if (startDate.value || endDate.value) {
    records = records.filter(record => {
      if (!record.recordDate) return false
      if (startDate.value && record.recordDate < startDate.value) return false
      if (endDate.value && record.recordDate > endDate.value) return false
      return true
    })
  }

  return records
})

// Records grouped by month
const filteredRecordsByMonth = computed(() => {
  const groups: { month: string; records: typeof petStore.sortedRecords }[] = []
  const map = new Map<string, typeof petStore.sortedRecords>()

  for (const r of filteredRecords.value) {
    if (!r.recordDate) continue
    const month = r.recordDate.slice(0, 7)
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(r)
  }

  map.forEach((records, month) => groups.push({ month, records }))

  return groups.sort((a, b) => b.month.localeCompare(a.month))
})

// Functions
function openAddRecordModal() {
  if (!authStore.isAuthenticated) {
    toast.warning('请先登录')
    return
  }
  recordForm.value = {
    petName: currentCat.value?.name || '猫咪',
    ageWeeks: 0, ageMonths: 0, weight: 0, notes: '',
    recordDate: new Date().toISOString().slice(0, 10),
    vaccineName: '', vaccineNextDate: '', vaccineClinic: '',
    dewormDrug: '', dewormType: '体内', dewormNextDate: '',
    checkClinic: '', checkVet: '', checkFindings: ''
  }
  recordPhotoFiles.value = []
  recordPhotoPreviews.value = []
  recordType.value = 'daily'
  isAdoptionDay.value = false
  showAddRecordModal.value = true
}

function closeAddRecordModal() {
  showAddRecordModal.value = false
  recordPhotoFiles.value = []
  recordPhotoPreviews.value = []
}

function selectDatePreset(preset: string) {
  selectedDatePreset.value = preset
  const now = new Date()
  switch (preset) {
    case 'all': startDate.value = ''; endDate.value = ''; break
    case '7days': startDate.value = fmtISO(subDays(now, 7)); endDate.value = today.value; break
    case '30days': startDate.value = fmtISO(subDays(now, 30)); endDate.value = today.value; break
    case '3months': startDate.value = fmtISO(subDays(now, 90)); endDate.value = today.value; break
    case '6months': startDate.value = fmtISO(subDays(now, 180)); endDate.value = today.value; break
    case '1year': startDate.value = fmtISO(subDays(now, 365)); endDate.value = today.value; break
  }
}

function onRecordDateChange() { selectedDatePreset.value = 'custom' }

function clearRecordDateFilter() {
  startDate.value = ''
  endDate.value = ''
  selectedDatePreset.value = 'all'
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

function fmtISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDateFilterLabel() {
  if (selectedDatePreset.value !== 'all') {
    const preset = DATE_PRESETS.find(p => p.key === selectedDatePreset.value)
    return preset?.label || '日期筛选'
  }
  if (startDate.value || endDate.value) return '自定义范围'
  return '全部日期'
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  const filterMenu = document.querySelector('.filter-dropdown-menu')
  const filterBtn = document.querySelector('.filter-trigger-btn')
  const dateFilterMenu = document.querySelector('.date-filter-dropdown')
  const dateFilterBtn = document.querySelector('.date-filter-trigger-btn')

  if (showFilterMenu.value && filterMenu && !filterMenu.contains(target) && !filterBtn?.contains(target)) {
    showFilterMenu.value = false
  }
  if (showDateFilterMenu.value && dateFilterMenu && !dateFilterMenu.contains(target) && !dateFilterBtn?.contains(target)) {
    showDateFilterMenu.value = false
  }
}

function handlePhotoSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || []).slice(0, 9 - recordPhotoPreviews.value.length)
  recordPhotoFiles.value = [...recordPhotoFiles.value, ...files]
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => recordPhotoPreviews.value.push(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}

function removePhoto(index: number) {
  recordPhotoPreviews.value.splice(index, 1)
  recordPhotoFiles.value.splice(index, 1)
}

function calculateAgeMonths(ageWeeks: number): number {
  return Math.floor(ageWeeks / 4)
}

function buildTemplateData(): string | undefined {
  const f = recordForm.value
  if (recordType.value === 'vaccine') return JSON.stringify({ vaccineName: f.vaccineName, nextDate: f.vaccineNextDate, clinic: f.vaccineClinic })
  if (recordType.value === 'deworm') return JSON.stringify({ drug: f.dewormDrug, type: f.dewormType, nextDate: f.dewormNextDate })
  if (recordType.value === 'healthCheck') return JSON.stringify({ clinic: f.checkClinic, vet: f.checkVet, findings: f.checkFindings })
  return undefined
}

async function savePetRecord() {
  const params: CreatePetRecordParams = {
    petName: recordForm.value.petName,
    ageWeeks: recordForm.value.ageWeeks,
    ageMonths: recordForm.value.ageMonths || calculateAgeMonths(recordForm.value.ageWeeks),
    weight: recordForm.value.weight,
    notes: recordForm.value.notes || undefined,
    recordDate: recordForm.value.recordDate,
    catId: currentCat.value?.id,
    type: recordType.value,
    isAdoptionDay: isAdoptionDay.value,
    templateData: buildTemplateData()
  }
  const files = recordPhotoFiles.value.length > 0 ? recordPhotoFiles.value : undefined
  const success = await petStore.createRecord(params, files)
  if (success) {
    toast.success('记录保存成功')
    closeAddRecordModal()
  } else {
    toast.error('保存失败，请重试')
  }
}

async function deletePetRecord(recordId: string) {
  if (confirm('确定要删除这条记录吗？')) {
    const success = await petStore.deleteRecord(recordId)
    if (success) toast.success('记录已删除')
  }
}
</script>

<template>
  <div class="growth-records-page">
    <div class="growth-header">
      <div class="growth-title-section">
        <h3 class="growth-title">
          <span class="icon-growth" v-html="sectionIcons.photo"></span>
          宠物成长记录
        </h3>
        <span class="record-count-badge">
          {{ filteredRecords.length }} 条记录
        </span>
      </div>
      <div class="growth-actions">
        <!-- Type filter -->
        <div class="record-filter-wrapper">
          <button
            ref="filterTriggerRef"
            class="filter-trigger-btn"
            @click="showFilterMenu = !showFilterMenu"
            :class="{ 'is-active': recordFilter !== 'all' }"
          >
            <span class="filter-icon">{{ FILTER_CONFIG[recordFilter].icon }}</span>
            <span class="filter-label">{{ FILTER_CONFIG[recordFilter].label }}</span>
            <svg class="dropdown-arrow" :class="{ 'is-open': showFilterMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <!-- Date filter -->
        <div class="date-filter-wrapper">
          <button
            ref="dateFilterTriggerRef"
            class="date-filter-trigger-btn"
            @click="showDateFilterMenu = !showDateFilterMenu"
            :class="{ 'is-active': startDate || endDate }"
          >
            <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <span class="date-filter-label">{{ getDateFilterLabel() }}</span>
            <svg class="dropdown-arrow" :class="{ 'is-open': showDateFilterMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <button @click="openAddRecordModal" class="btn-add-record">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          添加记录
        </button>
      </div>
    </div>

    <!-- 遮罩层：下拉菜单显示时显示 -->
    <transition name="overlay-fade">
      <div
        v-if="showFilterMenu || showDateFilterMenu"
        class="dropdown-overlay"
        @click="showFilterMenu = false; showDateFilterMenu = false"
      ></div>
    </transition>

    <!-- Teleport 下拉菜单 -->
    <Teleport to="body">
      <transition name="filter-dropdown">
        <div v-show="showFilterMenu" class="filter-dropdown-menu" :style="filterDropdownStyle">
          <div class="filter-menu-header">
            <span>筛选记录</span>
            <button @click="showFilterMenu = false" class="close-btn">×</button>
          </div>
          <div class="filter-options">
            <button
              v-for="(config, key) in FILTER_CONFIG"
              :key="key"
              class="filter-option"
              :class="{ 'is-selected': recordFilter === key }"
              @click="recordFilter = key as RecordFilterType; showFilterMenu = false"
            >
              <span class="option-icon">{{ config.icon }}</span>
              <div class="option-content">
                <span class="option-label">{{ config.label }}</span>
                <span class="option-description">{{ config.description }}</span>
              </div>
              <span v-if="recordFilter === key" class="option-check">✓</span>
            </button>
          </div>
        </div>
      </transition>

      <transition name="filter-dropdown">
        <div v-show="showDateFilterMenu" class="date-filter-dropdown" :style="dateDropdownStyle">
          <div class="filter-menu-header">
            <span>日期筛选</span>
            <button @click="showDateFilterMenu = false" class="close-btn">×</button>
          </div>

          <div class="date-presets">
            <button
              v-for="preset in DATE_PRESETS"
              :key="preset.key"
              class="date-preset-btn"
              :class="{ 'is-selected': selectedDatePreset === preset.key }"
              @click="selectDatePreset(preset.key)"
            >
              {{ preset.label }}
            </button>
          </div>

          <div class="date-range-section">
            <div class="date-range-inputs">
              <div class="date-input-group">
                <label>开始日期</label>
                <input v-model="startDate" type="date" class="date-input" :max="endDate || today" @change="onRecordDateChange" />
              </div>
              <span class="date-separator">至</span>
              <div class="date-input-group">
                <label>结束日期</label>
                <input v-model="endDate" type="date" class="date-input" :min="startDate" :max="today" @change="onRecordDateChange" />
              </div>
            </div>
            <button v-if="startDate || endDate" @click="clearRecordDateFilter" class="btn-clear-date">
              清除筛选
            </button>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Login prompt -->
    <div v-if="!authStore.isAuthenticated" class="login-prompt">
      <p>请先登录以使用宠物成长记录功能</p>
      <button @click="$router.push('/login')" class="btn-login">去登录</button>
    </div>

    <!-- Loading state -->
    <div v-else-if="petStore.loading" class="loading-records">
      <MascotCharacter expression="waiting" size="medium" :animated="false" />
      <p class="loading-text">正在加载成长记录...</p>
    </div>

    <!-- Records timeline -->
    <div v-else-if="filteredRecords.length > 0" class="records-timeline">
      <transition-group name="record-list" tag="div">
        <template v-for="group in filteredRecordsByMonth" :key="group.month">
          <div :class="['month-group', `month-${group.month}`]">
            <div class="month-divider">
              {{ group.month.replace('-', '年') }}月
              <span class="month-count">({{ group.records.length }})</span>
            </div>
            <transition-group name="record-item" tag="div" class="month-records">
              <div
                v-for="record in group.records"
                :key="record.id"
                :class="['record-item', { 'is-adoption-day': record.isAdoptionDay }]"
              >
                <div class="record-date" v-if="record.recordDate">
                  <span class="record-day">{{ new Date(record.recordDate).getDate() }}</span>
                  <span class="record-month">{{ new Date(record.recordDate).toLocaleDateString('zh-CN', { month: 'short' }) }}</span>
                </div>
                <div class="record-content">
                  <div v-if="record.photos && record.photos.length > 0" class="record-photos">
                    <div class="record-photo-main">
                      <ImageLoader :src="getImageUrl(record.photos[0])" :alt="record.petName" fit="cover" />
                      <span v-if="record.photos.length > 1" class="photo-count-badge">+{{ record.photos.length - 1 }}</span>
                    </div>
                  </div>
                  <div v-else-if="record.photoUrl" class="record-photos">
                    <div class="record-photo-main">
                      <ImageLoader :src="getImageUrl(record.photoUrl)" :alt="record.petName" fit="cover" />
                    </div>
                  </div>
                  <div class="record-info">
                    <div class="record-header">
                      <div style="display:flex;align-items:center;gap:0.5rem">
                        <h4 class="record-pet-name">{{ record.petName }}</h4>
                        <span
                          v-if="record.type && RECORD_TYPE_CONFIG[record.type]"
                          class="type-badge"
                          :style="{ background: RECORD_TYPE_CONFIG[record.type]!.color + '22', color: RECORD_TYPE_CONFIG[record.type]!.color }"
                        >
                          <span class="type-icon" v-html="sectionIcons[RECORD_TYPE_CONFIG[record.type]?.icon as keyof typeof sectionIcons] || sectionIcons.daily"></span>
                          {{ RECORD_TYPE_CONFIG[record.type]!.label }}
                        </span>
                        <span v-if="record.isAdoptionDay" class="adoption-badge">
                          <span class="badge-icon" v-html="sectionIcons.celebration"></span>
                          领养纪念日
                        </span>
                      </div>
                      <button @click="deletePetRecord(record.id)" class="btn-delete-record" title="删除记录">×</button>
                    </div>
                    <div class="record-stats">
                      <span v-if="!shouldHideAge && record.ageMonths" class="record-stat">
                        <span class="icon-stat" v-html="sectionIcons.date"></span>
                        {{ record.ageMonths }}个月 ({{ record.ageWeeks }}周)
                      </span>
                      <span v-else-if="shouldHideAge && catDisplayLabel" class="record-stat">
                        <span class="icon-stat" v-html="sectionIcons.date"></span>
                        {{ catDisplayLabel }}
                      </span>
                      <span v-if="record.weight" class="record-stat">⚖️ {{ record.weight }}kg</span>
                    </div>
                    <p v-if="record.notes" class="record-notes">{{ record.notes }}</p>
                  </div>
                </div>
              </div>
            </transition-group>
          </div>
        </template>
      </transition-group>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-records">
      <MascotCharacter expression="confused" size="medium" :animated="false" />
      <p class="empty-text">
        {{ recordFilter === 'all' ? '还没有成长记录' : '没有符合条件的记录' }}
      </p>
      <p class="empty-hint">
        {{ recordFilter === 'all' ? '记录宠物的成长瞬间，留下美好回忆' : '试试切换其他筛选条件' }}
      </p>
      <button v-if="recordFilter !== 'all'" @click="recordFilter = 'all'" class="btn-reset-filter">
        显示全部记录
      </button>
      <button v-else @click="openAddRecordModal" class="btn-add-first-record">
        添加第一条记录
      </button>
    </div>

    <!-- Add record modal -->
    <div v-if="showAddRecordModal" class="modal-overlay" @click="closeAddRecordModal">
      <div class="modal-content record-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">添加成长记录</h3>
          <button @click="closeAddRecordModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <!-- Record type tabs -->
          <div class="record-type-tabs">
            <button
              :class="['type-capsule', { 'is-active': recordType === 'daily' }]"
              @click="recordType = 'daily'"
            >
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              日常
            </button>
            <button
              :class="['type-capsule', { 'is-active': recordType === 'vaccine' }]"
              @click="recordType = 'vaccine'"
            >
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              疫苗
            </button>
            <button
              :class="['type-capsule', { 'is-active': recordType === 'deworm' }]"
              @click="recordType = 'deworm'"
            >
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              驱虫
            </button>
            <button
              :class="['type-capsule', { 'is-active': recordType === 'healthCheck' }]"
              @click="recordType = 'healthCheck'"
            >
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              体检
            </button>
            <button
              :class="['type-capsule', { 'is-active': recordType === 'free' }]"
              @click="recordType = 'free'"
            >
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              自由
            </button>
          </div>

          <!-- Cream form -->
          <div class="cream-form">
            <div class="form-row">
              <div class="form-item half">
                <label class="cream-label">宠物名称</label>
                <input v-model="recordForm.petName" type="text" class="cream-input" placeholder="猫咪" readonly />
              </div>
              <div class="form-item half">
                <label class="cream-label">记录日期</label>
                <input v-model="recordForm.recordDate" type="date" class="cream-input" />
              </div>
            </div>

            <!-- daily fields -->
            <template v-if="recordType === 'daily'">
              <div class="form-row">
                <div class="form-item half" v-if="!shouldHideAge">
                  <label class="cream-label">年龄（周）</label>
                  <div class="input-with-unit">
                    <input v-model.number="recordForm.ageWeeks" type="number" min="0" class="cream-input" placeholder="0" />
                    <span class="unit">Weeks</span>
                  </div>
                </div>
                <div class="form-item half" :class="{ 'full-width': shouldHideAge }">
                  <label class="cream-label">体重（kg）</label>
                  <div class="input-with-unit">
                    <input v-model.number="recordForm.weight" type="number" min="0" step="0.1" class="cream-input" placeholder="0.0" />
                    <span class="unit">kg</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- vaccine fields -->
            <template v-else-if="recordType === 'vaccine'">
              <div class="form-item full">
                <label class="cream-label">疫苗名称 *</label>
                <input v-model="recordForm.vaccineName" type="text" class="cream-input" placeholder="如：猫三联" />
              </div>
              <div class="form-row">
                <div class="form-item half">
                  <label class="cream-label">下次接种日期</label>
                  <input v-model="recordForm.vaccineNextDate" type="date" class="cream-input" />
                </div>
                <div class="form-item half">
                  <label class="cream-label">接种医院</label>
                  <input v-model="recordForm.vaccineClinic" type="text" class="cream-input" placeholder="医院名称" />
                </div>
              </div>
            </template>

            <!-- deworm fields -->
            <template v-else-if="recordType === 'deworm'">
              <div class="form-row">
                <div class="form-item half">
                  <label class="cream-label">药品名称 *</label>
                  <input v-model="recordForm.dewormDrug" type="text" class="cream-input" placeholder="如：拜宠清" />
                </div>
                <div class="form-item half">
                  <label class="cream-label">类型</label>
                  <select v-model="recordForm.dewormType" class="cream-input cream-select">
                    <option>体内</option>
                    <option>体外</option>
                    <option>体内+体外</option>
                  </select>
                </div>
              </div>
              <div class="form-item full">
                <label class="cream-label">下次驱虫日期</label>
                <input v-model="recordForm.dewormNextDate" type="date" class="cream-input" />
              </div>
            </template>

            <!-- healthCheck fields -->
            <template v-else-if="recordType === 'healthCheck'">
              <div class="form-row">
                <div class="form-item half">
                  <label class="cream-label">医院</label>
                  <input v-model="recordForm.checkClinic" type="text" class="cream-input" placeholder="医院名称" />
                </div>
                <div class="form-item half">
                  <label class="cream-label">医生</label>
                  <input v-model="recordForm.checkVet" type="text" class="cream-input" placeholder="医生姓名" />
                </div>
              </div>
              <div class="form-item full">
                <label class="cream-label">检查结果/建议</label>
                <textarea v-model="recordForm.checkFindings" class="cream-textarea" rows="3" placeholder="检查结果或医生建议..."></textarea>
              </div>
            </template>

            <!-- Notes (all types) -->
            <div class="form-item full">
              <label class="cream-label">备注</label>
              <textarea v-model="recordForm.notes" class="cream-textarea" rows="3" :placeholder="`想写下${currentCat?.name || '小猫咪'}今天的顽皮瞬间吗？喵~`"></textarea>
            </div>

            <!-- Photo upload -->
            <div class="form-item full">
              <div class="photo-upload-header">
                <label class="cream-label">照片</label>
                <span class="photo-count">{{ recordPhotoPreviews.length }}/9</span>
              </div>
              <div class="premium-photo-area">
                <div v-for="(preview, i) in recordPhotoPreviews" :key="i" class="photo-thumb-new">
                  <img :src="preview" alt="预览" />
                  <button @click="removePhoto(i)" class="photo-remove">×</button>
                </div>
                <label v-if="recordPhotoPreviews.length < 9" class="photo-upload-trigger">
                  <input type="file" accept="image/*" multiple @change="handlePhotoSelect" class="hidden-input" />
                  <MascotCharacter expression="waiting" size="small" :animated="false" />
                  <span>添加瞬间</span>
                </label>
              </div>
            </div>

            <!-- Adoption day checkbox -->
            <div v-if="currentCat?.adoptDate" class="form-item full adoption-check">
              <label class="cream-checkbox">
                <input type="checkbox" v-model="isAdoptionDay" />
                <span class="checkbox-mark"></span>
                <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                标记为领养纪念日
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAddRecordModal" class="btn-cancel">取消</button>
          <button @click="savePetRecord" class="btn-save">保存记录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.growth-records-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ========== Dropdown Overlay ========== */
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* ========== Growth Header ========== */
.growth-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.growth-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.growth-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.record-count-badge {
  padding: 0.25rem 0.75rem;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.growth-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ========== Type Filter ========== */
.record-filter-wrapper {
  position: relative;
}

.filter-trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-trigger-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary);
}

.filter-trigger-btn.is-active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-icon { font-size: 1rem; }

.filter-label {
  font-size: 0.875rem;
  white-space: nowrap;
}

.dropdown-arrow {
  width: 1rem;
  height: 1rem;
  transition: transform 0.3s ease;
}

.dropdown-arrow.is-open { transform: rotate(180deg); }

.filter-dropdown-menu {
  min-width: 280px;
  max-width: calc(100vw - 32px);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.filter-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-light);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.filter-options { padding: 0.5rem; }

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: transparent;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.filter-option:hover { background: var(--color-bg-hover); }
.filter-option.is-selected { background: var(--color-primary-light); }

.option-icon { font-size: 1.25rem; flex-shrink: 0; }

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label { font-size: 0.875rem; font-weight: 500; color: var(--color-text-primary); }
.option-description { font-size: 0.75rem; color: var(--color-text-secondary); }
.option-check { color: var(--color-primary); font-weight: 600; }

.filter-dropdown-enter-active,
.filter-dropdown-leave-active { transition: all 0.2s ease; }

.filter-dropdown-enter-from,
.filter-dropdown-leave-to { opacity: 0; transform: translateY(-8px); }

/* ========== Date Filter ========== */
.date-filter-wrapper { position: relative; }

.date-filter-trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.date-filter-trigger-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary-medium);
}

.date-filter-trigger-btn.is-active {
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border-color: var(--color-primary-medium);
  color: #7C2D12;
}

.calendar-icon { width: 1rem; height: 1rem; flex-shrink: 0; }
.date-filter-label {
  font-size: 0.875rem;
  white-space: nowrap;
}

.date-filter-dropdown {
  min-width: 320px;
  max-width: calc(100vw - 32px);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.date-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border-light);
}

.date-preset-btn {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-preset-btn:hover {
  background: var(--color-bg-cream);
  border-color: var(--color-primary-medium);
  color: var(--color-primary);
}

.date-preset-btn.is-selected {
  background: var(--color-primary-gradient);
  border-color: transparent;
  color: #FFFFFF;
}

.date-range-section { padding: 0.75rem; }

.date-range-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-input-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input-group .date-input {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
}

.date-input-group .date-input:hover { border-color: var(--color-primary-medium); }

.date-input-group .date-input:focus {
  outline: none;
  border-color: var(--color-primary-medium);
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.15);
}

.date-separator { display: none; }

.btn-clear-date {
  width: 100%;
  padding: 0.625rem;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-date:hover {
  background: #FEF2F2;
  border-color: #FCA5A5;
  color: var(--color-danger);
}

@media (min-width: 640px) {
  .date-range-inputs {
    flex-direction: row;
    align-items: center;
  }
  .date-separator {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 500;
    padding: 0 0.5rem;
  }
  .date-input-group { flex: 1; }
  .btn-clear-date { width: auto; }
}

/* ========== Mobile Responsive ========== */
@media (max-width: 640px) {
  .growth-actions {
    width: 100%;
  }

  .records-timeline {
    padding-left: 2rem;
  }

  .record-item {
    padding-left: 1rem;
  }

  .record-item::before {
    left: -2rem;
    width: 0.875rem;
    height: 0.875rem;
  }

  .record-date {
    position: static;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .record-day {
    font-size: 1.125rem;
  }

  .record-content {
    padding: 1rem;
    gap: 0.75rem;
  }

  .record-photo-main {
    width: 100px;
    height: 100px;
  }

  .record-pet-name {
    font-size: 1rem;
  }

  .growth-title {
    font-size: 1.125rem;
  }
}

/* ========== Add Record Button ========== */
.btn-add-record {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: var(--color-primary-gradient);
  color: white;
  border: none;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-primary-btn);
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-add-record:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(255, 138, 76, 0.35);
}

.btn-add-record svg { width: 1rem; height: 1rem; }

/* ========== Login Prompt ========== */
.login-prompt {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--color-bg-page);
  border-radius: 1rem;
}

.login-prompt p { color: var(--color-text-regular); margin: 0 0 1rem 0; }

.btn-login {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

/* ========== Records Timeline ========== */
.records-timeline {
  position: relative;
  padding-left: 3rem;
}

.records-timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--color-primary), var(--color-warning-light));
  border-radius: 9999px;
  animation: timeline-grow 1s ease-out;
}

@keyframes timeline-grow {
  from { transform: scaleY(0); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}

.record-item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 1.5rem;
  transition: transform 0.3s ease;
}

.record-item:hover { transform: translateX(4px); }

.record-item::before {
  content: '';
  position: absolute;
  left: -2.875rem;
  top: 0.5rem;
  width: 1.125rem;
  height: 1.125rem;
  background: white;
  border: 3.5px solid var(--color-primary);
  border-radius: 50%;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: node-appear 0.5s ease-out backwards;
}

.record-item:hover::before {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

@keyframes node-appear {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.record-date {
  position: absolute;
  left: -5.25rem;
  top: 0;
  text-align: center;
  transition: all 0.3s ease;
}

.record-day {
  display: block;
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.record-month {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-weight: 500;
}

.record-content {
  display: flex;
  gap: 1rem;
  background: var(--color-bg-card);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-card-normal);
  border: 1px solid var(--color-border-light);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.record-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.record-item:hover .record-content {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
  border-color: var(--color-primary-light);
}

.record-item:hover .record-content::before { opacity: 1; }

.record-photos { flex-shrink: 0; }

.record-photo-main {
  width: 140px;
  height: 140px;
  border-radius: 1rem;
  overflow: hidden;
  background: var(--color-bg-block);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
}

.record-photo-main:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.record-photo-main :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.record-photo-main:hover :deep(img) { transform: scale(1.1); }

.photo-count-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.record-pet-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  transition: color 0.2s ease;
}

.record-item:hover .record-pet-name { color: var(--color-primary); }

.btn-delete-record {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-block);
  border-radius: 50%;
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.btn-delete-record:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  transform: scale(1.1) rotate(90deg);
}

.record-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.record-stat { font-size: 0.875rem; color: var(--color-text-regular); }

.record-notes {
  font-size: 0.875rem;
  color: var(--color-text-regular);
  margin: 0.5rem 0 0 0;
  font-style: italic;
  line-height: 1.5;
}

/* ========== Type Badge ========== */
.type-badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.type-badge:hover { transform: translateY(-1px); }

/* ========== Adoption Day Badge ========== */
.adoption-badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #FDF2F8 0%, var(--color-bg-cream) 100%);
  color: #EC4899;
  font-weight: 600;
  border: 1px solid #FBCFE8;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.2);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  animation: celebration-pulse 2s ease-in-out infinite;
}

@keyframes celebration-pulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(236, 72, 153, 0.2); }
  50% { box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35); }
}

/* ========== Adoption Day Record Style ========== */
.record-item.is-adoption-day .record-content {
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF0F5 100%);
  border: 2px solid;
  border-image: linear-gradient(135deg, #FCD34D, #F9A8D4) 1;
  box-shadow: 0 4px 20px rgba(252, 211, 77, 0.25);
}

.record-item.is-adoption-day::before {
  background: linear-gradient(135deg, #FCD34D, #F9A8D4);
  border-color: transparent;
  animation: anniversary-glow 2s ease-in-out infinite;
}

.record-item.is-adoption-day .record-day { color: #EC4899; }

.record-item.is-adoption-day .record-content::after {
  content: '🎂';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 1.5rem;
  animation: mascot-bounce 1s ease-in-out infinite;
}

@keyframes anniversary-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(252, 211, 77, 0); }
}

@keyframes mascot-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* ========== Month Group ========== */
.month-divider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0.75rem 0;
  margin: 0.25rem 0 1rem 0;
}

.month-count {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-muted);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.month-group { margin-bottom: 2rem; }

/* ========== Transitions ========== */
.record-item-enter-active { animation: record-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.record-item-leave-active { animation: record-slide-out 0.3s ease-in; }
.record-item-move { transition: transform 0.4s ease; }

@keyframes record-slide-in {
  from { opacity: 0; transform: translateX(-30px) scale(0.9); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes record-slide-out {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to { opacity: 0; transform: translateX(30px) scale(0.9); }
}

.record-list-enter-active { animation: month-fade-in 0.3s ease-out; }
.record-list-leave-active { animation: month-fade-out 0.2s ease-in; }

@keyframes month-fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes month-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(10px); }
}

/* ========== Empty State ========== */
.empty-records {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-page);
  border-radius: 1rem;
}

/* ========== Loading State ========== */
.loading-records {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-page);
  border-radius: 1rem;
}

.loading-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 1rem 0 0 0;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-hint { color: var(--color-text-placeholder); margin: 0 0 1.5rem 0; }

.btn-reset-filter {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-filter:hover { opacity: 0.9; transform: translateY(-1px); }

.btn-add-first-record {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

/* ========== Modal ========== */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modalFadeIn 0.2s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.record-modal {
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-title { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); }

.modal-close {
  background: transparent;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--color-text-regular);
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.modal-close:hover { color: var(--color-text-primary); }

.modal-body { padding: 1.5rem; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border-light);
}

.btn-cancel,
.btn-save {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel { background: var(--color-bg-block-hover); border: none; color: var(--color-text-regular); }
.btn-cancel:hover { background: var(--color-border-light); }
.btn-save { background: var(--color-primary); border: none; color: white; }
.btn-save:hover { background: var(--color-primary-dark); }

/* ========== Record Type Tabs ========== */
.record-type-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.type-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-bg-warm);
  border: 2px solid transparent;
  border-radius: 100px;
  color: var(--color-text-placeholder);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  white-space: nowrap;
}

.type-icon { width: 14px; height: 14px; stroke: currentColor; }
.type-capsule:hover { background: var(--color-bg-warm); }

.type-capsule.is-active {
  background: var(--color-primary-medium);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

/* ========== Cream Form ========== */
.cream-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: flex; gap: 16px; }

.form-item { display: flex; flex-direction: column; gap: 8px; }
.form-item.half { flex: 1; }
.form-item.full { width: 100%; }

.cream-label { font-size: 13px; font-weight: 600; color: var(--color-text-regular); }

.cream-input {
  width: 100%;
  background: var(--color-bg-warm);
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-primary);
  transition: all 0.3s ease;
}

.cream-input:focus {
  outline: none;
  background: #FFFFFF;
  border-color: var(--color-primary-medium);
  box-shadow: 0 0 0 4px rgba(244, 162, 97, 0.1);
}

.cream-input::placeholder { color: var(--color-text-placeholder); }
.cream-input:read-only { opacity: 0.7; cursor: not-allowed; }

.cream-textarea {
  width: 100%;
  background: var(--color-bg-warm);
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 80px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.cream-textarea:focus {
  outline: none;
  background: #FFFFFF;
  border-color: var(--color-primary-medium);
  box-shadow: 0 0 0 4px rgba(244, 162, 97, 0.1);
}

.cream-textarea::placeholder { color: var(--color-text-placeholder); }

.cream-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
  cursor: pointer;
}

/* ========== Input with Unit ========== */
.input-with-unit { position: relative; display: flex; align-items: center; }
.input-with-unit .cream-input { padding-right: 50px; }

.input-with-unit .unit {
  position: absolute;
  right: 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  pointer-events: none;
}

/* ========== Photo Upload ========== */
.photo-upload-header { display: flex; justify-content: space-between; align-items: center; }

.photo-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-bg-cream);
  padding: 4px 10px;
  border-radius: 100px;
}

.premium-photo-area { display: flex; flex-wrap: wrap; gap: 12px; }

.photo-thumb-new {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.photo-thumb-new img { width: 100%; height: 100%; object-fit: cover; }

.photo-remove {
  position: absolute;
  top: 4px; right: 4px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.photo-remove:hover { background: var(--color-danger); transform: scale(1.1); }

.photo-upload-trigger {
  width: 80px; height: 80px;
  border-radius: 16px;
  background: linear-gradient(145deg, var(--color-bg-warm) 0%, var(--color-bg-warm) 100%);
  border: 2px dashed #F5F0E8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.photo-upload-trigger:hover {
  border-color: var(--color-primary-medium);
  background: linear-gradient(145deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
}

.photo-upload-trigger span { font-size: 11px; font-weight: 600; color: var(--color-primary); }

.hidden-input { display: none; }

/* ========== Adoption Checkbox ========== */
.adoption-check { margin-top: 4px; }

.cream-checkbox { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.cream-checkbox input[type="checkbox"] { display: none; }

.checkbox-mark {
  width: 20px; height: 20px;
  border: 2px solid var(--color-border-light);
  border-radius: 6px;
  position: relative;
  transition: all 0.3s ease;
}

.cream-checkbox input[type="checkbox"]:checked ~ .checkbox-mark {
  background: var(--color-primary-medium);
  border-color: var(--color-primary-medium);
}

.cream-checkbox input[type="checkbox"]:checked ~ .checkbox-mark::after {
  content: '';
  position: absolute;
  left: 5px; top: 2px;
  width: 5px; height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-icon { width: 18px; height: 18px; color: #FBBF24; }

.cream-checkbox span:not(.checkbox-mark):not(.checkbox-icon) {
  font-size: 14px;
  color: var(--color-text-regular);
}

/* ========== SVG Icon Styles ========== */
.icon-growth,
.icon-stat,
.badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px; height: 16px;
  margin-right: 4px;
  vertical-align: middle;
}

.icon-growth :deep(svg),
.icon-stat :deep(svg),
.badge-icon :deep(svg) {
  width: 14px; height: 14px;
  stroke: currentColor;
}

.badge-icon { width: 14px; height: 14px; margin-right: 4px; }
.badge-icon :deep(svg) { width: 12px; height: 12px; fill: var(--color-warning); stroke: var(--color-warning); }

.type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
}

.type-icon :deep(svg) { width: 16px; height: 16px; }

.full-width { grid-column: 1 / -1; }
</style>

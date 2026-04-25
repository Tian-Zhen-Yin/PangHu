<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useCatStore } from '../../stores/cat'
import { usePetStore } from '../../stores/pet'
import { useAuthStore } from '../../stores/auth'
import { useMyCatStore } from '../../stores/myCat'
import { storeToRefs } from 'pinia'
import { toast } from '../../composables/useToast'
import ImageLoader from '../../components/common/ImageLoader.vue'
import CatSelector from '../../components/cat/CatSelector.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import HorizontalStageTimeline from '../../components/growth/HorizontalStageTimeline.vue'
import type { Stage, Task, Vaccine } from '../../types/cat'
import { getImageUrl } from '../../utils/format'
import type { CreatePetRecordParams } from '../../api/pet'

// 区块标题图标 SVG
const sectionIcons = {
  milestone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  date: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  feeding: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3"/><path d="M10 1v3"/><path d="M14 1v3"/></svg>',
  training: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
  care: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5c0 5-5 10-5 10s-5-5-5-10a5 5 0 015-5z"/><path d="M12 8a2 2 0 110 4 2 2 0 010-4z"/></svg>',
  vaccine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M9 10V6a3 3 0 016 0v4"/><path d="M12 14v4"/><path d="M10 16h4"/></svg>',
  deworm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
  free: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  celebration: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>',
  daily: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>'
}

type TaskCategory = 'health' | 'feeding' | 'training' | 'care'

interface TaskCategoryInfo {
  name: string
  icon: string
  color: string
}

// 任务完成状态类型
interface TaskState {
  completed: boolean
  date?: string
  notes?: string
}

const catStore = useCatStore()
const petStore = usePetStore()
const authStore = useAuthStore()
const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)
const selectedStage = ref<Stage | null>(null)
const activeTab = ref<'overview' | 'tasks' | 'vaccines' | 'growth'>('overview')

// 任务状态管理（前端本地）
const taskStates = ref<Record<string, TaskState>>({})

// 宠物记录相关状态
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

// 任务详情弹窗
const showTaskModal = ref(false)
const currentTask = ref<Task | null>(null)
const taskCompletionDate = ref<string>('')
const taskNotes = ref<string>('')

// 记录筛选器状态
type RecordFilterType = 'all' | 'photos' | 'important' | 'daily'
const recordFilter = ref<RecordFilterType>('all')
const showFilterMenu = ref(false)

// 日期筛选相关
const startDate = ref('')
const endDate = ref('')
const selectedDatePreset = ref('all')
const showDateFilterMenu = ref(false)
const today = computed(() => new Date().toISOString().slice(0, 10))

// 日期预设选项
const DATE_PRESETS = [
  { key: 'all', label: '全部日期' },
  { key: '7days', label: '最近7天' },
  { key: '30days', label: '最近30天' },
  { key: '3months', label: '最近3个月' },
  { key: '6months', label: '最近6个月' },
  { key: '1year', label: '最近1年' }
]

// 筛选类型配置
const FILTER_CONFIG: Record<RecordFilterType, { label: string; icon: string; description: string }> = {
  all: { label: '全部记录', icon: '📋', description: '显示所有记录' },
  photos: { label: '仅照片', icon: '📷', description: '只显示有照片的记录' },
  important: { label: '重要记录', icon: '⭐', description: '纪念日、疫苗、体检等' },
  daily: { label: '日常记录', icon: '📝', description: '只显示日常记录' }
}

// 筛选后的记录（包含日期筛选）
const filteredRecords = computed(() => {
  let records = petStore.sortedRecords

  // 首先按记录类型筛选
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

  // 然后按日期范围筛选
  if (startDate.value || endDate.value) {
    records = records.filter(record => {
      if (!record.recordDate) return false

      // 使用日期字符串直接比较（格式：YYYY-MM-DD）
      if (startDate.value && record.recordDate < startDate.value) return false
      if (endDate.value && record.recordDate > endDate.value) return false

      return true
    })
  }

  return records
})

// 筛选后的记录（按月分组）
const filteredRecordsByMonth = computed(() => {
  const groups: { month: string; records: typeof petStore.sortedRecords }[] = []
  const map = new Map<string, typeof petStore.sortedRecords>()

  for (const r of filteredRecords.value) {
    if (!r.recordDate) continue // 跳过没有日期的记录
    const month = r.recordDate.slice(0, 7)
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(r)
  }

  map.forEach((records, month) => groups.push({ month, records }))
  return groups.sort((a, b) => b.month.localeCompare(a.month))
})

onMounted(async () => {
  await catStore.fetchStages()

  // 加载任务状态
  const saved = localStorage.getItem('catTaskStates')
  if (saved) {
    try {
      taskStates.value = JSON.parse(saved)
    } catch {
      taskStates.value = {}
    }
  }

  // 加载猫咪列表
  await myCatStore.fetchCats()

  // 如果已登录，加载宠物记录
  if (authStore.isAuthenticated) {
    await petStore.fetchRecords(currentCat.value?.id)
  }

  // 添加点击外部关闭筛选菜单的监听器
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听猫咪变化，重新加载记录
watch(currentCat, async (newCat) => {
  if (authStore.isAuthenticated) {
    await petStore.fetchRecords(newCat?.id)
  }
})

// 打开任务完成弹窗
function openTaskModal(task: Task) {
  currentTask.value = task
  const currentState = taskStates.value[task.id]

  if (currentState?.completed) {
    // 已完成，打开编辑详情
    taskCompletionDate.value = (currentState.date ?? new Date().toISOString().slice(0, 10)) as string
    taskNotes.value = (currentState.notes ?? '') as string
    showTaskModal.value = true
  } else {
    // 未完成，直接标记为完成并打开弹窗
    const today = new Date().toISOString().slice(0, 10)
    taskCompletionDate.value = today || ''
    taskNotes.value = ''
    showTaskModal.value = true
  }
}

// 关闭任务弹窗
function closeTaskModal() {
  showTaskModal.value = false
  currentTask.value = null
  taskCompletionDate.value = ''
  taskNotes.value = ''
}

// 保存任务状态
function saveTaskState() {
  if (!currentTask.value) return

  const taskId = currentTask.value.id
  taskStates.value[taskId] = {
    completed: true,
    date: taskCompletionDate.value,
    notes: taskNotes.value.trim()
  }

  // 保存到localStorage
  localStorage.setItem('catTaskStates', JSON.stringify(taskStates.value))
  closeTaskModal()
}

// 暴力清洗任务标题 - 彻底切除开头所有的英文字母和附带的空格
function cleanTaskTitle(title: string): string {
  if (!title) return ''
  // 匹配开头的一个或多个英文字母，以及后面的任意个空格，替换为空
  const cleaned = title.replace(/^[a-zA-Z]+\s*/, '')
  return cleaned.trim() || title
}

// 宠物记录功能
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

// ==================== 日期筛选功能 ====================
// 选择日期预设
function selectDatePreset(preset: string) {
  selectedDatePreset.value = preset
  const now = new Date()

  switch (preset) {
    case 'all':
      startDate.value = ''
      endDate.value = ''
      break
    case '7days':
      startDate.value = formatDateToISO(subDays(now, 7))
      endDate.value = today.value
      break
    case '30days':
      startDate.value = formatDateToISO(subDays(now, 30))
      endDate.value = today.value
      break
    case '3months':
      startDate.value = formatDateToISO(subDays(now, 90))
      endDate.value = today.value
      break
    case '6months':
      startDate.value = formatDateToISO(subDays(now, 180))
      endDate.value = today.value
      break
    case '1year':
      startDate.value = formatDateToISO(subDays(now, 365))
      endDate.value = today.value
      break
  }
}

// 日期改变时的处理
function onRecordDateChange() {
  selectedDatePreset.value = 'custom'
}

// 清除日期筛选
function clearRecordDateFilter() {
  startDate.value = ''
  endDate.value = ''
  selectedDatePreset.value = 'all'
}

// 辅助函数：减去天数
function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

// 辅助函数：格式化日期为 YYYY-MM-DD（用于日期筛选）
function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取日期筛选标签
function getDateFilterLabel() {
  if (selectedDatePreset.value !== 'all') {
    const preset = DATE_PRESETS.find(p => p.key === selectedDatePreset.value)
    return preset?.label || '日期筛选'
  }
  if (startDate.value || endDate.value) {
    return '自定义范围'
  }
  return '全部日期'
}

// 点击外部关闭筛选菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  const filterMenu = document.querySelector('.filter-dropdown-menu')
  const filterBtn = document.querySelector('.filter-trigger-btn')
  const dateFilterMenu = document.querySelector('.date-filter-dropdown')
  const dateFilterBtn = document.querySelector('.date-filter-trigger-btn')

  // 类型筛选菜单
  if (showFilterMenu.value && filterMenu && !filterMenu.contains(target) && !filterBtn?.contains(target)) {
    showFilterMenu.value = false
  }

  // 日期筛选菜单
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
    if (success) {
      toast.success('记录已删除')
    }
  }
}

// 计算任务完成进度
const taskProgress = computed(() => {
  if (!selectedStage.value?.tasks) return { completed: 0, total: 0, percentage: 0 }
  const total = selectedStage.value.tasks.length
  const completed = selectedStage.value.tasks.filter(
    t => taskStates.value[t.id]?.completed
  ).length
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
})

// 健康进度相关计算属性
const healthProgressPercent = computed(() => {
  if (!selectedStage.value?.vaccines || selectedStage.value.vaccines.length === 0) return 0
  // 简单假设：根据当前猫咪年龄计算应该完成的疫苗比例
  const catAgeWeeks = currentCat.value?.ageMonths ? currentCat.value.ageMonths * 4 : 0
  const totalVaccines = selectedStage.value.vaccines.length
  const completedVaccines = selectedStage.value.vaccines.filter(v => v.ageWeeks <= catAgeWeeks).length
  return totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0
})

const healthProgressSummary = computed(() => {
  const percent = healthProgressPercent.value
  if (percent >= 100) return '基础免疫已全部完成，真棒！'
  if (percent >= 66) return '已完成基础免疫 2/3，继续保持喵！'
  if (percent >= 33) return '已完成基础免疫 1/3，加油喵~'
  return '免疫计划进行中，记得按时接种哦'
})

const healthProgressMascot = computed(() => {
  const percent = healthProgressPercent.value
  if (percent >= 100) return 'excited'
  if (percent >= 66) return 'happy'
  if (percent >= 33) return 'focused'
  return 'waiting'
})

// 判断疫苗是否已完成（基于年龄）
function isVaccineDone(vaccine: Vaccine): boolean {
  if (!currentCat.value) return false
  const catAgeWeeks = currentCat.value.ageMonths ? currentCat.value.ageMonths * 4 : 0
  return vaccine.ageWeeks <= catAgeWeeks
}

// 获取疫苗状态样式类
function getVaccineStatus(vaccine: Vaccine): string {
  if (isVaccineDone(vaccine)) return 'done'
  return 'active'
}

// 任务分类
const taskCategories: Record<TaskCategory, TaskCategoryInfo> = {
  health: { name: '健康', icon: 'health', color: 'category-health' },
  feeding: { name: '喂养', icon: 'feeding', color: 'category-feeding' },
  training: { name: '训练', icon: 'training', color: 'category-training' },
  care: { name: '护理', icon: 'care', color: 'category-care' }
}

// 记录类型配置
const RECORD_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  daily:       { label: '日常', icon: 'daily', color: '#4ade80' },
  vaccine:     { label: '疫苗', icon: 'vaccine', color: '#60a5fa' },
  deworm:      { label: '驱虫', icon: 'deworm', color: 'var(--color-primary)' },
  healthCheck: { label: '体检', icon: 'health', color: '#a78bfa' },
  free:        { label: '自由', icon: 'free', color: 'var(--color-text-placeholder)' },
}

// 根据猫咪来源调整页面标题和导航
const pageSubtitle = computed(() => {
  if (!currentCat.value) return '从新生到成年的完整成长路径'
  switch (currentCat.value.adoptStatus) {
    case 'raisedFromBaby':
      return '从新生到成年的完整成长路径'
    case 'adoptedYoung':
      return `记录${currentCat.value.name}领养后的成长点滴`
    case 'adoptedAdult':
      return `关注${currentCat.value.name}的健康与养护`
    case 'unknownAge':
      return `记录${currentCat.value.name}的日常生活与健康`
    default:
      return '从新生到成年的完整成长路径'
  }
})

// 对于领养（幼年/成年）和年龄不详的猫咪，隐藏年龄显示
const shouldHideAge = computed(() => {
  if (!currentCat.value) return false
  return ['adoptedYoung', 'adoptedAdult', 'unknownAge'].includes(currentCat.value.adoptStatus)
})

// 获取猫咪显示文本（替代年龄）
const catDisplayLabel = computed(() => {
  if (!currentCat.value) return ''
  switch (currentCat.value.adoptStatus) {
    case 'adoptedYoung':
      return '幼年猫'
    case 'adoptedAdult':
      return '成年猫'
    case 'unknownAge':
      return '年龄不详'
    default:
      return ''
  }
})

// 根据猫咪领养状态过滤显示的阶段
const filteredStages = computed(() => {
  if (!currentCat.value) return catStore.stages

  switch (currentCat.value.adoptStatus) {
    case 'raisedFromBaby':
      // 从小养大：显示所有阶段
      return catStore.stages
    case 'adoptedYoung':
      // 领养幼年：只显示 2个月及以后的阶段
      return catStore.stages.filter(s => s.minAgeWeeks >= 8)
    case 'adoptedAdult':
    case 'unknownAge':
      // 成年猫或年龄不详：只显示养护相关的阶段（不含具体年龄）
      return catStore.stages.filter(s => s.minAgeWeeks >= 52)
    default:
      return catStore.stages
  }
})

// 当猫咪切换时，重置选中的阶段为第一个可用阶段
watch(currentCat, () => {
  if (filteredStages.value.length > 0) {
    selectedStage.value = filteredStages.value[0]!
  }
})

// 确保 selectedStage 始终有效
watch(filteredStages, (stages) => {
  if (stages.length > 0 && (!selectedStage.value || !stages.find(s => s.id === selectedStage.value!.id))) {
    selectedStage.value = stages[0]!
  }
})

// 阶段切换时重置到概览标签
watch(selectedStage, () => {
  activeTab.value = 'overview'
})
</script>

<template>
  <div class="timeline-page">
    <!-- 紧凑型头部布局 -->
    <div class="timeline-header-compact" v-if="authStore.isAuthenticated">
      <!-- 左侧：标题区域 -->
      <div class="header-left">
        <div class="title-group">
          <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
          <div class="title-text">
            <h1 class="page-title">{{ currentCat?.timelineTitle || '猫咪养成时间线' }}</h1>
            <p class="page-subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>
      </div>

      <!-- 右侧：猫咪选择器 -->
      <div class="header-right">
        <CatSelector />
      </div>
    </div>

    <!-- 未登录时显示简单头部 -->
    <div class="page-header" v-else>
      <h1 class="page-title">
        <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
        {{ currentCat?.timelineTitle || '猫咪养成时间线' }}
      </h1>
      <p class="page-subtitle">{{ pageSubtitle }}</p>
    </div>

    <div class="timeline-container">
      <!-- 横向时间轴导航 -->
      <HorizontalStageTimeline
        v-model="selectedStage"
        :stages="filteredStages"
      />

      <!-- 阶段详情 -->
      <main class="stage-detail" v-if="selectedStage">
        <!-- 标签页 - 悬浮胶囊分段控制器 -->
        <div class="premium-tabs-container">

          <button
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'overview' }"
            @click="activeTab = 'overview'"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span class="tab-text">概览</span>
          </button>

          <button
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'tasks' }"
            @click="activeTab = 'tasks'"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span class="tab-text">任务清单</span>
            <span v-if="taskProgress.total > 0" class="tab-badge">{{ taskProgress.completed }}/{{ taskProgress.total }}</span>
          </button>

          <button
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'vaccines' }"
            @click="activeTab = 'vaccines'"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span class="tab-text">疫苗接种</span>
            <span v-if="selectedStage?.vaccines?.length" class="tab-badge warning">{{ selectedStage.vaccines.length }}</span>
          </button>

          <button
            class="tab-btn"
            :class="{ 'is-active': activeTab === 'growth' }"
            @click="activeTab = 'growth'"
          >
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="tab-text">成长记录</span>
            <span v-if="petStore.recordCount > 0" class="tab-badge">{{ petStore.recordCount }}</span>
          </button>

        </div>

        <!-- 概览内容 -->
        <div v-show="activeTab === 'overview'" class="tab-content">
          <!-- 里程碑 -->
          <section class="milestones-section" v-if="selectedStage.milestones && selectedStage.milestones.length > 0">
            <div class="section-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="section-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h3 class="section-title">重要里程碑</h3>
            </div>

            <div class="milestones-grid">
              <div
                v-for="milestone in selectedStage.milestones"
                :key="milestone.id"
                class="milestone-premium-card"
              >
                <div class="card-header">
                  <div class="title-with-icon">
                    <div class="icon-plate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <h4 class="milestone-title">{{ milestone.title }}</h4>
                  </div>

                  <span class="time-badge">{{ milestone.ageWeeks }}周</span>
                </div>

                <p class="milestone-desc">{{ milestone.description }}</p>
              </div>
            </div>
          </section>

          <!-- 任务预览 -->
          <section class="section">
            <h3 class="section-title">
              <span class="section-icon" v-html="sectionIcons.task"></span>
              重要任务
            </h3>
            <div class="overview-tasks-preview">
              <div
                v-for="task in selectedStage!.tasks?.slice(0, 3)"
                :key="task.id"
                class="overview-task-card"
                @click="openTaskModal(task)"
              >
                <div class="otc-icon-wrapper" :class="task.category">
                  <!-- 健康类 -->
                  <svg v-if="task.category === 'health'" viewBox="0 0 24 24" fill="none" class="otc-icon">
                    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 12H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 16H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <!-- 喂养类 -->
                  <svg v-else-if="task.category === 'feeding'" viewBox="0 0 24 24" fill="none" class="otc-icon">
                    <path d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M21 3V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M16.5 7.5L21 3L16.5 7.5ZM16.5 7.5L21 12L16.5 7.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <!-- 训练类 -->
                  <svg v-else-if="task.category === 'training'" viewBox="0 0 24 24" fill="none" class="otc-icon">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M12 3V12L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <!-- 护理类 -->
                  <svg v-else viewBox="0 0 24 24" fill="none" class="otc-icon">
                    <path d="M8 3L4 7V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V7L16 3H8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 12V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 21H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <span class="otc-title">{{ cleanTaskTitle(task.title) }}</span>
                <svg class="otc-arrow" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <button class="view-all-btn" @click="activeTab = 'tasks'">
                查看全部任务 →
              </button>
            </div>
          </section>
        </div>

        <!-- 任务清单内容 -->
        <div v-show="activeTab === 'tasks'" class="tab-content">
          <!-- 进度条 -->
          <div class="progress-section" v-if="taskProgress.total > 0">
            <div class="progress-header">
              <span class="progress-label">完成进度</span>
              <span class="progress-percentage">{{ taskProgress.percentage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: taskProgress.percentage + '%' }"></div>
            </div>
          </div>

          <!-- 任务列表 -->
          <div class="tasks-list">
            <template v-for="category in ['health', 'feeding', 'training', 'care'] as const" :key="category">
              <div
                class="task-category"
                v-if="selectedStage!.tasks?.some((t: Task) => t.category === category)"
              >
                <h4 class="category-title">
                  <span :class="['category-badge', category]">
                    <span class="category-icon">
                      <svg v-if="category === 'health'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      <svg v-else-if="category === 'feeding'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                      </svg>
                      <svg v-else-if="category === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      <svg v-else-if="category === 'care'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    </span>
                    {{ taskCategories[category].name }}
                  </span>
                </h4>

                <div class="category-tasks">
                  <div
                    v-for="task in selectedStage!.tasks?.filter((t: Task) => t.category === category)"
                    :key="task.id"
                    class="task-item"
                    :class="{ completed: taskStates[task.id]?.completed }"
                    @click="openTaskModal(task)"
                  >
                    <div class="task-icon-box" :class="task.category">
                      <svg v-if="task.category === 'health'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      <svg v-else-if="task.category === 'feeding'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 8h1a4 4 0 010 8h-1"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                      </svg>
                      <svg v-else-if="task.category === 'training'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      <svg v-else-if="task.category === 'care'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    </div>

                    <div class="task-content">
                      <span class="task-title">{{ cleanTaskTitle(task.title) }}</span>
                      <p v-if="task.description" class="task-description">{{ task.description }}</p>
                    </div>

                    <div class="task-checkbox-wrapper" @click.stop>
                      <input
                        type="checkbox"
                        :checked="taskStates[task.id]?.completed"
                        @change="openTaskModal(task)"
                        class="task-checkbox custom-checkbox"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 疫苗接种内容 - 健康屏障 -->
        <div v-show="activeTab === 'vaccines'" class="tab-content">
          <!-- 健康进度摘要卡片 -->
          <div class="health-summary-card">
            <div class="summary-text">
              <h3>{{ currentCat?.name || '小猫咪' }}的免疫屏障</h3>
              <p>{{ healthProgressSummary }}</p>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: healthProgressPercent + '%' }"></div>
              <MascotCharacter :expression="healthProgressMascot" size="small" :animated="false" class="progress-mascot" />
            </div>
          </div>

          <!-- 健康时间轴 -->
          <div v-if="selectedStage.vaccines && selectedStage.vaccines.length > 0" class="health-timeline">
            <div
              v-for="(vaccine, index) in selectedStage.vaccines"
              :key="vaccine.id"
              :class="['health-row', getVaccineStatus(vaccine)]"
            >
              <!-- 时间轴节点 -->
              <div class="axis-node">
                <div class="status-indicator">
                  <!-- 已完成：勾选图标 -->
                  <svg v-if="isVaccineDone(vaccine)" class="check-icon" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke-width="2.5" stroke="white" fill="none"/>
                  </svg>
                  <!-- 进行中：脉冲点 -->
                  <div v-else class="active-pulse"></div>
                </div>
                <div v-if="index !== selectedStage.vaccines.length - 1" class="connector-line"></div>
              </div>

              <!-- 健康信息卡片 -->
              <div class="health-info-card">
                <header class="card-header">
                  <span class="category-tag">疫苗</span>
                  <span class="status-badge" :class="isVaccineDone(vaccine) ? 'done' : 'pending'">
                    {{ isVaccineDone(vaccine) ? '已完成' : '待接种' }}
                  </span>
                </header>
                <h4 class="card-title">{{ vaccine.name }}</h4>
                <p v-if="vaccine.description" class="card-description">{{ vaccine.description }}</p>

                <!-- 卡片底部 -->
                <footer class="card-footer">
                  <div class="time-info">
                    <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <span>建议接种：{{ vaccine.ageWeeks }}周龄</span>
                  </div>
                  <!-- 胖虎医学小贴士 -->
                  <div class="medical-tip" v-if="!isVaccineDone(vaccine)">
                    <MascotCharacter expression="focused" size="small" :animated="false" class="tip-mascot" />
                    <span>接种前3天不要洗澡哦，小猫咪会怕怕！</span>
                  </div>
                </footer>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-health">
            <MascotCharacter expression="confused" size="medium" :animated="false" />
            <p class="empty-text">此阶段无需接种特殊疫苗</p>
          </div>
        </div>

        <!-- 成长记录内容 -->
        <div v-show="activeTab === 'growth'" class="tab-content">
          <div class="growth-header">
            <div class="growth-title-section">
              <h3 class="growth-title">
                <span class="icon-growth" v-html="sectionIcons.photo"></span>
                宠物成长记录
              </h3>
              <!-- 记录计数 -->
              <span class="record-count-badge">
                {{ filteredRecords.length }} 条记录
              </span>
            </div>
            <div class="growth-actions">
              <!-- 类型筛选器 -->
              <div class="record-filter-wrapper">
                <button
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

                <!-- 筛选下拉菜单 -->
                <transition name="filter-dropdown">
                  <div v-show="showFilterMenu" class="filter-dropdown-menu">
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
              </div>

              <!-- 日期筛选器 -->
              <div class="date-filter-wrapper">
                <button
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

                <!-- 日期筛选下拉菜单 -->
                <transition name="filter-dropdown">
                  <div v-show="showDateFilterMenu" class="date-filter-dropdown" ref="dateFilterMenuRef">
                    <div class="filter-menu-header">
                      <span>日期筛选</span>
                      <button @click="showDateFilterMenu = false" class="close-btn">×</button>
                    </div>

                    <!-- 预设选项 -->
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

                    <!-- 自定义日期范围 -->
                    <div class="date-range-section">
                      <div class="date-range-inputs">
                        <div class="date-input-group">
                          <label>开始日期</label>
                          <input
                            v-model="startDate"
                            type="date"
                            class="date-input"
                            :max="endDate || today"
                            @change="onRecordDateChange"
                          />
                        </div>
                        <span class="date-separator">至</span>
                        <div class="date-input-group">
                          <label>结束日期</label>
                          <input
                            v-model="endDate"
                            type="date"
                            class="date-input"
                            :min="startDate"
                            :max="today"
                            @change="onRecordDateChange"
                          />
                        </div>
                      </div>
                      <button
                        v-if="startDate || endDate"
                        @click="clearRecordDateFilter"
                        class="btn-clear-date"
                      >
                        清除筛选
                      </button>
                    </div>
                  </div>
                </transition>
              </div>

              <button @click="openAddRecordModal" class="btn-add-record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                添加记录
              </button>
            </div>
          </div>

          <!-- 未登录提示 -->
          <div v-if="!authStore.isAuthenticated" class="login-prompt">
            <p>请先登录以使用宠物成长记录功能</p>
            <button @click="$router.push('/login')" class="btn-login">去登录</button>
          </div>

          <!-- 记录列表（按月分组）- 添加动画 -->
          <div v-else-if="filteredRecords.length > 0" class="records-timeline">
            <transition-group
              name="record-list"
              tag="div"
            >
              <template v-for="group in filteredRecordsByMonth" :key="group.month">
                <div :class="['month-group', `month-${group.month}`]">
                  <div class="month-divider">
                    {{ group.month.replace('-', '年') }}月
                    <span class="month-count">({{ group.records.length }})</span>
                  </div>
                  <transition-group
                    name="record-item"
                    tag="div"
                    class="month-records"
                  >
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
                        <!-- 多图缩略 -->
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

          <!-- 空状态 -->
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
        </div>
      </main>
    </div>

    <!-- 任务完成弹窗 -->
    <div v-if="showTaskModal" class="modal-overlay" @click="closeTaskModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">标记任务完成</h3>
          <button @click="closeTaskModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p v-if="currentTask" class="modal-task-title">{{ currentTask.title }}</p>

          <div class="form-group">
            <label class="form-label">完成日期</label>
            <input
              v-model="taskCompletionDate"
              type="date"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">备注（可选）</label>
            <textarea
              v-model="taskNotes"
              class="form-textarea"
              placeholder="记录一些细节..."
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeTaskModal" class="btn-cancel">取消</button>
          <button @click="saveTaskState" class="btn-save">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加宠物记录弹窗 -->
    <div v-if="showAddRecordModal" class="modal-overlay" @click="closeAddRecordModal">
      <div class="modal-content record-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">添加成长记录</h3>
          <button @click="closeAddRecordModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <!-- 记录类型胶囊 Tab -->
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

          <!-- 奶油风表单 -->
          <div class="cream-form">
            <!-- 基础字段 -->
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

            <!-- daily 字段 -->
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

            <!-- vaccine 字段 -->
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

            <!-- deworm 字段 -->
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

            <!-- healthCheck 字段 -->
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

            <!-- 备注（所有类型通用） -->
            <div class="form-item full">
              <label class="cream-label">备注</label>
              <textarea v-model="recordForm.notes" class="cream-textarea" rows="3" placeholder="想写下{{ currentCat?.name || '小猫咪' }}今天的顽皮瞬间吗？喵~"></textarea>
            </div>

            <!-- 奶油风照片上传区 -->
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

            <!-- 领养纪念日 -->
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

    <!-- 加载状态 -->
    <div v-if="catStore.loading" class="loading">
      <span class="loading-spinner"></span>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="catStore.error" class="error">
      <p>{{ catStore.error }}</p>
      <button @click="catStore.fetchStages" class="retry-btn">重试</button>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ========== 紧凑型头部布局 ========== */
.timeline-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg) var(--space-xl);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-normal);
}

.header-left {
  flex: 1;
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.title-text {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: var(--space-xs) 0 0 0;
}

.header-right {
  flex-shrink: 0;
}

/* 未登录时的简单头部 */
.page-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.page-header .page-title {
  font-size: 2rem;
}

/* ========== 响应式：移动端 ========== */
@media (max-width: 640px) {
  .timeline-header-compact {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--space-md);
  }

  .title-group {
    gap: var(--space-sm);
  }

  .title-mascot {
    width: 32px;
    height: 32px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .page-subtitle {
    font-size: 0.75rem;
  }

  .header-right {
    width: 100%;
  }

  .header-right :deep(.cat-selector) {
    width: 100%;
  }

  .header-right :deep(.current-cat) {
    width: 100%;
  }
}

/* ========== 横向布局容器 ========== */
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 阶段详情 - 奶油风大卡片 */
.stage-detail {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-card-normal);
  width: 100%;
}

/* ================= 悬浮胶囊 Tab ================= */
.premium-tabs-container {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-block);
  border-radius: var(--radius-full);
  padding: var(--space-sm);
  gap: var(--space-xs);
  margin: var(--space-md) 0 var(--space-xl) 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 10px 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-placeholder);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tab-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  transition: transform 0.2s ease;
}

.tab-text {
  font-size: 14px;
  font-weight: 500;
}

/* 默认微标样式 (灰色) */
.tab-badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  background: var(--color-border-light);
  color: var(--color-text-regular);
  transition: all 0.3s ease;
}

/* ================= 激活态视觉 (Active State) ================= */

/* 1. 滑块变身：纯白背景 + 物理悬浮投影 */
.tab-btn.is-active {
  background: #FFFFFF;
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* 2. 文字提亮加粗 */
.tab-btn.is-active .tab-text {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 3. 选中态的图标微微放大 */
.tab-btn.is-active .tab-icon {
  transform: scale(1.1);
}

/* 4. 微标变化：变成浅橘色底 + 深橘色字 */
.tab-btn.is-active .tab-badge {
  background: var(--color-bg-cream);
  color: var(--color-primary);
}

/* 如果有需要特别警告的微标 (比如疫苗待打)，反向高亮 */
.tab-btn.is-active .tab-badge.warning {
  background: var(--color-primary-medium);
  color: #FFFFFF;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border-light);
  margin-bottom: 2rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-regular);
  transition: all 0.2s ease;
  margin-bottom: -2px;
}

.tab:hover:not(:disabled) {
  color: var(--color-primary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-badge {
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
}

/* 内容区 */
.tab-content {
  animation: tabFadeIn 0.3s ease;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.section-icon {
  font-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 6px;
}

.section-icon :deep(svg) {
  width: 18px;
  height: 18px;
  stroke: var(--color-primary);
}

/* ================= 里程碑模块 - 高级奶油风 ================= */
.milestones-section {
  margin-top: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-header .section-icon {
  width: 20px;
  height: 20px;
  color: #FBBF24;
  flex-shrink: 0;
}

.section-header .section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.milestones-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 核心：高级奶油风卡片 */
.milestone-premium-card {
  position: relative;
  /* 剔除刺眼的黄，使用纯白到极浅橘色的微渐变 */
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  /* 拟物光边：模拟高光边缘 */
  border: 1px solid #FFFFFF;
  border-radius: 20px;
  padding: 20px;
  /* 双层阴影：底层环境光 + 暖色发光 */
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.02),
    0 8px 32px rgba(244, 162, 97, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.milestone-premium-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.03),
    0 12px 40px rgba(244, 162, 97, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 替代 Emoji 的精致图标底座 */
.icon-plate {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--color-bg-cream);
  color: var(--color-primary);
  border-radius: 10px;
  flex-shrink: 0;
}

.icon-plate svg {
  width: 18px;
  height: 18px;
}

.milestone-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-regular);
}

/* 时间胶囊标签 */
.time-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background: #FFFFFF;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  border-radius: 100px;
  box-shadow: 0 2px 6px rgba(244, 162, 97, 0.15);
  flex-shrink: 0;
}

.milestone-desc {
  margin: 0;
  padding-left: 44px;
  font-size: 14px;
  color: var(--color-text-placeholder);
  line-height: 1.5;
}

/* ========== Overview 任务预览 - 奶油风悬浮卡片 ========== */
.overview-tasks-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-task-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: #FFFFFF;
  border: 2px solid #F5F0E8;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.overview-task-card:hover {
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-warm) 100%);
  border-color: var(--color-primary-medium);
  transform: translateX(8px) translateY(-2px);
  box-shadow: 0 8px 20px rgba(244, 162, 97, 0.15);
}

.otc-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.otc-icon-wrapper.health {
  background: linear-gradient(135deg, #FFE5E5 0%, #FFDBDB 100%);
  color: var(--color-danger);
}

.otc-icon-wrapper.feeding {
  background: linear-gradient(135deg, #FFF4E5 0%, #FFEED5 100%);
  color: var(--color-primary);
}

.otc-icon-wrapper.training {
  background: linear-gradient(135deg, #E5F4FF 0%, #D5EAFF 100%);
  color: var(--color-info);
}

.otc-icon-wrapper.care {
  background: linear-gradient(135deg, #E5FFE9 0%, #D5FFDD 100%);
  color: var(--color-success);
}

.otc-icon {
  width: 22px;
  height: 22px;
}

.otc-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.otc-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.overview-task-card:hover .otc-arrow {
  color: var(--color-primary);
  transform: translateX(3px);
}

.view-all-btn {
  color: var(--color-primary);
  background: linear-gradient(135deg, #FFF4E5 0%, #FFEED5 100%);
  border: none;
  padding: 14px 18px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(244, 162, 97, 0.1);
}

.view-all-btn:hover {
  background: linear-gradient(135deg, #FFEED5 0%, #FFE5C5 100%);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.2);
  transform: translateY(-1px);
}

/* 进度条 */
.progress-section {
  margin-bottom: 2rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-label {
  color: var(--color-text-regular);
}

.progress-percentage {
  font-weight: 600;
  color: var(--color-primary);
}

.progress-bar {
  height: 0.75rem;
  background: var(--color-border-light);
  border-radius: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  transition: width 0.3s ease;
}

/* 任务列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 任务分类基础 */
.task-category {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-title {
  margin: 0;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
}

.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.category-icon svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

/* 分类徽章颜色 */
.category-badge.health { background: #fef2f2; color: var(--color-danger); }
.category-badge.feeding { background: #eff6ff; color: var(--color-info); }
.category-badge.training { background: #f3e8ff; color: #8A2BE2; }
.category-badge.care { background: #faf5ff; color: #9333ea; }

/* ================= 核心：任务卡片布局 ================= */
.category-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: center;      /* 保证左中右三块垂直居中对齐 */
  justify-content: space-between; /* 左右两端撑开，把复选框推到最右边 */
  gap: 14px;
  padding: 14px 18px;
  background: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.task-item:hover {
  background-color: var(--color-bg-cream); /* 悬停泛起奶油浅橘色 */
  transform: translateX(6px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);
}

.task-item.completed {
  opacity: 0.6;
  background: var(--color-bg-page); /* 完成态变浅灰，不抢视觉焦点 */
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: #9E968F;
}

/* ================= 内部区块分配 ================= */

/* 左侧：分类图标 */
.task-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0; /* 绝对不能被压缩 */
}

.task-icon-box.health {
  background-color: #FEF2F2;
  color: var(--color-danger);
}

.task-icon-box.feeding {
  background-color: #EFF6FF;
  color: var(--color-info);
}

.task-icon-box.training {
  background-color: #F3E8FF;
  color: #8A2BE2;
}

.task-icon-box.care {
  background-color: #FAF5FF;
  color: #9333EA;
}

.task-icon-box svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 2;
}

/* 中间：文字内容占据剩余全部空间 */
.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.task-title {
  font-size: 15px;
  font-weight: 500;
  color: #5C544E; /* 深咖色文字 */
}

.task-description {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #9E968F;
}

/* 右侧：Checkbox 定制样式 */
.task-checkbox-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary-medium); /* 选中时的打钩颜色设为品牌橘色 */
}

.task-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-1 {
  background: #fef2f2;
  color: var(--color-danger);
}

.priority-2 {
  background: #fef3c7;
  color: var(--color-warning);
}

.priority-3 {
  background: #f0fdf4;
  color: var(--color-success);
}

.uncomplete-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.uncomplete-btn:hover {
  opacity: 1;
}

/* ================= 健康屏障 - 时间轴样式 ================= */
/* 健康进度摘要卡片 */
.health-summary-card {
  background: linear-gradient(145deg, var(--color-bg-warm) 0%, var(--color-bg-warm) 100%);
  border: 1px solid #FFFFFF;
  border-radius: 24px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.06);
}

.summary-text h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-text p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

.progress-track {
  position: relative;
  height: 8px;
  background: var(--color-border-light);
  border-radius: 100px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-gradient) 0%, var(--color-primary) 100%);
  border-radius: 100px;
  transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.progress-mascot {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
}

/* 健康时间轴 */
.health-timeline {
  display: flex;
  flex-direction: column;
}

.health-row {
  display: flex;
  gap: 16px;
  position: relative;
  margin-bottom: 20px;
}

/* 时间轴节点 */
.axis-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.status-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
}

/* 完成状态 */
.health-row.done .status-indicator {
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

.check-icon {
  width: 14px;
  height: 14px;
}

/* 进行中状态 */
.health-row.active .status-indicator {
  background: var(--color-primary-medium);
  box-shadow: 0 0 0 4px rgba(244, 162, 97, 0.2);
}

.active-pulse {
  width: 12px;
  height: 12px;
  background: var(--color-primary-medium);
  border-radius: 50%;
  animation: ripple 2s infinite;
}

@keyframes ripple {
  0% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(244, 162, 97, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 162, 97, 0); }
}

/* 连接线 */
.connector-line {
  width: 2px;
  flex: 1;
  background: var(--color-border-light);
  margin-top: 4px;
}

.health-row.done .connector-line {
  background: var(--color-success);
}

.health-row.active .connector-line {
  background: linear-gradient(180deg, var(--color-primary-gradient) 0%, var(--color-border-light) 50%);
}

/* 健康信息卡片 */
.health-info-card {
  flex: 1;
  background: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 16px 20px;
  transition: all 0.3s ease;
}

.health-row.done .health-info-card {
  opacity: 0.6;
  background: var(--color-bg-warm);
}

.health-row.active .health-info-card {
  border-color: var(--color-primary-medium);
  box-shadow: 0 4px 16px rgba(244, 162, 97, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-tag {
  padding: 4px 12px;
  background: var(--color-bg-cream);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
}

.card-title {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-description {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-placeholder);
  line-height: 1.5;
}

/* 状态徽章 */
.status-badge {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
}

.status-badge.done {
  background: #DCFCE7;
  color: var(--color-success);
}

.status-badge.pending {
  background: #FEF3C7;
  color: #F59E0B;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-bg-block-hover);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.clock-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* 医学小贴士 */
.medical-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 12px;
  border: 1px dashed var(--color-primary-medium);
}

.tip-mascot {
  flex-shrink: 0;
}

.medical-tip span {
  font-size: 12px;
  color: #9A3412;
  line-height: 1.4;
}

/* 健康空状态 */
.empty-health {
  text-align: center;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-health .empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-placeholder);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

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

.modal-close:hover {
  color: var(--color-text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-task-title {
  margin: 0 0 1.5rem 0;
  font-weight: 600;
  color: var(--color-text-regular);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-regular);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

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

.btn-cancel {
  background: var(--color-bg-block-hover);
  border: none;
  color: var(--color-text-regular);
}

.btn-cancel:hover {
  background: var(--color-border-light);
}

.btn-save {
  background: var(--color-primary);
  border: none;
  color: white;
}

.btn-save:hover {
  background: var(--color-primary-dark);
}

/* 加载和错误状态 */
.loading,
.error {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

/* 成长记录样式 */
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
}

/* ========== 记录筛选器 ========== */
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

.filter-icon {
  font-size: 1rem;
}

.dropdown-arrow {
  width: 1rem;
  height: 1rem;
  transition: transform 0.3s ease;
}

.dropdown-arrow.is-open {
  transform: rotate(180deg);
}

/* 筛选下拉菜单 */
.filter-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 280px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  box-shadow: var(--shadow-card-hover);
  z-index: 100;
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

.filter-options {
  padding: 0.5rem;
}

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

.filter-option:hover {
  background: var(--color-bg-hover);
}

.filter-option.is-selected {
  background: var(--color-primary-light);
}

.option-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.option-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.option-check {
  color: var(--color-primary);
  font-weight: 600;
}

/* 筛选下拉动画 */
.filter-dropdown-enter-active,
.filter-dropdown-leave-active {
  transition: all 0.2s ease;
}

.filter-dropdown-enter-from,
.filter-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ========== 日期筛选器 ========== */
.date-filter-wrapper {
  position: relative;
}

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

.calendar-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.date-filter-label {
  font-size: 0.875rem;
}

/* 日期筛选下拉菜单 */
.date-filter-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 320px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  box-shadow: var(--shadow-card-hover);
  z-index: 100;
  overflow: hidden;
}

/* 日期预设按钮 */
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
  background: linear-gradient(135deg, var(--color-primary-gradient) 0%, var(--color-primary-dark) 100%);
  border-color: transparent;
  color: #FFFFFF;
}

/* 日期范围输入区域 */
.date-range-section {
  padding: 0.75rem;
}

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

.date-input-group .date-input:hover {
  border-color: var(--color-primary-medium);
}

.date-input-group .date-input:focus {
  outline: none;
  border-color: var(--color-primary-medium);
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.15);
}

.date-separator {
  display: none;
}

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

/* 移动端适配 */
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

  .date-input-group {
    flex: 1;
  }

  .btn-clear-date {
    width: auto;
  }
}

/* 月份分隔器优化 */
.month-divider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0.75rem 0;
  margin: 0 0 1rem 0;
}

.month-count {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-muted);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 重置筛选按钮 */
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

.btn-reset-filter:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

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
}

.btn-add-record:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(255, 138, 76, 0.35);
}

.btn-add-record svg {
  width: 1rem;
  height: 1rem;
}

.login-prompt {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--color-bg-page);
  border-radius: 1rem;
}

.login-prompt p {
  color: var(--color-text-regular);
  margin: 0 0 1rem 0;
}

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

/* 记录时间轴 - 优化版 */
.records-timeline {
  position: relative;
  padding-left: 3rem;
}

/* 主时间线 - 使用品牌色渐变 + 动画 */
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

/* 记录项容器 */
.record-item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 1.5rem;
  transition: transform 0.3s ease;
}

.record-item:hover {
  transform: translateX(4px);
}

/* 时间轴节点 - 使用品牌色 + 呼吸动画 */
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

/* 记录日期样式优化 */
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

/* 记录内容卡片 - 优化版 */
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

.record-item:hover .record-content::before {
  opacity: 1;
}

.record-photo {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--color-bg-block-hover);
}

.record-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 记录信息区域 - 优化版 */
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

.record-item:hover .record-pet-name {
  color: var(--color-primary);
}

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

.record-stat {
  font-size: 0.875rem;
  color: var(--color-text-regular);
}

.record-notes {
  font-size: 0.875rem;
  color: var(--color-text-regular);
  margin: 0.5rem 0 0 0;
  font-style: italic;
  line-height: 1.5;
}

/* ========== 领养纪念日特殊样式 ========== */
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

.record-item.is-adoption-day .record-day {
  color: #EC4899;
}

.record-item.is-adoption-day .record-content::after {
  content: '🎂';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 1.5rem;
  animation: mascot-bounce 1s ease-in-out infinite;
}

@keyframes anniversary-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(252, 211, 77, 0);
  }
}

@keyframes mascot-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* ========== Transition Group 动画 ========== */

/* 记录项进入动画 */
.record-item-enter-active {
  animation: record-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.record-item-leave-active {
  animation: record-slide-out 0.3s ease-in;
}

/* 记录项移动动画 */
.record-item-move {
  transition: transform 0.4s ease;
}

@keyframes record-slide-in {
  from {
    opacity: 0;
    transform: translateX(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes record-slide-out {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(30px) scale(0.9);
  }
}

/* 月份分组动画 */
.month-group {
  margin-bottom: 2rem;
}

.record-list-enter-active {
  animation: month-fade-in 0.3s ease-out;
}

.record-list-leave-active {
  animation: month-fade-out 0.2s ease-in;
}

@keyframes month-fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes month-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(10px); }
}

/* 空状态 */
.empty-records {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-page);
  border-radius: 1rem;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  color: var(--color-text-placeholder);
  margin: 0 0 1.5rem 0;
}

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

/* ================= 奶油风记录弹窗 ================= */
.record-modal {
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

/* 胶囊类型 Tab */
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

.type-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

.type-capsule:hover {
  background: var(--color-bg-warm);
}

.type-capsule.is-active {
  background: var(--color-primary-medium);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

/* 奶油风表单容器 */
.cream-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item.half {
  flex: 1;
}

.form-item.full {
  width: 100%;
}

.cream-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-regular);
}

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

.cream-input::placeholder {
  color: var(--color-text-placeholder);
}

.cream-input:read-only {
  opacity: 0.7;
  cursor: not-allowed;
}

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

.cream-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.cream-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
  cursor: pointer;
}

/* 带单位的输入框 */
.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit .cream-input {
  padding-right: 50px;
}

.input-with-unit .unit {
  position: absolute;
  right: 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  pointer-events: none;
}

/* 奶油风照片上传区 */
.photo-upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.photo-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-bg-cream);
  padding: 4px 10px;
  border-radius: 100px;
}

.premium-photo-area {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.photo-thumb-new {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.photo-thumb-new img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
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

.photo-remove:hover {
  background: var(--color-danger);
  transform: scale(1.1);
}

.photo-upload-trigger {
  width: 80px;
  height: 80px;
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

.photo-upload-trigger span {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
}

.hidden-input {
  display: none;
}

/* 奶油风复选框 */
.adoption-check {
  margin-top: 4px;
}

.cream-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.cream-checkbox input[type="checkbox"] {
  display: none;
}

.checkbox-mark {
  width: 20px;
  height: 20px;
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
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-icon {
  width: 18px;
  height: 18px;
  color: #FBBF24;
}

.cream-checkbox span:not(.checkbox-mark):not(.checkbox-icon) {
  font-size: 14px;
  color: var(--color-text-regular);
}

/* 月份分隔线 */
.month-divider {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-placeholder);
  padding: 0.5rem 0;
  margin: 1rem 0 0.5rem;
  border-bottom: 1px solid var(--color-border-light);
}

/* 多图缩略 */
/* 记录照片容器 - 优化版 */
.record-photos {
  flex-shrink: 0;
}

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

.record-photo-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.record-photo-main:hover img {
  transform: scale(1.1);
}

/* 照片数量角标 */
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

/* 类型徽章 - 使用品牌色 */
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

.type-badge:hover {
  transform: translateY(-1px);
}

/* 领养纪念日徽章 - 特殊样式 */
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.photo-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.full-width {
  grid-column: 1 / -1;
}

/* ===== SVG 图标样式 ===== */
.icon-date,
.icon-growth,
.photo-icon,
.icon-stat,
.type-icon,
.badge-icon,
.check-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  vertical-align: middle;
}

.icon-date :deep(svg),
.icon-growth :deep(svg),
.photo-icon :deep(svg),
.icon-stat :deep(svg),
.type-icon :deep(svg),
.badge-icon :deep(svg),
.check-icon :deep(svg) {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

.type-icon {
  width: 18px;
  height: 18px;
}

.type-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.badge-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
}

.badge-icon :deep(svg) {
  width: 12px;
  height: 12px;
  fill: var(--color-warning);
  stroke: var(--color-warning);
}

.check-icon :deep(svg) {
  stroke: var(--color-primary);
}

/* 记录类型图标 */
.record-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
}

.record-type-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

/* 分类图标 */
.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 6px;
}

.category-icon :deep(svg) {
  width: 14px;
  height: 14px;
}

/* 标题吉祥物 */
.title-mascot {
  margin-right: 8px;
  vertical-align: middle;
}

.badge-mascot {
  margin-right: 6px;
}

/* 空状态图标 */
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
}

.empty-icon :deep(svg) {
  width: 48px;
  height: 48px;
  stroke: var(--color-text-muted);
}

/* 领养纪念日样式 */
.adoption-check-label {
  display: inline-flex;
  align-items: center;
}

.adoption-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-warning-light);
  color: #b45309;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}

/* 任务分类样式 */
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
}

.category-badge.health { background: #fef2f2; color: var(--color-danger); }
.category-badge.feeding { background: #eff6ff; color: var(--color-info); }
.category-badge.training { background: #f3e8ff; color: #8A2BE2; }
.category-badge.care { background: #faf5ff; color: #9333ea; }

/* 撤销按钮 */
.uncomplete-btn {
  background: var(--color-bg-alt);
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-sub);
  cursor: pointer;
  transition: all 0.2s ease;
}

.uncomplete-btn:hover {
  background: var(--color-error-light);
  color: var(--color-error);
}
</style>

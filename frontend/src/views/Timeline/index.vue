<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useCatStore } from '../../stores/cat'
import { usePetStore } from '../../stores/pet'
import { useAuthStore } from '../../stores/auth'
import { useMyCatStore } from '../../stores/myCat'
import { storeToRefs } from 'pinia'
import { toast } from '../../composables/useToast'
import ImageLoader from '../../components/common/ImageLoader.vue'
import CatSelector from '../../components/cat/CatSelector.vue'
import type { Stage, Task } from '../../types/cat'
import type { CreatePetRecordParams } from '../../api/pet'

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
  recordDate: new Date().toISOString().split('T')[0],
  vaccineName: '', vaccineNextDate: '', vaccineClinic: '',
  dewormDrug: '', dewormType: '体内', dewormNextDate: '',
  checkClinic: '', checkVet: '', checkFindings: ''
})

// 任务详情弹窗
const showTaskModal = ref(false)
const currentTask = ref<Task | null>(null)
const taskCompletionDate = ref<string>('')
const taskNotes = ref<string>('')

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
})

// 监听猫咪变化，重新加载记录
watch(currentCat, async (newCat) => {
  if (authStore.isAuthenticated) {
    await petStore.fetchRecords(newCat?.id)
  }
})

// 选择阶段
function selectStage(stage: Stage) {
  selectedStage.value = stage
  activeTab.value = 'overview'
}

// 打开任务完成弹窗
function openTaskModal(task: Task) {
  currentTask.value = task
  const currentState = taskStates.value[task.id]

  if (currentState?.completed) {
    // 已完成，打开编辑详情
    taskCompletionDate.value = (currentState.date ?? new Date().toISOString().split('T')[0]) as string
    taskNotes.value = (currentState.notes ?? '') as string
    showTaskModal.value = true
  } else {
    // 未完成，直接标记为完成并打开弹窗
    const today = new Date().toISOString().split('T')[0]
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

// 取消完成任务
function uncompleteTask(taskId: string) {
  taskStates.value[taskId] = {
    completed: false,
    date: undefined,
    notes: undefined
  }
  localStorage.setItem('catTaskStates', JSON.stringify(taskStates.value))
}

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
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
    recordDate: new Date().toISOString().split('T')[0],
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

function handlePhotoSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || []).slice(0, 9)
  recordPhotoFiles.value = files
  recordPhotoPreviews.value = []
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => recordPhotoPreviews.value.push(e.target?.result as string)
    reader.readAsDataURL(file)
  })
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

// 任务分类
const taskCategories: Record<TaskCategory, TaskCategoryInfo> = {
  health: { name: '健康', icon: '🏥', color: 'bg-red-100 text-red-700' },
  feeding: { name: '喂养', icon: '🍽️', color: 'bg-blue-100 text-blue-700' },
  training: { name: '训练', icon: '🎾', color: 'bg-green-100 text-green-700' },
  care: { name: '护理', icon: '🧼', color: 'bg-purple-100 text-purple-700' }
}

// 记录类型配置
const RECORD_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  daily:       { label: '日常', icon: '📋', color: '#4ade80' },
  vaccine:     { label: '疫苗', icon: '💉', color: '#60a5fa' },
  deworm:      { label: '驱虫', icon: '🐛', color: '#f97316' },
  healthCheck: { label: '体检', icon: '🏥', color: '#a78bfa' },
  free:        { label: '自由', icon: '✏️', color: '#94a3b8' },
}

// 按月分组记录
const recordsByMonth = computed(() => {
  const groups: { month: string; records: typeof petStore.sortedRecords }[] = []
  const map = new Map<string, typeof petStore.sortedRecords>()
  for (const r of petStore.sortedRecords) {
    const month = r.recordDate.slice(0, 7) // YYYY-MM
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(r)
  }
  map.forEach((records, month) => groups.push({ month, records }))
  return groups.sort((a, b) => b.month.localeCompare(a.month))
})

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

const stageNavTitle = computed(() => {
  if (!currentCat.value) return '成长阶段'
  switch (currentCat.value.adoptStatus) {
    case 'raisedFromBaby':
    case 'adoptedYoung':
      return '成长阶段'
    case 'adoptedAdult':
      return '养护指南'
    case 'unknownAge':
      return '日常护理'
    default:
      return '成长阶段'
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
</script>

<template>
  <div class="timeline-page">
    <div class="page-header">
      <h1 class="page-title">
        🐱 {{ currentCat?.timelineTitle || '猫咪养成时间线' }}
      </h1>
      <p class="page-subtitle">{{ pageSubtitle }}</p>
    </div>

    <!-- 猫咪选择器 -->
    <div class="cat-selector-section" v-if="authStore.isAuthenticated">
      <CatSelector />
      <p class="records-hint" v-if="currentCat">
        正在查看 <strong>{{ currentCat.name }}</strong> 的{{ currentCat.timelineTitle || '成长记录' }}
      </p>
    </div>

    <div class="timeline-container">
      <!-- 阶段导航 -->
      <aside class="stage-nav">
        <h2 class="nav-title">{{ stageNavTitle }}</h2>
        <div class="stage-list">
          <button
            v-for="stage in filteredStages"
            :key="stage.id"
            :class="['stage-item', { active: selectedStage?.id === stage.id }]"
            @click="selectStage(stage)"
          >
            <div class="stage-indicator">
              <span class="stage-number">{{ stage.order }}</span>
            </div>
            <div class="stage-info">
              <h3 class="stage-name">{{ stage.name }}</h3>
              <p class="stage-age">{{ stage.ageRange }}</p>
            </div>
          </button>
        </div>
      </aside>

      <!-- 阶段详情 -->
      <main class="stage-detail" v-if="selectedStage">
        <!-- 详情头部 -->
        <div class="detail-header">
          <div class="stage-badge">
            <span class="badge-emoji">📋</span>
            <span class="badge-text">第 {{ selectedStage.order }} 阶段</span>
          </div>
          <h2 class="detail-title">{{ selectedStage.name }}</h2>
          <p class="detail-age">{{ selectedStage.ageRange }}</p>
          <p class="detail-description">{{ selectedStage.description }}</p>
        </div>

        <!-- 标签页 -->
        <div class="tabs">
          <button
            :class="['tab', { active: activeTab === 'overview' }]"
            @click="activeTab = 'overview'"
          >
            <span class="tab-icon">📊</span>
            概览
          </button>
          <button
            :class="['tab', { active: activeTab === 'tasks' }]"
            @click="activeTab = 'tasks'"
          >
            <span class="tab-icon">✅</span>
            任务清单
            <span class="tab-badge" v-if="taskProgress.total > 0">
              {{ taskProgress.completed }}/{{ taskProgress.total }}
            </span>
          </button>
          <button
            :class="['tab', { active: activeTab === 'vaccines' }]"
            @click="activeTab = 'vaccines'"
            :disabled="!selectedStage.vaccines || selectedStage.vaccines.length === 0"
          >
            <span class="tab-icon">💉</span>
            疫苗接种
          </button>
          <button
            :class="['tab', { active: activeTab === 'growth' }]"
            @click="activeTab = 'growth'"
          >
            <span class="tab-icon">📸</span>
            成长记录
            <span class="tab-badge" v-if="petStore.recordCount > 0">
              {{ petStore.recordCount }}
            </span>
          </button>
        </div>

        <!-- 概览内容 -->
        <div v-show="activeTab === 'overview'" class="tab-content">
          <!-- 里程碑 -->
          <section class="section" v-if="selectedStage.milestones && selectedStage.milestones.length > 0">
            <h3 class="section-title">
              <span class="section-icon">🏆</span>
              里程碑
            </h3>
            <div class="milestones">
              <div
                v-for="milestone in selectedStage.milestones"
                :key="milestone.id"
                class="milestone-card"
              >
                <span class="milestone-icon">{{ milestone.icon || '🎯' }}</span>
                <div class="milestone-content">
                  <h4 class="milestone-title">{{ milestone.title }}</h4>
                  <p class="milestone-description">{{ milestone.description }}</p>
                  <span class="milestone-age">{{ milestone.ageWeeks }}周</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 任务预览 -->
          <section class="section">
            <h3 class="section-title">
              <span class="section-icon">📝</span>
              重要任务
            </h3>
            <div class="task-preview">
              <div
                v-for="task in selectedStage!.tasks?.slice(0, 3)"
                :key="task.id"
                class="task-preview-item"
              >
                <span class="task-dot" :class="taskCategories[task.category]!.color">
                  {{ taskCategories[task.category]!.icon }}
                </span>
                <span class="task-name">{{ task.title }}</span>
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
                  <span :class="['category-badge', taskCategories[category].color]">
                    {{ taskCategories[category].icon }}
                    {{ taskCategories[category].name }}
                  </span>
                </h4>
                <div class="category-tasks">
                  <div
                    v-for="task in selectedStage!.tasks?.filter((t: Task) => t.category === category)"
                    :key="task.id"
                    class="task-item"
                    :class="{ completed: taskStates[task.id]?.completed }"
                  >
                  <div class="task-checkbox-wrapper">
                    <input
                      type="checkbox"
                      :checked="taskStates[task.id]?.completed"
                      @change="openTaskModal(task)"
                      class="task-checkbox"
                    />
                  </div>
                  <div class="task-content" @click="openTaskModal(task)">
                    <span class="task-title">{{ task.title }}</span>
                    <p v-if="task.description" class="task-description">{{ task.description }}</p>
                    <!-- 完成信息 -->
                    <div v-if="taskStates[task.id]?.completed" class="task-completion-info">
                      <span v-if="taskStates[task.id]?.date" class="completion-date">
                        📅 {{ formatDate(taskStates[task.id]!.date!) }}
                      </span>
                      <p v-if="taskStates[task.id]?.notes" class="completion-notes">
                        📝 {{ taskStates[task.id]!.notes! }}
                      </p>
                    </div>
                  </div>
                  <div class="task-actions">
                    <span class="priority-badge" :class="`priority-${task.priority}`">
                      {{ task.priority === 1 ? '高' : task.priority === 2 ? '中' : '低' }}
                    </span>
                    <button
                      v-if="taskStates[task.id]?.completed"
                      @click.stop="uncompleteTask(task.id)"
                      class="uncomplete-btn"
                      title="取消完成"
                    >
                      ↩️
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </template>
          </div>
        </div>

        <!-- 疫苗接种内容 -->
        <div v-show="activeTab === 'vaccines'" class="tab-content">
          <div v-if="selectedStage.vaccines && selectedStage.vaccines.length > 0" class="vaccines-list">
            <div
              v-for="vaccine in selectedStage.vaccines"
              :key="vaccine.id"
              class="vaccine-card"
            >
              <div class="vaccine-icon">💉</div>
              <div class="vaccine-content">
                <h4 class="vaccine-name">{{ vaccine.name }}</h4>
                <p v-if="vaccine.description" class="vaccine-description">{{ vaccine.description }}</p>
                <span class="vaccine-age">接种时间：{{ vaccine.ageWeeks }}周</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p class="empty-text">此阶段无需接种特殊疫苗</p>
          </div>
        </div>

        <!-- 成长记录内容 -->
        <div v-show="activeTab === 'growth'" class="tab-content">
          <div class="growth-header">
            <h3 class="growth-title">📸 宠物成长记录</h3>
            <button @click="openAddRecordModal" class="btn-add-record">
              + 添加记录
            </button>
          </div>

          <!-- 未登录提示 -->
          <div v-if="!authStore.isAuthenticated" class="login-prompt">
            <p>请先登录以使用宠物成长记录功能</p>
            <button @click="$router.push('/login')" class="btn-login">去登录</button>
          </div>

          <!-- 记录列表（按月分组） -->
          <div v-else-if="petStore.hasRecords" class="records-timeline">
            <template v-for="group in recordsByMonth" :key="group.month">
              <div class="month-divider">{{ group.month.replace('-', '年') }}月</div>
              <div
                v-for="record in group.records"
                :key="record.id"
                class="record-item"
              >
                <div class="record-date">
                  <span class="record-day">{{ new Date(record.recordDate).getDate() }}</span>
                  <span class="record-month">{{ new Date(record.recordDate).toLocaleDateString('zh-CN', { month: 'short' }) }}</span>
                </div>
                <div class="record-content">
                  <!-- 多图缩略 -->
                  <div v-if="record.photos && record.photos.length > 0" class="record-photos">
                    <div class="record-photo-main">
                      <ImageLoader :src="`http://localhost:3000${record.photos[0]}`" :alt="record.petName" fit="cover" />
                      <span v-if="record.photos.length > 1" class="photo-count-badge">+{{ record.photos.length - 1 }}</span>
                    </div>
                  </div>
                  <div v-else-if="record.photoUrl" class="record-photos">
                    <div class="record-photo-main">
                      <ImageLoader :src="`http://localhost:3000${record.photoUrl}`" :alt="record.petName" fit="cover" />
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
                          {{ RECORD_TYPE_CONFIG[record.type]!.icon }} {{ RECORD_TYPE_CONFIG[record.type]!.label }}
                        </span>
                        <span v-if="record.isAdoptionDay" class="adoption-badge">🎉 领养纪念日</span>
                      </div>
                      <button @click="deletePetRecord(record.id)" class="btn-delete-record" title="删除记录">×</button>
                    </div>
                    <div class="record-stats">
                      <span v-if="!shouldHideAge && record.ageMonths" class="record-stat">📅 {{ record.ageMonths }}个月 ({{ record.ageWeeks }}周)</span>
                      <span v-else-if="shouldHideAge && catDisplayLabel" class="record-stat">📅 {{ catDisplayLabel }}</span>
                      <span v-if="record.weight" class="record-stat">⚖️ {{ record.weight }}kg</span>
                    </div>
                    <p v-if="record.notes" class="record-notes">{{ record.notes }}</p>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-records">
            <span class="empty-icon">📸</span>
            <p class="empty-text">还没有成长记录</p>
            <p class="empty-hint">记录宠物的成长瞬间，留下美好回忆</p>
            <button @click="openAddRecordModal" class="btn-add-first-record">
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
          <h3 class="modal-title">✅ 标记任务完成</h3>
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
          <h3 class="modal-title">📸 添加成长记录</h3>
          <button @click="closeAddRecordModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <!-- 记录类型 Tab -->
          <div class="record-type-tabs">
            <button
              v-for="(cfg, key) in RECORD_TYPE_CONFIG"
              :key="key"
              :class="['type-tab', { active: recordType === key }]"
              :style="recordType === key ? { borderColor: cfg.color, color: cfg.color } : {}"
              @click="recordType = key as any"
            >
              {{ cfg.icon }} {{ cfg.label }}
            </button>
          </div>

          <!-- 基础字段 -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">宠物名称</label>
              <input v-model="recordForm.petName" type="text" class="form-input" placeholder="猫咪" />
            </div>
            <div class="form-group">
              <label class="form-label">记录日期</label>
              <input v-model="recordForm.recordDate" type="date" class="form-input" />
            </div>
          </div>

          <!-- daily 字段 -->
          <template v-if="recordType === 'daily'">
            <div class="form-row">
              <div class="form-group" v-if="!shouldHideAge">
                <label class="form-label">年龄（周）</label>
                <input v-model.number="recordForm.ageWeeks" type="number" min="0" class="form-input" placeholder="0" />
              </div>
              <div class="form-group" :class="{ 'full-width': shouldHideAge }">
                <label class="form-label">体重（kg）</label>
                <input v-model.number="recordForm.weight" type="number" min="0" step="0.1" class="form-input" placeholder="0.0" />
              </div>
            </div>
          </template>

          <!-- vaccine 字段 -->
          <template v-else-if="recordType === 'vaccine'">
            <div class="form-group">
              <label class="form-label">疫苗名称 *</label>
              <input v-model="recordForm.vaccineName" type="text" class="form-input" placeholder="如：猫三联" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">下次接种日期</label>
                <input v-model="recordForm.vaccineNextDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">接种医院</label>
                <input v-model="recordForm.vaccineClinic" type="text" class="form-input" placeholder="医院名称" />
              </div>
            </div>
          </template>

          <!-- deworm 字段 -->
          <template v-else-if="recordType === 'deworm'">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">药品名称 *</label>
                <input v-model="recordForm.dewormDrug" type="text" class="form-input" placeholder="如：拜宠清" />
              </div>
              <div class="form-group">
                <label class="form-label">类型</label>
                <select v-model="recordForm.dewormType" class="form-input">
                  <option>体内</option>
                  <option>体外</option>
                  <option>体内+体外</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">下次驱虫日期</label>
              <input v-model="recordForm.dewormNextDate" type="date" class="form-input" />
            </div>
          </template>

          <!-- healthCheck 字段 -->
          <template v-else-if="recordType === 'healthCheck'">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">医院</label>
                <input v-model="recordForm.checkClinic" type="text" class="form-input" placeholder="医院名称" />
              </div>
              <div class="form-group">
                <label class="form-label">医生</label>
                <input v-model="recordForm.checkVet" type="text" class="form-input" placeholder="医生姓名" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">检查结果/建议</label>
              <textarea v-model="recordForm.checkFindings" class="form-textarea" rows="2" placeholder="检查结果或医生建议..."></textarea>
            </div>
          </template>

          <!-- 备注（所有类型通用） -->
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="recordForm.notes" class="form-textarea" placeholder="记录一些特别的瞬间..." rows="2"></textarea>
          </div>

          <!-- 多图上传 -->
          <div class="form-group">
            <label class="form-label">照片（最多9张）</label>
            <div class="photos-upload-area">
              <div v-for="(preview, i) in recordPhotoPreviews" :key="i" class="photo-thumb">
                <img :src="preview" alt="预览" />
              </div>
              <label v-if="recordPhotoPreviews.length < 9" class="photo-add-btn">
                <input type="file" accept="image/*" multiple @change="handlePhotoSelect" class="photo-input" />
                <span>📷</span>
                <span style="font-size:0.75rem">添加</span>
              </label>
            </div>
          </div>

          <!-- 领养纪念日 -->
          <div v-if="currentCat?.adoptDate" class="form-group adoption-day-check">
            <label class="checkbox-label">
              <input type="checkbox" v-model="isAdoptionDay" />
              <span>🎉 标记为领养纪念日</span>
            </label>
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

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
}

.cat-selector-section {
  max-width: 400px;
  margin: 0 auto 2rem;
  text-align: center;
}

.records-hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
}

.records-hint strong {
  color: #f97316;
}

.timeline-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

/* 阶段导航 */
.stage-nav {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 6rem;
}

.nav-title {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 1rem 0;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.stage-item:hover {
  background: #f8fafc;
}

.stage-item.active {
  border-color: #f97316;
  background: #fff7ed;
}

.stage-indicator {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.stage-info {
  flex: 1;
}

.stage-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stage-age {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* 阶段详情 */
.stage-detail {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  margin-bottom: 1rem;
}

.badge-emoji {
  font-size: 1.25rem;
}

.badge-text {
  font-weight: 600;
  color: #92400e;
}

.detail-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.detail-age {
  font-size: 1.25rem;
  color: #f97316;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.detail-description {
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
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
  color: #64748b;
  transition: all 0.2s ease;
  margin-bottom: -2px;
}

.tab:hover:not(:disabled) {
  color: #f97316;
}

.tab.active {
  color: #f97316;
  border-bottom-color: #f97316;
}

.tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-badge {
  background: #f97316;
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
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.section-icon {
  font-size: 1.5rem;
}

/* 里程碑 */
.milestones {
  display: grid;
  gap: 1rem;
}

.milestone-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
  border-radius: 0.75rem;
}

.milestone-icon {
  font-size: 2rem;
}

.milestone-content {
  flex: 1;
}

.milestone-title {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.milestone-description {
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.milestone-age {
  display: inline-block;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  color: #f97316;
  font-weight: 500;
}

/* 任务预览 */
.task-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.task-dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.task-name {
  color: #475569;
}

.view-all-btn {
  color: #f97316;
  background: transparent;
  border: none;
  padding: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  text-align: left;
}

.view-all-btn:hover {
  text-decoration: underline;
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
  color: #64748b;
}

.progress-percentage {
  font-weight: 600;
  color: #f97316;
}

.progress-bar {
  height: 0.75rem;
  background: #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
  transition: width 0.3s ease;
}

/* 任务列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

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
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.category-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.task-item:hover {
  border-color: #f97316;
}

.task-item.completed {
  opacity: 0.7;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.task-item.completed .task-title {
  text-decoration: line-through;
}

.task-checkbox-wrapper {
  padding-top: 0.25rem;
}

.task-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #f97316;
  cursor: pointer;
}

.task-content {
  flex: 1;
  cursor: pointer;
}

.task-title {
  font-weight: 500;
  color: #1e293b;
}

.task-description {
  color: #64748b;
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.task-completion-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #e2e8f0;
}

.completion-date {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #16a34a;
  font-weight: 500;
}

.completion-notes {
  color: #64748b;
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  white-space: pre-wrap;
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
  color: #dc2626;
}

.priority-2 {
  background: #fef3c7;
  color: #d97706;
}

.priority-3 {
  background: #f0fdf4;
  color: #16a34a;
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

/* 疫苗列表 */
.vaccines-list {
  display: grid;
  gap: 1rem;
}

.vaccine-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 0.75rem;
}

.vaccine-icon {
  font-size: 2rem;
}

.vaccine-content {
  flex: 1;
}

.vaccine-name {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.vaccine-description {
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.vaccine-age {
  display: inline-block;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  color: #2563eb;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-text {
  color: #94a3b8;
  margin: 0;
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
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #64748b;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.modal-close:hover {
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
}

.modal-task-title {
  margin: 0 0 1.5rem 0;
  font-weight: 600;
  color: #475569;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #475569;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #f97316;
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
  border-top: 1px solid #e2e8f0;
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
  background: #f1f5f9;
  border: none;
  color: #64748b;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-save {
  background: #f97316;
  border: none;
  color: white;
}

.btn-save:hover {
  background: #ea580c;
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
  border: 3px solid #e2e8f0;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

/* 响应式 */
@media (max-width: 968px) {
  .timeline-container {
    grid-template-columns: 1fr;
  }

  .stage-nav {
    position: static;
  }
}

/* 成长记录样式 */
.growth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.growth-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-add-record {
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-add-record:hover {
  opacity: 0.9;
}

.login-prompt {
  text-align: center;
  padding: 3rem 2rem;
  background: #f8fafc;
  border-radius: 1rem;
}

.login-prompt p {
  color: #64748b;
  margin: 0 0 1rem 0;
}

.btn-login {
  padding: 0.75rem 1.5rem;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

/* 记录时间轴 */
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
  width: 2px;
  background: linear-gradient(to bottom, #f97316, #eab308);
}

.record-item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 1.5rem;
}

.record-item::before {
  content: '';
  position: absolute;
  left: -2.75rem;
  top: 0.5rem;
  width: 1rem;
  height: 1rem;
  background: white;
  border: 3px solid #f97316;
  border-radius: 50%;
}

.record-date {
  position: absolute;
  left: -5rem;
  top: 0;
  text-align: center;
}

.record-day {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f97316;
  line-height: 1;
}

.record-month {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.record-content {
  display: flex;
  gap: 1rem;
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.record-photo {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #f1f5f9;
}

.record-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record-info {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.record-pet-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-delete-record {
  width: 28px;
  height: 28px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-delete-record:hover {
  background: #fef2f2;
  color: #ef4444;
}

.record-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.record-stat {
  font-size: 0.875rem;
  color: #64748b;
}

.record-notes {
  font-size: 0.875rem;
  color: #475569;
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

/* 空状态 */
.empty-records {
  text-align: center;
  padding: 4rem 2rem;
  background: #f8fafc;
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
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  color: #94a3b8;
  margin: 0 0 1.5rem 0;
}

.btn-add-first-record {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

/* 记录弹窗样式 */
.record-modal {
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.record-type-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.type-tab {
  padding: 0.375rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 2rem;
  background: transparent;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.type-tab:hover {
  border-color: #94a3b8;
}

.type-tab.active {
  font-weight: 600;
}

.photos-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.photo-thumb {
  width: 72px;
  height: 72px;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-add-btn {
  width: 72px;
  height: 72px;
  border: 2px dashed #cbd5e1;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.25rem;
  color: #94a3b8;
  position: relative;
  transition: all 0.2s;
}

.photo-add-btn:hover {
  border-color: #f97316;
  color: #f97316;
}

.adoption-day-check {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  color: #475569;
}

.checkbox-label input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: #f97316;
}

/* 月份分隔线 */
.month-divider {
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  padding: 0.5rem 0;
  margin: 1rem 0 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

/* 多图缩略 */
.record-photos {
  flex-shrink: 0;
}

.record-photo-main {
  width: 120px;
  height: 120px;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #f1f5f9;
  position: relative;
}

.photo-count-badge {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
}

/* 类型徽章 */
.type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-weight: 500;
}

.adoption-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  background: #fef3c7;
  color: #d97706;
  font-weight: 500;
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
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: none;
  border-color: #f97316;
}

.full-width {
  grid-column: 1 / -1;
}
</style>

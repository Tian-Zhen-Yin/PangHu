<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCatStore } from '../../stores/cat'
import { usePetStore } from '../../stores/pet'
import { useAuthStore } from '../../stores/auth'
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
const selectedStage = ref<Stage | null>(null)
const activeTab = ref<'overview' | 'tasks' | 'vaccines' | 'growth'>('overview')

// 任务状态管理（前端本地）
const taskStates = ref<Record<string, TaskState>>({})

// 宠物记录相关状态
const showAddRecordModal = ref(false)
const recordPhotoFile = ref<File | null>(null)
const recordPhotoPreview = ref<string>('')
const recordForm = ref({
  petName: '猫咪',
  ageWeeks: 0,
  ageMonths: 0,
  weight: 0,
  notes: '',
  recordDate: new Date().toISOString().split('T')[0]
})

// 任务详情弹窗
const showTaskModal = ref(false)
const currentTask = ref<Task | null>(null)
const taskCompletionDate = ref<string>('')
const taskNotes = ref<string>('')

onMounted(async () => {
  await catStore.fetchStages()
  if (catStore.stages.length > 0) {
    selectedStage.value = catStore.stages[0]!
  }

  // 加载任务状态
  const saved = localStorage.getItem('catTaskStates')
  if (saved) {
    try {
      taskStates.value = JSON.parse(saved)
    } catch {
      taskStates.value = {}
    }
  }

  // 如果已登录，加载宠物记录
  if (authStore.isAuthenticated) {
    await petStore.fetchRecords()
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
    alert('请先登录')
    return
  }
  recordForm.value = {
    petName: '猫咪',
    ageWeeks: 0,
    ageMonths: 0,
    weight: 0,
    notes: '',
    recordDate: new Date().toISOString().split('T')[0]
  }
  recordPhotoFile.value = null
  recordPhotoPreview.value = ''
  showAddRecordModal.value = true
}

function closeAddRecordModal() {
  showAddRecordModal.value = false
  recordPhotoFile.value = null
  recordPhotoPreview.value = ''
}

function handlePhotoSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    recordPhotoFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      recordPhotoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function calculateAgeMonths(ageWeeks: number): number {
  return Math.floor(ageWeeks / 4)
}

async function savePetRecord() {
  if (!recordPhotoFile.value) {
    alert('请上传照片')
    return
  }

  const params: CreatePetRecordParams = {
    petName: recordForm.value.petName,
    photoUrl: '', // 会在上传后由服务器返回
    ageWeeks: recordForm.value.ageWeeks,
    ageMonths: recordForm.value.ageMonths || calculateAgeMonths(recordForm.value.ageWeeks),
    weight: recordForm.value.weight,
    notes: recordForm.value.notes || undefined,
    recordDate: recordForm.value.recordDate
  }

  const success = await petStore.createRecord(params, recordPhotoFile.value)
  if (success) {
    closeAddRecordModal()
  } else {
    alert('保存失败，请重试')
  }
}

async function deletePetRecord(recordId: string) {
  if (confirm('确定要删除这条记录吗？')) {
    await petStore.deleteRecord(recordId)
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
</script>

<template>
  <div class="timeline-page">
    <div class="page-header">
      <h1 class="page-title">🐱 猫咪养成时间线</h1>
      <p class="page-subtitle">从新生到成年的完整成长路径</p>
    </div>

    <div class="timeline-container">
      <!-- 阶段导航 -->
      <aside class="stage-nav">
        <h2 class="nav-title">成长阶段</h2>
        <div class="stage-list">
          <button
            v-for="stage in catStore.stages"
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

          <!-- 记录列表 -->
          <div v-else-if="petStore.hasRecords" class="records-timeline">
            <div
              v-for="record in petStore.sortedRecords"
              :key="record.id"
              class="record-item"
            >
              <div class="record-date">
                <span class="record-day">{{ new Date(record.recordDate).getDate() }}</span>
                <span class="record-month">{{ new Date(record.recordDate).toLocaleDateString('zh-CN', { month: 'short' }) }}</span>
              </div>
              <div class="record-content">
                <div class="record-photo">
                  <img :src="`http://localhost:3000${record.photoUrl}`" :alt="record.petName" />
                </div>
                <div class="record-info">
                  <div class="record-header">
                    <h4 class="record-pet-name">{{ record.petName }}</h4>
                    <button @click="deletePetRecord(record.id)" class="btn-delete-record" title="删除记录">
                      ×
                    </button>
                  </div>
                  <div class="record-stats">
                    <span class="record-stat">
                      📅 {{ record.ageMonths }}个月 ({{ record.ageWeeks }}周)
                    </span>
                    <span class="record-stat">
                      ⚖️ {{ record.weight }}kg
                    </span>
                  </div>
                  <p v-if="record.notes" class="record-notes">{{ record.notes }}</p>
                </div>
              </div>
            </div>
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
          <!-- 照片上传 -->
          <div class="form-group">
            <label class="form-label">宠物照片 *</label>
            <div class="photo-upload">
              <div v-if="recordPhotoPreview" class="photo-preview">
                <img :src="recordPhotoPreview" alt="预览" />
                <button @click="recordPhotoPreview = ''; recordPhotoFile = null" class="btn-remove-photo">
                  更换照片
                </button>
              </div>
              <label v-else class="photo-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  @change="handlePhotoSelect"
                  class="photo-input"
                />
                <span class="upload-icon">📷</span>
                <span class="upload-text">点击上传照片</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">宠物名称</label>
              <input
                v-model="recordForm.petName"
                type="text"
                class="form-input"
                placeholder="猫咪"
              />
            </div>
            <div class="form-group">
              <label class="form-label">记录日期</label>
              <input
                v-model="recordForm.recordDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">年龄（周）*</label>
              <input
                v-model.number="recordForm.ageWeeks"
                type="number"
                min="0"
                class="form-input"
                placeholder="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">体重（kg）*</label>
              <input
                v-model.number="recordForm.weight"
                type="number"
                min="0"
                step="0.1"
                class="form-input"
                placeholder="0.0"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea
              v-model="recordForm.notes"
              class="form-textarea"
              placeholder="记录一些特别的瞬间..."
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAddRecordModal" class="btn-cancel">取消</button>
          <button @click="savePetRecord" class="btn-save" :disabled="!recordPhotoFile || recordForm.ageWeeks < 0 || recordForm.weight <= 0">
            保存记录
          </button>
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
  max-width: 500px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.photo-upload {
  width: 100%;
}

.photo-preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 0.75rem;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-photo {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.photo-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed #cbd5e1;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.photo-upload-label:hover {
  border-color: #f97316;
  background: #fff7ed;
}

.photo-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.upload-text {
  color: #64748b;
  font-size: 0.875rem;
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
</style>

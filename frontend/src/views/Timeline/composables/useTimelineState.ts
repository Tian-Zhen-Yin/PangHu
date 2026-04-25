import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatStore } from '../../../stores/cat'
import { useMyCatStore } from '../../../stores/myCat'
import { useAuthStore } from '../../../stores/auth'
import type { Stage } from '../../../types/cat'

/**
 * Tracks per-task completion status, optional date, and notes.
 */
export interface TaskState {
  completed: boolean
  date?: string
  notes?: string
}

const STORAGE_KEY_PREFIX = 'catTaskStates'

function storageKey(catId: string): string {
  return `${STORAGE_KEY_PREFIX}_${catId}`
}

// ------------------------------------------------------------------ state
// Shared singleton state — every consumer of useTimelineState() sees the
// same selectedStage and taskStates, so TimelineLayout and each tab page
// stay in sync without props or events.
const selectedStage = ref<Stage | null>(null)
const taskStates = ref<Record<string, TaskState>>({})

export function useTimelineState() {
  const catStore = useCatStore()
  const myCatStore = useMyCatStore()
  const authStore = useAuthStore()
  const { currentCat } = storeToRefs(myCatStore)

  // ------------------------------------------------------------- computed
  /** All stages from the cat store, unfiltered. */
  const stages = computed(() => catStore.stages)

  /**
   * Stages filtered by the current cat's adoption status.
   * - raisedFromBaby: all stages
   * - adoptedYoung: minAgeWeeks >= 8
   * - adoptedAdult / unknownAge: minAgeWeeks >= 52
   */
  const filteredStages = computed(() => {
    if (!currentCat.value) return catStore.stages

    switch (currentCat.value.adoptStatus) {
      case 'raisedFromBaby':
        return catStore.stages
      case 'adoptedYoung':
        return catStore.stages.filter(s => s.minAgeWeeks >= 8)
      case 'adoptedAdult':
      case 'unknownAge':
        return catStore.stages.filter(s => s.minAgeWeeks >= 52)
      default:
        return catStore.stages
    }
  })

  /** Dynamic subtitle based on the current cat's adoption status. */
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

  /** Task completion stats for the currently selected stage. */
  const taskProgress = computed(() => {
    if (!selectedStage.value?.tasks) return { completed: 0, total: 0, percentage: 0 }
    const total = selectedStage.value.tasks.length
    const completed = selectedStage.value.tasks.filter(
      t => taskStates.value[t.id]?.completed,
    ).length
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  // --------------------------------------------------------------- helpers

  /** Read task states for a cat from localStorage. */
  function loadTaskStates(catId: string): void {
    const saved = localStorage.getItem(storageKey(catId))
    if (saved) {
      try {
        taskStates.value = JSON.parse(saved) as Record<string, TaskState>
      } catch {
        taskStates.value = {}
      }
    } else {
      taskStates.value = {}
    }
  }

  /** Persist current task states for a cat to localStorage. */
  function saveTaskStates(catId: string): void {
    localStorage.setItem(storageKey(catId), JSON.stringify(taskStates.value))
  }

  /**
   * Toggle a task's completion status (immutable update).
   * If currently completed, un-completes it. Otherwise marks completed.
   */
  function toggleTask(taskId: string, catId: string): void {
    const current = taskStates.value[taskId]
    if (current?.completed) {
      taskStates.value = {
        ...taskStates.value,
        [taskId]: { completed: false, date: undefined, notes: undefined },
      }
    } else {
      taskStates.value = {
        ...taskStates.value,
        [taskId]: {
          completed: true,
          date: new Date().toISOString().split('T')[0],
          notes: undefined,
        },
      }
    }
    saveTaskStates(catId)
  }

  /**
   * Mark a task as completed with a specific date and optional notes
   * (immutable update).
   */
  function completeTask(
    taskId: string,
    catId: string,
    date: string,
    notes?: string,
  ): void {
    taskStates.value = {
      ...taskStates.value,
      [taskId]: { completed: true, date, notes: notes?.trim() || undefined },
    }
    saveTaskStates(catId)
  }

  return {
    catStore,
    myCatStore,
    authStore,
    currentCat,
    // state
    selectedStage,
    taskStates,
    // computed
    stages,
    filteredStages,
    pageSubtitle,
    taskProgress,
    // functions
    loadTaskStates,
    saveTaskStates,
    toggleTask,
    completeTask,
  }
}

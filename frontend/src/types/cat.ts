// 猫咪成长相关类型定义

/**
 * 成长阶段
 */
export interface Stage {
  id: string
  name: string
  ageRange: string
  description: string
  order: number
  minAgeWeeks: number
  maxAgeWeeks: number | null
  milestones?: Milestone[]
  tasks?: Task[]
  vaccines?: Vaccine[]
}

/**
 * 里程碑
 */
export interface Milestone {
  id: string
  title: string
  description: string
  ageWeeks: number
  icon: string | null
  stageId: string
}

/**
 * 任务清单
 */
export interface Task {
  id: string
  title: string
  description: string | null
  category: 'health' | 'feeding' | 'training' | 'care'
  priority: 1 | 2 | 3 // 1-高，2-中，3-低
  stageId: string
  completed?: boolean // 前端用于标记完成状态
}

/**
 * 疫苗接种
 */
export interface Vaccine {
  id: string
  name: string
  ageWeeks: number
  description: string | null
  stageId: string
}

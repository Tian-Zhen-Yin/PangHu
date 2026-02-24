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
 * 疫苗接种（成长阶段用）
 */
export interface Vaccine {
  id: string
  name: string
  ageWeeks: number
  description: string | null
  stageId: string
}

// ===== 猫咪档案相关类型 =====

export type CatGender = 'male' | 'female' | 'unknown'

/**
 * 猫咪档案
 */
export interface Cat {
  id: string
  userId: string
  name: string
  avatar: string | null
  breed: string | null
  gender: CatGender
  birthDate: string
  adoptDate: string | null
  weight: number | null
  isNeutered: boolean
  neuteredDate: string | null
  color: string | null
  features: string | null
  allergies: string | null
  diseases: string | null
  isActive: boolean
  ageMonths: number
  ageFormatted: string
  lastVaccine?: VaccineRecord | null
  lastRecord?: any | null
  createdAt: string
  updatedAt: string
}

/**
 * 创建/更新猫咪的表单数据
 */
export interface CatFormData {
  name: string
  gender: CatGender
  birthDate: string
  breed?: string
  avatar?: string
  adoptDate?: string
  weight?: number
  isNeutered?: boolean
  neuteredDate?: string
  color?: string
  features?: string
  allergies?: string
  diseases?: string
}

/**
 * 疫苗接种记录
 */
export interface VaccineRecord {
  id: string
  catId: string
  vaccineName: string
  vaccineType: string
  manufacturer: string | null
  batchNumber: string | null
  vaccinatedAt: string
  nextDueDate: string | null
  veterinarian: string | null
  clinic: string | null
  reaction: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  cat?: Pick<Cat, 'id' | 'name' | 'avatar'>
}

/**
 * 创建/更新疫苗记录的表单数据
 */
export interface VaccineFormData {
  catId: string
  vaccineName: string
  vaccineType?: string
  manufacturer?: string
  batchNumber?: string
  vaccinatedAt: string
  nextDueDate?: string
  veterinarian?: string
  clinic?: string
  reaction?: string
  notes?: string
}

/**
 * 体重历史记录
 */
export interface WeightHistoryRecord {
  date: string
  weight: number
  notes?: string | null
}


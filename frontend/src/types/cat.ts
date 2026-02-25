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
 * 领养状态
 */
export type CatAdoptStatus = 'raisedFromBaby' | 'adoptedYoung' | 'adoptedAdult' | 'unknownAge'

/**
 * 领养状态配置
 */
export const ADOPT_STATUS_CONFIG: Record<CatAdoptStatus, { label: string; description: string }> = {
  raisedFromBaby: { label: '从小养到大', description: '从小养到大，完整记录成长' },
  adoptedYoung: { label: '领养（幼年）', description: '领养的幼年猫咪，从领养日开始记录' },
  adoptedAdult: { label: '领养（成年）', description: '领养的成年猫咪，关注健康养护' },
  unknownAge: { label: '年龄不详', description: '不知道年龄，关注日常健康' },
}

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
  birthDateEstimated: boolean // 出生日期是否为估算
  adoptDate: string | null // 领养日期（开始饲养日期）
  adoptStatus: CatAdoptStatus // 领养状态
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
  timelineTitle?: string // 时间线标题（根据领养状态动态生成）
  weightGoalTarget?: number | null // 目标体重
  weightGoalDate?: string | null // 目标日期
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
  birthDateEstimated?: boolean
  breed?: string
  avatar?: string
  adoptDate?: string
  adoptStatus?: CatAdoptStatus
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


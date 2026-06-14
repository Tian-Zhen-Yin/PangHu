/**
 * Agent 卡片组件注册表
 *
 * 按 toolName 分发到对应的卡片组件。
 * 新增工具时只需在此注册，无需修改 ChatMessage.vue。
 *
 * 注册的组件接收统一的 props 契约：
 *   - toolOutput: 工具执行返回的原始数据（any）
 *
 * 卡片组件自行负责数据提取与验证，output 为空时不应渲染。
 */

import type { Component } from 'vue'
import CatInfoCard from './CatInfoCard.vue'
import HealthSummaryCard from './HealthSummaryCard.vue'
import WeightTrendCard from './WeightTrendCard.vue'
import VaccineStatusCard from './VaccineStatusCard.vue'
import AllergyCard from './AllergyCard.vue'
import HealthReportCard from './HealthReportCard.vue'

export interface CardComponentProps {
  toolOutput: any
}

export const cardRegistry: Record<string, Component> = {
  get_cat_info: CatInfoCard,
  check_health: HealthSummaryCard,
  get_weight_trend: WeightTrendCard,
  check_vaccine: VaccineStatusCard,
  GET_allergy_records: AllergyCard,
  GENERATE_health_report: HealthReportCard,
}

/**
 * 判断给定 toolName 是否有注册的卡片组件
 */
export function hasCard(toolName: string): boolean {
  return toolName in cardRegistry
}

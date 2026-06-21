import type { Tool } from '../types/agent'
import { CatInfoTool } from './catInfo.tool'
import { WeightTrendTool } from './weightTrend.tool'
import { HealthCheckTool } from './healthCheck.tool'
import { VaccineCheckTool } from './vaccineCheck.tool'
import { RagSearchTool } from './ragSearch.tool'
import { AllergyQueryTool } from './allergyQuery.tool'
import { HealthReportTool } from './healthReport.tool'
import { AllergyRecordTool } from './allergyRecord.tool'
import { RecommendPlayTool } from './recommendPlay.tool'
import { SubmitPlayFeedbackTool } from './submitPlayFeedback.tool'
import { GrowthRecordTool } from './growthRecord.tool'
import { VaccineRecordTool } from './vaccineRecord.tool'
import { WeightRecordTool } from './weightRecord.tool'
import { GrowthRecordsQueryTool } from './growthRecordsQuery.tool'

export const tools: Tool[] = [
  CatInfoTool,
  WeightTrendTool,
  HealthCheckTool,
  VaccineCheckTool,
  RagSearchTool,
  AllergyQueryTool,
  HealthReportTool,
  AllergyRecordTool,
  RecommendPlayTool,
  SubmitPlayFeedbackTool,
  GrowthRecordTool,
  VaccineRecordTool,
  WeightRecordTool,
  GrowthRecordsQueryTool,
]

export const toolRegistry = new Map<string, Tool>()
tools.forEach((tool) => toolRegistry.set(tool.name, tool))

export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}

export function listTools(): Tool[] {
  return tools
}

export function generateToolDescriptions(): string {
  return tools
    .map(
      (t, i) =>
        `${i + 1}. **${t.name}** (${t.permissions.includes('write') ? '有写入操作' : '仅读取数据'})\n   - ${t.description}\n   - 参数 Schema: ${JSON.stringify((t.schema as any).shape ? Object.keys((t.schema as any).shape) : [], null, 2)}\n`
    )
    .join('\n')
}

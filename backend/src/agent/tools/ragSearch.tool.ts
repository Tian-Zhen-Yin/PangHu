import { z } from 'zod'
import type { Tool, AgentContext } from '../types/agent'
import { getKnowledgeContext } from '../../services/knowledge.service'

interface RagSearchOutput {
  success: boolean
  message?: string
  query?: string
  context?: string
  guideTitles?: string[]
}

export const RagSearchTool: Tool<z.infer<typeof ragSearchSchema>, RagSearchOutput> = {
  name: 'rag_search',
  description: '从养猫知识库中搜索与问题相关的专业知识。当用户询问一般性问题（如喂养方法、行为问题、常见疾病、疫苗知识），而这些问题不涉及具体猫咪的数据时使用。本工具不访问用户的猫咪档案数据，只访问通用知识。',
  schema: z.object({
    query: z.string().min(1).describe('需要搜索的关键词或问题描述'),
    category: z.string().optional().describe('知识分类：health=健康医疗, feeding=喂养营养, behavior=行为训练, care=日常护理'),
  }),
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      const result = await getKnowledgeContext(input.query)

      if (!result || result.guides.length === 0) {
        return {
          success: true,
          query: input.query,
          context: '未找到明确匹配的知识库条目，请基于通用专业知识回答。',
          guideTitles: [],
        }
      }

      return {
        success: true,
        query: input.query,
        context: result.context,
        guideTitles: result.guides.map((g) => g.title),
      }
    } catch (error: any) {
      ctx.logger.error(`[rag_search] Error: ${error.message}`)
      return {
        success: false,
        message: '知识库检索时出错，请稍后重试。',
      }
    }
  },
}

export const ragSearchSchema = z.object({
  query: z.string().min(1).describe('需要搜索的关键词或问题描述'),
  category: z.string().optional().describe('知识分类：health=健康医疗, feeding=喂养营养, behavior=行为训练, care=日常护理'),
})

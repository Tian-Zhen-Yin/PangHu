import type { ZodType } from 'zod'
import type { Tool } from '../types/agent'
import type { ToolDefinition } from '../llm/LLMClient'

/**
 * 把 Tool 转成 LLM 可识别的 ToolDefinition (OpenAI function 格式)。
 *
 * 注:只支持 z.object({...}) 顶层 schema,这是项目内所有 Tool 的现状。
 * 如果未来出现非 object 顶层 schema(如 z.string()),会落到 fallback 空 properties。
 */
export function zodToToolDefinition(tool: Tool): ToolDefinition {
  const schema = tool.schema as ZodType & { _def?: any }
  const rawShape = (schema as any)._def?.shape ?? (schema as any).shape
  const shape: Record<string, ZodType> | undefined = typeof rawShape === 'function'
    ? rawShape()
    : rawShape

  const properties: Record<string, unknown> = {}
  const required: string[] = []

  if (shape && typeof shape === 'object') {
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const field = fieldSchema as ZodType & { _def?: any; description?: string }
      const def = (field as any)._def
      const isOptional = def?.typeName === 'ZodOptional' || def?.type === 'optional'
      const inner = isOptional ? def.innerType : field
      const innerDef = (inner as any)._def
      const description = (field as any).description ?? (inner as any).description

      properties[key] = {
        type: zodTypeToJsonType(innerDef?.typeName ?? innerDef?.type),
        ...(description ? { description } : {}),
      }

      if (!isOptional) required.push(key)
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    },
  }
}

function zodTypeToJsonType(typeName?: string): string {
  switch (typeName) {
    case 'ZodString':
    case 'string': return 'string'
    case 'ZodNumber':
    case 'number': return 'number'
    case 'ZodBoolean':
    case 'boolean': return 'boolean'
    case 'ZodArray':
    case 'array': return 'array'
    case 'ZodObject':
    case 'object': return 'object'
    default: return 'string'
  }
}

export function toolsToDefinitions(tools: Tool[]): ToolDefinition[] {
  return tools.map(zodToToolDefinition)
}

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodToToolDefinition, toolsToDefinitions } from '../../agent/core/toolAdapter'
import type { Tool } from '../../agent/types/agent'

describe('toolAdapter.zodToToolDefinition', () => {
  it('converts a tool with optional string param to JSON Schema', () => {
    const tool: Tool = {
      name: 'get_cat_info',
      description: '获取猫咪基础信息',
      schema: z.object({
        catName: z.string().optional().describe('猫咪名字'),
      }),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.type).toBe('function')
    expect(def.function.name).toBe('get_cat_info')
    expect(def.function.description).toBe('获取猫咪基础信息')
    expect(def.function.parameters.type).toBe('object')
    expect(def.function.parameters.properties).toHaveProperty('catName')
    expect(def.function.parameters.required ?? []).not.toContain('catName')
  })

  it('marks required param as required in JSON Schema', () => {
    const tool: Tool = {
      name: 'rag_search',
      description: '搜索知识库',
      schema: z.object({ query: z.string() }),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.function.parameters.required).toContain('query')
  })

  it('handles tool with empty parameters schema', () => {
    const tool: Tool = {
      name: 'check_health',
      description: '检查健康',
      schema: z.object({}),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.function.parameters.type).toBe('object')
    expect(def.function.parameters.properties).toEqual({})
  })
})

describe('toolAdapter.toolsToDefinitions', () => {
  it('converts an array of tools', () => {
    const tools: Tool[] = [
      {
        name: 'a',
        description: 'A',
        schema: z.object({ x: z.string() }),
        permissions: ['read'],
        call: async () => ({}),
      },
      {
        name: 'b',
        description: 'B',
        schema: z.object({}),
        permissions: ['read'],
        call: async () => ({}),
      },
    ]
    const defs = toolsToDefinitions(tools)
    expect(defs).toHaveLength(2)
    expect(defs[0].function.name).toBe('a')
    expect(defs[1].function.name).toBe('b')
  })
})

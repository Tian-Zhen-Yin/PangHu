/**
 * 特性开关配置 (Feature Flags)
 * 文件路径: backend/src/config/featureFlags.ts
 *
 * 基于 Harness Feature Flags 思想实现
 * 支持：环境切换 / 用户分组 / 灰度发布 / A/B 测试
 *
 * 使用方式：
 *   import { isFeatureEnabled } from '@/config/featureFlags'
 *   if (isFeatureEnabled('AGENT_MODE')) { ... }
 */

export type Environment = 'development' | 'staging' | 'production'
export type UserSegment = 'internal' | 'beta' | 'all' | 'premium'

export interface FeatureFlag {
  key: string                     // 唯一标识
  enabledByDefault: boolean      // 默认启用状态
  description: string            // 功能描述
  rollout: RolloutStrategy       // 灰度策略
  dependencies?: string[]        // 依赖的其他开关
}

export interface RolloutStrategy {
  // 环境级别开关
  environment?: {
    development?: boolean
    staging?: boolean
    production?: boolean
  }

  // 用户分组：internal（内部用户）/ beta（内测用户）/ all（全部用户）/ premium（付费用户）
  userSegment?: UserSegment

  // 百分比灰度：0-100，从 0% 逐步放开
  percentage?: number

  // 指定用户 ID 白名单（优先于百分比）
  userIds?: string[]

  // 指定用户 ID 黑名单
  excludeUserIds?: string[]

  // 最低版本要求（前端/客户端版本）
  minAppVersion?: {
    ios?: string
    android?: string
    web?: string
  }

  // 时间窗口控制
  timeWindow?: {
    startDate?: string  // ISO 8601
    endDate?: string    // ISO 8601
  }
}

// ==================== 特性清单 ====================

export const featureFlags: Record<string, FeatureFlag> = {

  // ======== Agent 核心功能 ========

  /**
   * Agent 智能模式
   * 控制是否启用 Agent 框架（多工具编排）
   * 关闭后回退到传统 RAG 模式
   */
  AGENT_MODE: {
    key: 'AGENT_MODE',
    enabledByDefault: true,
    description: '启用 Agent 智能模式（多工具编排），关闭后回退到传统 RAG',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
      percentage: 100,
    },
  },

  /**
   * V3.0 LLM tool-calling loop（替代规则驱动 Planner）
   * 灰度阶段,仅内部用户开启;flag 开启时 V2.0 工具(过敏录入/健康周报)悄悄降级到旧链路
   *
   * 注:enabledByDefault=true + percentage=100 表达"通过前置门控的用户全部激活"
   *    前置门控:environment ∈ {development, staging} + userSegment='internal' + AGENT_MODE on
   */
  LLM_TOOL_CALLING_LOOP: {
    key: 'LLM_TOOL_CALLING_LOOP',
    enabledByDefault: true,
    description: '启用 LLM tool-calling loop（ReAct），替代规则驱动 Planner',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,
      },
      userSegment: 'internal',
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },

  /**
   * Agent 流式输出
   * 控制 Agent 响应是否流式输出
   */
  AGENT_STREAMING: {
    key: 'AGENT_STREAMING',
    enabledByDefault: true,
    description: 'Agent 响应流式输出（打字机效果）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },

  /**
   * 工具调用可视化
   * 控制是否在 UI 显示工具调用进度条和结构化卡片
   */
  AGENT_TOOL_VISUALIZATION: {
    key: 'AGENT_TOOL_VISUALIZATION',
    enabledByDefault: true,
    description: '在聊天界面显示 Agent 工具调用进度条和结构化数据卡片',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
    },
    dependencies: ['AGENT_MODE'],
  },

  /**
   * 健康评估卡片
   * 控制是否显示猫咪健康评估结构化卡片
   */
  HEALTH_ASSESSMENT_CARD: {
    key: 'HEALTH_ASSESSMENT_CARD',
    enabledByDefault: true,
    description: '在 Agent 响应中显示健康评估结构化卡片',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['AGENT_MODE', 'AGENT_TOOL_VISUALIZATION'],
  },

  /**
   * 体重趋势卡片
   * 控制是否显示体重趋势分析结构化卡片
   */
  WEIGHT_TREND_CARD: {
    key: 'WEIGHT_TREND_CARD',
    enabledByDefault: true,
    description: '在 Agent 响应中显示体重趋势分析结构化卡片',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['AGENT_MODE', 'AGENT_TOOL_VISUALIZATION'],
  },

  /**
   * 疫苗状态卡片
   * 控制是否显示疫苗接种状态结构化卡片
   */
  VACCINE_STATUS_CARD: {
    key: 'VACCINE_STATUS_CARD',
    enabledByDefault: true,
    description: '在 Agent 响应中显示疫苗接种状态结构化卡片',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['AGENT_MODE', 'AGENT_TOOL_VISUALIZATION'],
  },

  /**
   * 过敏历史追踪（只读）
   * 启用 GET_allergy_records 工具，支持查询猫咪过敏记录并展示结构化卡片
   */
  ALLERGY_TRACKING_QUERY: {
    key: 'ALLERGY_TRACKING_QUERY',
    enabledByDefault: true,
    description: '启用过敏历史查询工具（GET_allergy_records，只读）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },

  /**
   * 健康周报（核心）
   * 启用 GENERATE_health_report 工具，生成多维度健康周报（体重趋势图 + 评分 + 亮点）
   * P2 阶段不含活动量维度（数据源未就绪）和 suggestions/toDoList（P4 实现）
   */
  HEALTH_WEEKLY_REPORT: {
    key: 'HEALTH_WEEKLY_REPORT',
    enabledByDefault: true,
    description: '启用健康周报生成工具（GENERATE_health_report，含 SVG 图表）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },

  /**
   * 健康周报建议（P4）
   * 启用健康周报中的建议引擎（generateHealthSuggestions）
   * 基于周报数据自动生成优先级排序的健康建议
   */
  HEALTH_REPORT_SUGGESTIONS: {
    key: 'HEALTH_REPORT_SUGGESTIONS',
    enabledByDefault: true,
    description: '启用健康周报建议引擎（generateHealthSuggestions，基于规则自动生成）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
      percentage: 100,
    },
    dependencies: ['HEALTH_WEEKLY_REPORT'],
  },

  /**
   * 健康周报待办（P4）
   * 启用健康周报中的待办事项（generateToDoList + 后端持久化）
   * 用户可勾选完成待办，状态持久化到数据库
   */
  HEALTH_REPORT_TODO: {
    key: 'HEALTH_REPORT_TODO',
    enabledByDefault: true,
    description: '启用健康周报待办事项（含后端持久化，支持勾选完成）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'all',
      percentage: 100,
    },
    dependencies: ['HEALTH_WEEKLY_REPORT'],
  },

  /**
   * 执行轨迹可视化（V2.0 P3）
   * 展示 Agent 管道执行步骤（Router/Planner/Executor/Reporter）
   * 实验性功能，仅内部用户可见
   */
  AGENT_EXECUTION_TRACE: {
    key: 'AGENT_EXECUTION_TRACE',
    enabledByDefault: false,
    description: '展示 Agent 执行轨迹（管道日志，非 LLM 推理）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,
      },
      userSegment: 'internal',
      percentage: 100,
    },
    dependencies: ['AGENT_MODE', 'AGENT_TOOL_VISUALIZATION'],
  },

  /**
   * 过敏信息录入（V2.0 P3）
   * 启用 ADD_allergy_record 写入工具（需用户确认）
   * 灰度阶段
   */
  ALLERGY_TRACKING_RECORD: {
    key: 'ALLERGY_TRACKING_RECORD',
    enabledByDefault: false,
    description: '启用过敏信息录入工具（ADD_allergy_record，写入需确认）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,
      },
      userSegment: 'beta',
      percentage: 50,
    },
    dependencies: ['AGENT_MODE', 'ALLERGY_TRACKING_QUERY'],
  },

  // ======== 知识库功能 ========

  /**
   * RAG 知识库检索
   * 控制是否启用向量知识库检索
   */
  RAG_SEARCH: {
    key: 'RAG_SEARCH',
    enabledByDefault: true,
    description: '启用 RAG 向量知识库检索，为 Agent 响应提供参考来源',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
  },

  /**
   * 引用来源展示
   * 控制是否在响应中显示知识库引用来源
   */
  CITATIONS_DISPLAY: {
    key: 'CITATIONS_DISPLAY',
    enabledByDefault: true,
    description: '在 Agent 响应底部显示知识库引用来源列表',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['RAG_SEARCH'],
  },

  // ======== 高级功能 ========

  /**
   * 多猫咪对比
   * 控制是否启用多猫咪健康数据对比功能
   */
  MULTI_CAT_COMPARISON: {
    key: 'MULTI_CAT_COMPARISON',
    enabledByDefault: false,
    description: '支持多猫咪健康数据对比分析（灰度中）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      userSegment: 'beta',
      percentage: 30,
    },
  },

  /**
   * 主动健康提醒
   * 控制是否启用基于猫咪数据的主动健康提醒
   */
  PROACTIVE_HEALTH_ALERTS: {
    key: 'PROACTIVE_HEALTH_ALERTS',
    enabledByDefault: false,
    description: '基于体重/疫苗数据主动推送健康提醒（灰度中）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,  // 生产环境暂不开放
      },
      userSegment: 'beta',
      percentage: 20,
    },
  },

  /**
   * 上下文记忆
   * 控制 Agent 是否保留对话历史上下文
   */
  AGENT_CONTEXT_MEMORY: {
    key: 'AGENT_CONTEXT_MEMORY',
    enabledByDefault: true,
    description: 'Agent 保留对话历史上下文，实现连续对话',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },

  // ======== 用户体验功能 ========

  /**
   * 预设问题快捷入口
   * 控制是否在空状态显示快捷问题入口
   */
  SUGGESTED_QUESTIONS: {
    key: 'SUGGESTED_QUESTIONS',
    enabledByDefault: true,
    description: '在聊天空状态显示推荐问题快捷入口',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
  },

  /**
   * 智能建议芯片
   * 控制是否在对话中显示上下文智能建议
   */
  SMART_SUGGESTIONS: {
    key: 'SMART_SUGGESTIONS',
    enabledByDefault: true,
    description: '在对话中根据上下文显示智能建议芯片',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: true,
      },
      percentage: 100,
    },
  },

  // ======== 实验性功能 ========

  /**
   * Agent 深度思考模式
   * 启用 Chain-of-Thought 推理展示（实验性）
   */
  AGENT_COT_DISPLAY: {
    key: 'AGENT_COT_DISPLAY',
    enabledByDefault: false,
    description: '显示 Agent 推理过程（Chain-of-Thought，实验性）',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,
      },
      userSegment: 'internal',
      percentage: 100,
    },
    dependencies: ['AGENT_MODE'],
  },
}

// ==================== 开关评估引擎 ====================

export interface EvaluationContext {
  environment: Environment
  userId: string
  userSegment?: UserSegment
  appVersion?: {
    ios?: string
    android?: string
    web?: string
  }
  timestamp?: Date
}

function compareVersion(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pa = partsA[i] || 0
    const pb = partsB[i] || 0
    if (pa !== pb) return pa - pb
  }
  return 0
}

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function isFeatureEnabled(
  flagKey: string,
  context: EvaluationContext
): boolean {
  const flag = featureFlags[flagKey]
  if (!flag) {
    console.warn(`[FeatureFlags] Unknown flag: ${flagKey}`)
    return false
  }

  // 1. 检查依赖
  if (flag.dependencies) {
    for (const dep of flag.dependencies) {
      if (!isFeatureEnabled(dep, context)) {
        return false
      }
    }
  }

  const { rollout } = flag

  // 2. 环境级别检查
  if (rollout.environment) {
    const envEnabled = rollout.environment[context.environment]
    if (envEnabled === false) return false
  }

  // 3. 时间窗口检查
  if (rollout.timeWindow) {
    const now = context.timestamp || new Date()
    if (rollout.timeWindow.startDate) {
      if (new Date(rollout.timeWindow.startDate) > now) return false
    }
    if (rollout.timeWindow.endDate) {
      if (new Date(rollout.timeWindow.endDate) < now) return false
    }
  }

  // 4. 版本检查
  if (rollout.minAppVersion) {
    const { appVersion } = context
    if (appVersion?.web && rollout.minAppVersion.web) {
      if (compareVersion(appVersion.web, rollout.minAppVersion.web) < 0) return false
    }
  }

  // 5. 用户白名单（优先于一切）
  if (rollout.userIds && rollout.userIds.length > 0) {
    return rollout.userIds.includes(context.userId)
  }

  // 6. 用户黑名单
  if (rollout.excludeUserIds && rollout.excludeUserIds.includes(context.userId)) {
    return false
  }

  // 7. 用户分组检查
  if (rollout.userSegment && context.userSegment) {
    const segmentHierarchy: Record<UserSegment, number> = {
      internal: 0,   // 最高权限
      beta: 1,
      premium: 2,
      all: 3,        // 最低权限
    }
    const requiredLevel = segmentHierarchy[rollout.userSegment]
    const userLevel = segmentHierarchy[context.userSegment]
    if (userLevel > requiredLevel) return false
  }

  // 8. 百分比灰度
  // percentage 语义:
  //   - 0   → 显式"无任何用户进入灰度",直接拒绝(避免歧义)
  //   - 100 → 全量灰度,跳过 hash 分桶(由 enabledByDefault 决定)
  //   - 1-99 → 按 (hash(userId+flagKey) % 100) 分桶判定
  if (rollout.percentage !== undefined) {
    if (rollout.percentage <= 0) return false
    if (rollout.percentage < 100) {
      const hash = hashUserId(context.userId + flagKey)
      const bucket = hash % 100
      if (bucket >= rollout.percentage) return false
    }
  }

  // 全部通过，返回默认值
  return flag.enabledByDefault
}

/**
 * 批量获取用户的所有开关状态
 */
export function evaluateAllFlags(context: EvaluationContext): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const key of Object.keys(featureFlags)) {
    result[key] = isFeatureEnabled(key, context)
  }
  return result
}

/**
 * 获取当前环境的默认评估上下文
 */
export function getDefaultContext(userId: string, userSegment?: UserSegment): EvaluationContext {
  const env = (process.env.NODE_ENV as Environment) || 'development'
  return {
    environment: env,
    userId,
    userSegment: userSegment || 'all',
    appVersion: {
      web: process.env.APP_VERSION,
    },
  }
}

/**
 * 从环境变量白名单解析用户段。
 *
 * 优先级:internal > beta > premium > all
 * 配置方式(.env):
 *   INTERNAL_USER_IDS=uid1,uid2,uid3
 *   BETA_USER_IDS=uid4,uid5
 *
 * premium 暂不通过白名单管理(由用户表 memberType 决定,留给上游注入)。
 *
 * 设计目的:为 V3.0 LLM_TOOL_CALLING_LOOP 灰度提供最小数据源,
 *          无需数据库 migration 或 JWT 改造即可上线。
 *          长期可平滑迁移到 user.role 字段或 JWT claim。
 */
export function resolveUserSegment(userId: string): UserSegment {
  if (!userId) return 'all'

  const parseList = (raw: string | undefined): string[] =>
    (raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

  const internalIds = parseList(process.env.INTERNAL_USER_IDS)
  if (internalIds.includes(userId)) return 'internal'

  const betaIds = parseList(process.env.BETA_USER_IDS)
  if (betaIds.includes(userId)) return 'beta'

  return 'all'
}

/**
 * 构造当前用户的 EvaluationContext(基于环境变量白名单自动解析 segment)。
 * Controller 入口的便捷封装,等价于 getDefaultContext(userId, resolveUserSegment(userId))。
 */
export function getContextForUser(userId: string): EvaluationContext {
  return getDefaultContext(userId, resolveUserSegment(userId))
}

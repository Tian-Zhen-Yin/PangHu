/**
 * 极简分级 logger(零依赖) —— 业务代码禁止裸用 console(AGENTS.md),
 * 统一从这里输出。开发环境全量;生产只出 warn/error。
 *
 * 这是仓库里唯一允许出现 console 调用的模块。
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function minLevel(): Level {
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

function emit(level: Level, tag: string, args: unknown[]): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return
  const ts = new Date().toISOString()
  const head = `${ts} ${level.toUpperCase().padEnd(5)} [${tag}]`
  if (level === 'error') console.error(head, ...args)
  else if (level === 'warn') console.warn(head, ...args)
  else console.log(head, ...args)
}

/** 模块级 logger:logger.info('reminderChecker', '...') */
export const logger = {
  debug: (tag: string, ...args: unknown[]) => emit('debug', tag, args),
  info: (tag: string, ...args: unknown[]) => emit('info', tag, args),
  warn: (tag: string, ...args: unknown[]) => emit('warn', tag, args),
  error: (tag: string, ...args: unknown[]) => emit('error', tag, args),
}

/** 绑定 tag 的 logger:createLogger('rag').info('...') */
export function createLogger(tag: string) {
  return {
    debug: (...args: unknown[]) => emit('debug', tag, args),
    info: (...args: unknown[]) => emit('info', tag, args),
    warn: (...args: unknown[]) => emit('warn', tag, args),
    error: (...args: unknown[]) => emit('error', tag, args),
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, createLogger } from '../../utils/logger'

describe('utils/logger', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  it('开发环境输出全部级别', () => {
    process.env.NODE_ENV = 'development'
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('t', 'a')
    logger.info('t', 'b')
    logger.warn('t', 'c')
    logger.error('t', 'd')

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(errSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toContain('[t]')
  })

  it('生产环境只输出 warn/error', () => {
    process.env.NODE_ENV = 'production'
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.debug('t', 'a')
    logger.info('t', 'b')
    logger.warn('t', 'c')

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('createLogger 绑定 tag 并透传参数', () => {
    process.env.NODE_ENV = 'test'
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    createLogger('rag').info('检索完成', { topK: 3 })

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toContain('[rag]')
    expect(logSpy.mock.calls[0][1]).toBe('检索完成')
    expect(logSpy.mock.calls[0][2]).toEqual({ topK: 3 })
  })
})

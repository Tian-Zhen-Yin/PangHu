/**
 * 确认写入的工具分发 —— 用户在 /api/chat/confirm 点确认后,按 session.toolName
 * 构造工具输入并执行写操作。
 * 之前这段 90 行 switch 直接长在 chat.controller 里(controller import Tool 类,
 * 绕过 agent 编排层);收敛到这里后 controller 只做参数校验与 HTTP 映射。
 */
import type { AgentContext } from './types/agent'
import type { SuspendedSession } from '../services/confirmation.service'
import { AllergyRecordTool } from './tools/allergyRecord.tool'
import { GrowthRecordTool } from './tools/growthRecord.tool'
import { VaccineRecordTool } from './tools/vaccineRecord.tool'
import { WeightRecordTool } from './tools/weightRecord.tool'
import { createLogger } from '../utils/logger'

const log = createLogger('confirmationDispatcher')

export type ConfirmedWriteResult = Record<string, any> & {
  success?: boolean
  message?: string
}

export type DispatchOutcome =
  | { ok: true; result: ConfirmedWriteResult }
  | { ok: false; message: string }   // 参数不合法,controller 映射 400

/** 构造带已验证确认令牌的 AgentContext */
export function buildConfirmedContext(
  userId: string,
  confirmationId: string,
  catId: string | null
): AgentContext {
  return {
    userId,
    sessionId: 'confirm-' + confirmationId,
    selectedCatId: catId || undefined,
    traceId: 'confirm-' + Date.now(),
    logger: console,
    cache: new Map(),
    confirmationToken: {
      verified: true,
      confirmedAt: new Date(),
      confirmationId,
    },
  }
}

/**
 * 执行确认后的写入:合并草稿与用户编辑(edits 优先),按工具名分发。
 */
export async function executeConfirmedWrite(
  session: SuspendedSession,
  userId: string,
  edits: Record<string, any> = {}
): Promise<DispatchOutcome> {
  const ctx = buildConfirmedContext(userId, session.confirmationId, session.catId)
  const merged: Record<string, any> = { ...(session.draft || {}), ...edits }

  switch (session.toolName) {
    case 'ADD_growth_record': {
      const input = {
        catId: session.catId || undefined,
        type: merged.type,
        notes: merged.notes || '',
        photos: Array.isArray(merged.photos) ? merged.photos : [],
        weight: merged.weight,
        isAdoptionDay: merged.isAdoptionDay,
        recordDate: merged.recordDate,
      }
      if (!input.notes && input.photos.length === 0) {
        return { ok: false, message: '成长记录内容不能为空' }
      }
      return { ok: true, result: await GrowthRecordTool.call(input, ctx) }
    }

    case 'ADD_vaccine_record': {
      const input = {
        catId: session.catId || undefined,
        vaccineName: merged.vaccineName || '',
        vaccineType: merged.vaccineType,
        vaccinatedAt: merged.vaccinatedAt,
        nextDueDate: merged.nextDueDate,
        manufacturer: merged.manufacturer,
        veterinarian: merged.veterinarian,
        clinic: merged.clinic,
        notes: merged.notes,
      }
      if (!input.vaccineName) {
        return { ok: false, message: '疫苗名称不能为空' }
      }
      return { ok: true, result: await VaccineRecordTool.call(input, ctx) }
    }

    case 'ADD_weight_record': {
      const input = {
        catId: session.catId || undefined,
        weight: typeof merged.weight === 'number' ? merged.weight : parseFloat(merged.weight),
        notes: merged.notes,
        recordDate: merged.recordDate,
      }
      if (!input.weight || Number.isNaN(input.weight)) {
        return { ok: false, message: '体重数值不能为空' }
      }
      return { ok: true, result: await WeightRecordTool.call(input, ctx) }
    }

    case 'ADD_allergy_record':
    default: {
      const input = {
        catId: session.catId,
        allergen: merged.allergen || '',
        symptoms: merged.symptoms || '',
        severity: merged.severity || 'moderate',
        occurrenceDate: merged.occurrenceDate,
        treatment: merged.treatment,
        notes: merged.notes,
      }
      if (!input.allergen) {
        return { ok: false, message: '过敏原不能为空' }
      }
      const result = await AllergyRecordTool.call(input, ctx)
      log.info('确认写入完成:', session.toolName)
      return { ok: true, result }
    }
  }
}

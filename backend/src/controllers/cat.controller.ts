import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取所有成长阶段
 */
export async function getStages(_req: Request, res: Response) {
  const stages = await prisma.stage.findMany({
    include: {
      milestones: true,
      tasks: {
        orderBy: { priority: 'asc' }
      },
      vaccines: {
        orderBy: { ageWeeks: 'asc' }
      }
    },
    orderBy: { order: 'asc' }
  })

  res.json(successResponse(stages))
}

/**
 * 获取单个阶段详情
 */
export async function getStageById(req: Request, res: Response) {
  const { id } = req.params
  const stageId = Array.isArray(id) ? id[0] : id

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      milestones: {
        orderBy: { ageWeeks: 'asc' }
      },
      tasks: {
        orderBy: { priority: 'asc' }
      },
      vaccines: {
        orderBy: { ageWeeks: 'asc' }
      }
    }
  })

  if (!stage) {
    return res.status(404).json(successResponse(null, '阶段不存在'))
  }

  res.json(successResponse(stage))
}

/**
 * 获取所有里程碑
 */
export async function getMilestones(_req: Request, res: Response) {
  const milestones = await prisma.milestone.findMany({
    include: {
      stage: {
        select: { name: true, ageRange: true }
      }
    },
    orderBy: { ageWeeks: 'asc' }
  })

  res.json(successResponse(milestones))
}

/**
 * 获取疫苗接种表
 */
export async function getVaccinations(_req: Request, res: Response) {
  const vaccines = await prisma.vaccine.findMany({
    include: {
      stage: {
        select: { name: true, ageRange: true }
      }
    },
    orderBy: { ageWeeks: 'asc' }
  })

  res.json(successResponse(vaccines))
}

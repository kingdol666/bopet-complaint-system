import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const updateSchema = z.object({
  feedbackDate: z.string().transform((v) => new Date(v)).optional(),
  productionTime: z.string().transform((v) => new Date(v)).nullable().optional(),
  productModelId: z.number().int().nullable().optional(),
  thickness: z.string().max(50).nullable().optional(),
  rollNo: z.string().max(100).nullable().optional(),
  customerId: z.number().int().nullable().optional(),
  quantityInvolved: z.number().nullable().optional(),
  application: z.string().max(200).nullable().optional(),
  productionLineId: z.number().int().nullable().optional(),
  shiftTeam: z.string().max(50).nullable().optional(),
  machineNo: z.string().max(50).nullable().optional(),
  batchNo: z.string().max(100).nullable().optional(),
  feedbackContent: z.string().nullable().optional(),
  customerComplaintText: z.string().nullable().optional(),
  internalComplaintName: z.string().max(200).nullable().optional(),
  problemCategoryId: z.number().int().nullable().optional(),
  problemSubcategoryId: z.number().int().nullable().optional(),
  severityLevelId: z.number().int().nullable().optional(),
  repeatedIssue: z.boolean().optional(),
  customerDemandId: z.number().int().nullable().optional(),
  disposalResult: z.string().nullable().optional(),
  compensationTypeId: z.number().int().nullable().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.number().int().nullable().optional(),
  responsibleProcessId: z.number().int().nullable().optional(),
  rootCauseAnalysis: z.string().nullable().optional(),
  correctiveAction: z.string().nullable().optional(),
  lessonsLearned: z.string().nullable().optional(),
  reviewConclusion: z.string().nullable().optional(),
  standardizedAction: z.boolean().optional(),
  remark: z.string().nullable().optional()
})

const complaintInclude = {
  customer: true,
  productModel: true,
  productionLine: true,
  problemCategory: true,
  problemSubcategory: true,
  severityLevel: true,
  customerDemand: true,
  compensationType: true,
  responsibleDept: true,
  responsibleProcess: true
} as const

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '0', 10)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的 ID'
    })
  }

  if (event.method === 'GET') {
    const record = await prisma.complaintRecord.findUnique({
      where: { id },
      include: {
        ...complaintInclude,
        createdBy: { select: { id: true, name: true, username: true } },
        updatedBy: { select: { id: true, name: true, username: true } }
      }
    })

    if (!record) {
      throw createError({
        statusCode: 404,
        statusMessage: '客诉记录不存在'
      })
    }

    return {
      success: true,
      data: record
    }
  }

  if (event.method === 'PUT') {
    try {
      const currentUser = await requireSessionUser(event)
      const body = await readBody(event)
      const data = updateSchema.parse(body)

      const existing = await prisma.complaintRecord.findUnique({
        where: { id }
      })

      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: '客诉记录不存在'
        })
      }

      const record = await prisma.complaintRecord.update({
        where: { id },
        data: {
          ...data,
          updatedById: currentUser.id
        },
        include: complaintInclude
      })

      await prisma.operationLog.create({
        data: {
          userId: currentUser.id,
          action: 'update',
          module: 'complaint',
          targetId: record.id,
          targetName: record.complaintNo,
          detail: JSON.stringify({ updatedFields: Object.keys(data) })
        }
      })

      return {
        success: true,
        data: record,
        message: '客诉记录更新成功'
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          statusMessage: error.errors[0].message
        })
      }

      throw error
    }
  }

  if (event.method === 'DELETE') {
    const currentUser = await requireSessionUser(event)

    const existing = await prisma.complaintRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: '客诉记录不存在'
      })
    }

    await prisma.complaintRecord.delete({
      where: { id }
    })

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        action: 'delete',
        module: 'complaint',
        targetId: existing.id,
        targetName: existing.complaintNo,
        detail: JSON.stringify({ complaintNo: existing.complaintNo })
      }
    })

    return {
      success: true,
      message: '客诉记录已删除'
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})

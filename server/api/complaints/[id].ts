import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth'

// Update complaint schema
const updateSchema = z.object({
  // Basic info
  feedbackDate: z.string().transform(v => new Date(v)).optional(),
  productionTime: z.string().transform(v => new Date(v)).nullable().optional(),
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
  // Complaint content
  feedbackContent: z.string().nullable().optional(),
  customerComplaintText: z.string().nullable().optional(),
  internalComplaintName: z.string().max(200).nullable().optional(),
  problemCategoryId: z.number().int().nullable().optional(),
  problemSubcategoryId: z.number().int().nullable().optional(),
  severityLevelId: z.number().int().nullable().optional(),
  repeatedIssue: z.boolean().optional(),
  // Disposal
  customerDemandId: z.number().int().nullable().optional(),
  disposalResult: z.string().nullable().optional(),
  compensationTypeId: z.number().int().nullable().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.number().int().nullable().optional(),
  responsibleProcessId: z.number().int().nullable().optional(),
  // Analysis
  rootCauseAnalysis: z.string().nullable().optional(),
  correctiveAction: z.string().nullable().optional(),
  lessonsLearned: z.string().nullable().optional(),
  reviewConclusion: z.string().nullable().optional(),
  standardizedAction: z.boolean().optional(),
  remark: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的ID'
    })
  }

  // Handle GET request
  if (event.method === 'GET') {
    const record = await prisma.complaintRecord.findUnique({
      where: { id },
      include: {
        customer: true,
        productModel: true,
        productionLine: true,
        problemCategory: true,
        problemSubcategory: true,
        severityLevel: true,
        customerDemand: true,
        compensationType: true,
        responsibleDept: true,
        responsibleProcess: true,
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

  // Handle PUT request
  if (event.method === 'PUT') {
    try {
      // Get current user
      const authHeader = getHeader(event, 'authorization')
      const token = authHeader?.replace('Bearer ', '')
      const payload = token ? verifyToken(token) : null

      const body = await readBody(event)
      const data = updateSchema.parse(body)

      // Check if record exists
      const existing = await prisma.complaintRecord.findUnique({
        where: { id }
      })

      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: '客诉记录不存在'
        })
      }

      // Update record
      const record = await prisma.complaintRecord.update({
        where: { id },
        data: {
          ...data,
          updatedById: payload?.userId || null
        },
        include: {
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
        }
      })

      // Log operation
      if (payload) {
        await prisma.operationLog.create({
          data: {
            userId: payload.userId,
            action: 'update',
            module: 'complaint',
            targetId: record.id,
            targetName: record.complaintNo,
            detail: JSON.stringify({ updatedFields: Object.keys(data) })
          }
        })
      }

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

  // Handle DELETE request
  if (event.method === 'DELETE') {
    // Get current user
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')
    const payload = token ? verifyToken(token) : null

    // Check if record exists
    const existing = await prisma.complaintRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: '客诉记录不存在'
      })
    }

    // Delete record
    await prisma.complaintRecord.delete({
      where: { id }
    })

    // Log operation
    if (payload) {
      await prisma.operationLog.create({
        data: {
          userId: payload.userId,
          action: 'delete',
          module: 'complaint',
          targetId: existing.id,
          targetName: existing.complaintNo,
          detail: JSON.stringify({ complaintNo: existing.complaintNo })
        }
      })
    }

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

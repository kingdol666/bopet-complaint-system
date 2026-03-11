import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

const createSchema = z.object({
  feedbackDate: z.string().transform((v) => new Date(v)),
  productionTime: z.string().transform((v) => new Date(v)).optional().nullable(),
  productModelId: z.number().int().optional().nullable(),
  thickness: z.string().max(50).optional().nullable(),
  rollNo: z.string().max(100).optional().nullable(),
  customerId: z.number().int().optional().nullable(),
  quantityInvolved: z.number().optional().nullable(),
  application: z.string().max(200).optional().nullable(),
  productionLineId: z.number().int().optional().nullable(),
  shiftTeam: z.string().max(50).optional().nullable(),
  machineNo: z.string().max(50).optional().nullable(),
  batchNo: z.string().max(100).optional().nullable(),
  feedbackContent: z.string().optional().nullable(),
  customerComplaintText: z.string().optional().nullable(),
  internalComplaintName: z.string().max(200).optional().nullable(),
  problemCategoryId: z.number().int().optional().nullable(),
  problemSubcategoryId: z.number().int().optional().nullable(),
  severityLevelId: z.number().int().optional().nullable(),
  repeatedIssue: z.boolean().default(false),
  customerDemandId: z.number().int().optional().nullable(),
  disposalResult: z.string().optional().nullable(),
  compensationTypeId: z.number().int().optional().nullable(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).default('pending'),
  responsibleDeptId: z.number().int().optional().nullable(),
  responsibleProcessId: z.number().int().optional().nullable(),
  rootCauseAnalysis: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  lessonsLearned: z.string().optional().nullable(),
  reviewConclusion: z.string().optional().nullable(),
  standardizedAction: z.boolean().default(false),
  remark: z.string().optional().nullable()
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

async function generateComplaintNo(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CP-${year}-`

  const existingNumbers = await prisma.complaintRecord.findMany({
    where: {
      complaintNo: {
        startsWith: prefix
      }
    },
    select: {
      complaintNo: true
    }
  })

  const maxSequence = existingNumbers.reduce((maxValue, record) => {
    const sequence = Number.parseInt(record.complaintNo.slice(prefix.length), 10)
    if (Number.isNaN(sequence)) {
      return maxValue
    }

    return Math.max(maxValue, sequence)
  }, 0)

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`
}

function isComplaintNoConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const body = await readBody(event)
    const data = createSchema.parse(body)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const complaintNo = await generateComplaintNo()
      const createData: Prisma.ComplaintRecordUncheckedCreateInput = {
        complaintNo,
        feedbackDate: data.feedbackDate,
        productionTime: data.productionTime,
        productModelId: data.productModelId,
        thickness: data.thickness,
        rollNo: data.rollNo,
        customerId: data.customerId,
        quantityInvolved: data.quantityInvolved,
        application: data.application,
        productionLineId: data.productionLineId,
        shiftTeam: data.shiftTeam,
        machineNo: data.machineNo,
        batchNo: data.batchNo,
        feedbackContent: data.feedbackContent,
        customerComplaintText: data.customerComplaintText,
        internalComplaintName: data.internalComplaintName,
        problemCategoryId: data.problemCategoryId,
        problemSubcategoryId: data.problemSubcategoryId,
        severityLevelId: data.severityLevelId,
        repeatedIssue: data.repeatedIssue,
        customerDemandId: data.customerDemandId,
        disposalResult: data.disposalResult,
        compensationTypeId: data.compensationTypeId,
        closureStatus: data.closureStatus,
        responsibleDeptId: data.responsibleDeptId,
        responsibleProcessId: data.responsibleProcessId,
        rootCauseAnalysis: data.rootCauseAnalysis,
        correctiveAction: data.correctiveAction,
        lessonsLearned: data.lessonsLearned,
        reviewConclusion: data.reviewConclusion,
        standardizedAction: data.standardizedAction,
        remark: data.remark,
        createdById: currentUser.id,
        updatedById: currentUser.id
      }

      try {
        const record = await prisma.complaintRecord.create({
          data: createData,
          include: complaintInclude
        })

        await prisma.operationLog.create({
          data: {
            userId: currentUser.id,
            action: 'create',
            module: 'complaint',
            targetId: record.id,
            targetName: record.complaintNo,
            detail: JSON.stringify({ complaintNo: record.complaintNo })
          }
        })

        return {
          success: true,
          data: record,
          message: '客诉记录创建成功'
        }
      } catch (error) {
        if (isComplaintNoConflict(error) && attempt < 4) {
          continue
        }

        throw error
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: '客诉编号生成失败，请重试'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0].message
      })
    }

    throw error
  }
})

import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, canAccessDepartment } from '~/server/utils/auth'

const createSchema = z.object({
  feedbackDate: z.string().transform((v) => new Date(v)),
  productionTime: z.string().transform((v) => new Date(v)).optional().nullable(),
  productModelId: z.number().int().optional().nullable(),
  shaftCount: z.number().int().positive().optional().nullable(),
  thickness: z.string().max(50).optional().nullable(),
  rollNo: z.string().max(200).optional().nullable(),
  specification: z.string().max(100).optional().nullable(),
  customerId: z.number().int().optional().nullable(),
  quantityInvolved: z.number().int().positive().optional().nullable(),
  application: z.string().max(200).optional().nullable(),
  productionLineId: z.number().int().optional().nullable(),
  shiftTeam: z.string().max(50).optional().nullable(),
  machineNo: z.string().max(50).optional().nullable(),
  batchNo: z.string().max(100).optional().nullable(),
  feedbackContent: z.string().optional().nullable(),
  customerComplaintText: z.string().optional().nullable(),
  internalComplaintName: z.string().max(200).optional().nullable(),
  defectSource: z.string().max(100).optional().nullable(),
  specificDefect: z.string().max(200).optional().nullable(),
  complaintCategory: z.string().max(100).optional().nullable(),
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
  productUsage: z.string().max(200).optional().nullable(),
  improvementAction: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  templateIds: z.array(z.number().int()).optional().nullable(),
  templateData: z.record(z.any()).optional().nullable(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileType: z.string(),
    fileSize: z.number()
  })).optional().nullable()
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
    const currentUser = await requireWritePermission(event)
    const body = await readBody(event)
    const data = createSchema.parse(body)

    // Check department access: admin can only create records for their own departments
    if (data.responsibleDeptId && !canAccessDepartment(currentUser, data.responsibleDeptId)) {
      throw createError({
        statusCode: 403,
        message: '您没有该部门的操作权限'
      })
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const complaintNo = await generateComplaintNo()

      // Duplicate detection: same customer + same model + same defect within 90 days
      let duplicateCount = 0
      if (data.customerId && data.productModelId && data.specificDefect) {
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        duplicateCount = await prisma.complaintRecord.count({
          where: {
            customerId: data.customerId,
            productModelId: data.productModelId,
            specificDefect: data.specificDefect,
            feedbackDate: { gte: ninetyDaysAgo }
          }
        })
      }

      const createData: Prisma.ComplaintRecordUncheckedCreateInput = {
        complaintNo,
        feedbackDate: data.feedbackDate,
        productionTime: data.productionTime,
        productModelId: data.productModelId,
        shaftCount: data.shaftCount,
        thickness: data.thickness,
        rollNo: data.rollNo,
        specification: data.specification,
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
        defectSource: data.defectSource,
        specificDefect: data.specificDefect,
        complaintCategory: data.complaintCategory,
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
        productUsage: data.productUsage,
        improvementAction: data.improvementAction,
        remark: data.remark,
        templateIds: data.templateIds ? JSON.stringify(data.templateIds) : null,
        templateData: data.templateData ? JSON.stringify(data.templateData) : null,
        createdById: currentUser.id,
        updatedById: currentUser.id
      }

      try {
        const record = await prisma.complaintRecord.create({
          data: createData,
          include: complaintInclude
        })

        // Create attachment records if uploaded
        if (data.attachments && data.attachments.length > 0) {
          await prisma.complaintAttachment.createMany({
            data: data.attachments.map(a => ({
              complaintId: record.id,
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileType: a.fileType,
              fileSize: a.fileSize,
              uploadedById: currentUser.id
            }))
          })
        }

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
          warning: duplicateCount > 0 ? `疑似重复客诉：同一客户/型号/不良点在90天内已有${duplicateCount}条记录` : undefined,
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
      message: '客诉编号生成失败，请重试'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.errors[0].message
      })
    }

    throw error
  }
})

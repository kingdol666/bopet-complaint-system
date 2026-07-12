import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canCreateForDepartment } from '~/server/utils/auth'
import { DATA_INCLUDE } from '~/server/utils/db-columns'

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
  category: z.string().max(100).optional().nullable(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).default('pending'),
  responsibleDeptId: z.number().int().optional().nullable(),
  responsibleProcessId: z.number().int().optional().nullable(),
  rootCauseAnalysis: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  lessonsLearned: z.string().optional().nullable(),
  reviewConclusion: z.string().optional().nullable(),
  productUsage: z.string().max(200).optional().nullable(),
  improvementAction: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  templateIds: z.array(z.number().int()).optional().nullable(),
  templateData: z.record(z.any()).optional().nullable(),
  isPublic: z.boolean().default(true),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    storagePath: z.string().optional().default(''),
    fileType: z.string(),
    fileSize: z.number(),
    contentHash: z.string().optional().default(''),
    width: z.number().int().nullable().optional(),
    height: z.number().int().nullable().optional()
  })).optional().nullable()
})

const dataInclude = DATA_INCLUDE

async function generateDataNo(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DR-${year}-`

  const existingNumbers = await prisma.dataRecord.findMany({
    where: {
      dataNo: {
        startsWith: prefix
      }
    },
    select: {
      dataNo: true
    }
  })

  const maxSequence = existingNumbers.reduce((maxValue, record) => {
    const sequence = Number.parseInt(record.dataNo.slice(prefix.length), 10)
    if (Number.isNaN(sequence)) {
      return maxValue
    }

    return Math.max(maxValue, sequence)
  }, 0)

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`
}

function isDataNoConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const body = await readBody(event)
    const data = createSchema.parse(body)

    // 部门权限检查：所有用户只能为自己所在的部门创建数据
    // superadmin 可为任意部门创建
    if (data.responsibleDeptId && !canCreateForDepartment(currentUser, data.responsibleDeptId)) {
      throw createError({
        statusCode: 403,
        message: '您只能为自己所在的部门创建数据'
      })
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const dataNo = await generateDataNo()

      const createData: Prisma.DataRecordUncheckedCreateInput = {
        dataNo,
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
        category: data.category,
        closureStatus: data.closureStatus,
        responsibleDeptId: data.responsibleDeptId,
        responsibleProcessId: data.responsibleProcessId,
        rootCauseAnalysis: data.rootCauseAnalysis,
        correctiveAction: data.correctiveAction,
        lessonsLearned: data.lessonsLearned,
        reviewConclusion: data.reviewConclusion,
        productUsage: data.productUsage,
        improvementAction: data.improvementAction,
        remark: data.remark,
        templateIds: data.templateIds ? JSON.stringify(data.templateIds) : null,
        templateData: data.templateData ? JSON.stringify(data.templateData) : null,
        isPublic: data.isPublic,
        createdById: currentUser.id,
        updatedById: currentUser.id
      }

      try {
        const record = await prisma.$transaction(async (tx) => {
          const r = await tx.dataRecord.create({
            data: createData,
            include: dataInclude
          })

          if (data.attachments && data.attachments.length > 0) {
            await tx.dataAttachment.createMany({
              data: data.attachments.map(a => ({
                dataId: r.id,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                storagePath: a.storagePath || '',
                fileType: a.fileType,
                fileSize: a.fileSize,
                contentHash: a.contentHash || '',
                width: a.width ?? null,
                height: a.height ?? null,
                uploadedById: currentUser.id
              }))
            })
          }

          await tx.operationLog.create({
            data: {
              userId: currentUser.id,
              action: 'create',
              module: 'data',
              targetId: r.id,
              targetName: r.dataNo,
              detail: JSON.stringify({ dataNo: r.dataNo })
            }
          })

          return r
        })

        return {
          success: true,
          data: record,
          message: '数据记录创建成功'
        }
      } catch (error) {
        if (isDataNoConflict(error) && attempt < 4) {
          continue
        }

        throw error
      }
    }

    throw createError({
      statusCode: 500,
      message: '记录编号生成失败，请重试'
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

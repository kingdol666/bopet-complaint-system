import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, requireWritePermission, canViewDepartment, canModifyDepartment, isNormalUser } from '~/server/utils/auth'
import { ossDelete } from '~/server/utils/oss'

const updateSchema = z.object({
  feedbackDate: z.string().transform((v) => new Date(v)).optional(),
  productionTime: z.string().transform((v) => new Date(v)).nullable().optional(),
  productModelId: z.number().int().nullable().optional(),
  shaftCount: z.number().int().positive().nullable().optional(),
  thickness: z.string().max(50).nullable().optional(),
  rollNo: z.string().max(200).nullable().optional(),
  specification: z.string().max(100).nullable().optional(),
  customerId: z.number().int().nullable().optional(),
  quantityInvolved: z.number().int().positive().nullable().optional(),
  application: z.string().max(200).nullable().optional(),
  productionLineId: z.number().int().nullable().optional(),
  shiftTeam: z.string().max(50).nullable().optional(),
  machineNo: z.string().max(50).nullable().optional(),
  batchNo: z.string().max(100).nullable().optional(),
  feedbackContent: z.string().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.number().int().nullable().optional(),
  responsibleProcessId: z.number().int().nullable().optional(),
  rootCauseAnalysis: z.string().nullable().optional(),
  correctiveAction: z.string().nullable().optional(),
  lessonsLearned: z.string().nullable().optional(),
  reviewConclusion: z.string().nullable().optional(),
  productUsage: z.string().max(200).nullable().optional(),
  improvementAction: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  templateIds: z.array(z.number().int()).optional().nullable(),
  templateData: z.record(z.any()).nullable().optional(),
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

const dataInclude = {
  customer: true,
  productModel: true,
  productionLine: true,
  responsibleDept: true,
  responsibleProcess: true,
  attachments: true
} as const

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '0', 10)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '无效的 ID'
    })
  }

  if (event.method === 'GET') {
    const currentUser = await requireSessionUser(event)

    const record = await prisma.dataRecord.findUnique({
      where: { id },
      include: {
        ...dataInclude,
        createdBy: { select: { id: true, name: true, username: true } },
        updatedBy: { select: { id: true, name: true, username: true } }
      }
    })

    if (!record) {
      throw createError({
        statusCode: 404,
        message: '数据记录不存在'
      })
    }

    // Check department access (view: own + cross-dept granted)
    if (!canViewDepartment(currentUser, record.responsibleDeptId)) {
      throw createError({
        statusCode: 403,
        message: '您没有查看该记录的权限'
      })
    }

    return {
      success: true,
      data: record
    }
  }

  if (event.method === 'PUT') {
    try {
      const currentUser = await requireWritePermission(event)
      const body = await readBody(event)
      const data = updateSchema.parse(body)

      const existing = await prisma.dataRecord.findUnique({
        where: { id }
      })

      if (!existing) {
        throw createError({
          statusCode: 404,
          message: '数据记录不存在'
        })
      }

      // Check department access for existing record (modify: own dept only)
      if (!canModifyDepartment(currentUser, existing.responsibleDeptId)) {
        throw createError({
          statusCode: 403,
          message: '您没有修改该记录的权限（仅本部门管理员可修改）'
        })
      }

      // Normal users cannot modify records
      if (isNormalUser(currentUser)) {
        throw createError({
          statusCode: 403,
          message: '普通用户没有修改权限'
        })
      }

      // If changing department, check modify access to new department
      if (data.responsibleDeptId !== undefined && !canModifyDepartment(currentUser, data.responsibleDeptId)) {
        throw createError({
          statusCode: 403,
          message: '您没有将该记录分配到该部门的权限'
        })
      }

      const { attachments, ...updateFields } = data

      const record = await prisma.dataRecord.update({
        where: { id },
        data: {
          ...updateFields,
          templateIds: data.templateIds !== undefined
            ? JSON.stringify(data.templateIds)
            : undefined,
          templateData: data.templateData !== undefined
            ? (data.templateData ? JSON.stringify(data.templateData) : null)
            : undefined,
          updatedById: currentUser.id
        },
        include: dataInclude
      })

      // Handle attachments: delete old, create new (in transaction)
      let oldAttachmentPaths: { storagePath: string | null; fileUrl: string }[] = []
      if (attachments !== undefined) {
        oldAttachmentPaths = await prisma.dataAttachment.findMany({
          where: { dataId: id },
          select: { storagePath: true, fileUrl: true }
        })

        await prisma.$transaction(async (tx) => {
          await tx.dataAttachment.deleteMany({ where: { dataId: id } })
          if (attachments && attachments.length > 0) {
            await tx.dataAttachment.createMany({
              data: attachments.map(a => ({
                dataId: record.id,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                storagePath: a.storagePath || '',
                fileType: a.fileType,
                fileSize: a.fileSize,
                contentHash: a.contentHash || '',
                width: a.width,
                height: a.height,
                uploadedById: currentUser.id
              }))
            })
          }
        })

        // 事务成功后清理旧 OSS 文件（失败不影响业务）
        for (const att of oldAttachmentPaths) {
          try {
            if (att.storagePath) {
              await ossDelete(att.storagePath)
            } else {
              const oldPath = att.fileUrl?.replace('/oss/', '')
              if (oldPath) await ossDelete(oldPath)
            }
          } catch {
            // 忽略 OSS 清理失败
          }
        }
      }

      await prisma.operationLog.create({
        data: {
          userId: currentUser.id,
          action: 'update',
          module: 'data',
          targetId: record.id,
          targetName: record.dataNo,
          detail: JSON.stringify({ updatedFields: Object.keys(data) })
        }
      })

      return {
        success: true,
        data: record,
        message: '数据记录更新成功'
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError({
          statusCode: 400,
          message: error.errors[0].message
        })
      }

      throw error
    }
  }

  if (event.method === 'DELETE') {
    const currentUser = await requireWritePermission(event)

    const existing = await prisma.dataRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '数据记录不存在'
      })
    }

      // Check department access (modify: own dept only)
      if (!canModifyDepartment(currentUser, existing.responsibleDeptId)) {
        throw createError({
          statusCode: 403,
          message: '您没有删除该记录的权限（仅本部门管理员可删除）'
        })
      }

      // Normal users cannot delete records
      if (isNormalUser(currentUser)) {
      throw createError({
        statusCode: 403,
        message: '普通用户没有删除权限'
      })
    }

    // 删除前先记录需要清理的 OSS 文件路径（级联删除会清掉附件表记录）
    const attachmentsToClean = await prisma.dataAttachment.findMany({
      where: { dataId: id },
      select: { storagePath: true, fileUrl: true }
    })

    await prisma.$transaction([
      prisma.dataRecord.delete({ where: { id } }),
      prisma.operationLog.create({
        data: {
          userId: currentUser.id,
          action: 'delete',
          module: 'data',
          targetId: existing.id,
          targetName: existing.dataNo,
          detail: JSON.stringify({ dataNo: existing.dataNo })
        }
      })
    ])

    // 事务成功后异步清理 OSS 物理文件（失败不影响业务）
    for (const att of attachmentsToClean) {
      try {
        if (att.storagePath) {
          await ossDelete(att.storagePath)
        } else {
          const oldPath = att.fileUrl?.replace('/oss/', '')
          if (oldPath) await ossDelete(oldPath)
        }
      } catch {
        // 忽略 OSS 清理失败
      }
    }

    return {
      success: true,
      message: '数据记录已删除'
    }
  }

  throw createError({
    statusCode: 405,
    message: 'Method Not Allowed'
  })
})

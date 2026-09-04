import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canViewDepartment, canModifyDepartment, isSuperAdmin, isNormalUser } from '~/server/utils/auth'
import { ossDelete } from '~/server/utils/oss'
import { DATA_INCLUDE, DATA_INCLUDE_FULL, DB_COLUMNS, EDITABLE_DATE_COLUMNS, DB_INT_COLUMNS, isFKColumn, getFKMeta } from '~/server/utils/db-columns'

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
  isPublic: z.boolean().optional(),
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
  ...DATA_INCLUDE,
  attachments: true
} as const

/**
 * 检查记录的 templateIds 是否与已授权模板列表有交集。
 * templateIds 存储为 JSON 数组字符串（如 "[1,2]"），需精确匹配数字避免 1 误匹配 11。
 */
async function hasTemplateAccess(templateIdsJson: string | null, grantedTemplateIds: number[]): Promise<boolean> {
  if (!templateIdsJson || grantedTemplateIds.length === 0) return false
  let ids: number[] = []
  try {
    const parsed = JSON.parse(templateIdsJson)
    if (Array.isArray(parsed)) ids = parsed
  } catch {
    return false
  }
  const granted = new Set(grantedTemplateIds)
  return ids.some(id => granted.has(Number(id)))
}

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
      include: DATA_INCLUDE_FULL
    })

    if (!record) {
      throw createError({
        statusCode: 404,
        message: '数据记录不存在'
      })
    }

    // 权限检查：superadmin 可查看全部
    if (!isSuperAdmin(currentUser)) {
      // 私密数据：只有创建者可查看
      // 公开数据：本部门 + 跨部门授权 + 无部门公开数据 可查看
      // 模板级授权：数据关联了已授权的模板且为公开数据时可查看
      const isOwner = record.createdById === currentUser.id
      const canViewDept = canViewDepartment(currentUser, record.responsibleDeptId)
      const isPublicNoDept = !record.responsibleDeptId && record.isPublic
      let canViewTemplateAccess = false
      if (!isOwner && record.isPublic && !canViewDept && (currentUser.grantedTemplateIds || []).length > 0) {
        canViewTemplateAccess = await hasTemplateAccess(record.templateIds, currentUser.grantedTemplateIds)
      }
      if (!isOwner && !isPublicNoDept && !canViewTemplateAccess && !(canViewDept && record.isPublic)) {
        throw createError({
          statusCode: 403,
          message: '您没有查看该记录的权限'
        })
      }
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

      const existing = await prisma.dataRecord.findUnique({
        where: { id }
      })

      if (!existing) {
        throw createError({
          statusCode: 404,
          message: '数据记录不存在'
        })
      }

      // 权限检查：
      // - superadmin: 可修改全部
      // - admin: 可修改本部门数据 + 自己创建的数据
      // - normal: 只能修改自己创建的数据
      const isOwner = existing.createdById === currentUser.id
      if (!isSuperAdmin(currentUser) && !isOwner && !canModifyDepartment(currentUser, existing.responsibleDeptId)) {
        throw createError({
          statusCode: 403,
          message: '您没有修改该记录的权限'
        })
      }

      // 如果要更改责任部门，检查新部门的修改权限
      if (data.responsibleDeptId !== undefined && data.responsibleDeptId !== existing.responsibleDeptId) {
        // 普通用户不能更改部门
        if (isNormalUser(currentUser) && !isSuperAdmin(currentUser)) {
          throw createError({ statusCode: 403, message: '您无权更改数据的责任部门' })
        }
        if (!canModifyDepartment(currentUser, data.responsibleDeptId)) {
          throw createError({
            statusCode: 403,
            message: '您没有将该记录分配到该部门的权限'
          })
        }
      }

      const { attachments, ...updateFields } = data

      // 从 templateData 中提取匹配 DB 列名的值，同时写入 DB 列
      // （与创建 API 和导入 API 行为一致）
      if (data.templateData && typeof data.templateData === 'object') {
        for (const [key, val] of Object.entries(data.templateData)) {
          if (val === null || val === undefined || val === '') continue
          if (!DB_COLUMNS.has(key)) continue
          // 如果 updateFields 中已有该字段，不覆盖
          if (updateFields[key] !== undefined) continue

          const fkMeta = isFKColumn(key) ? getFKMeta(key) : null
          if (fkMeta) {
            if (typeof val === 'number') updateFields[key] = val
          } else if (EDITABLE_DATE_COLUMNS.has(key)) {
            const parsed = new Date(val as string)
            if (!isNaN(parsed.getTime())) updateFields[key] = parsed as any
          } else if (DB_INT_COLUMNS.has(key)) {
            const n = parseInt(String(val), 10)
            if (!isNaN(n)) updateFields[key] = n as any
          } else {
            updateFields[key] = String(val)
          }
        }
      }

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
    const currentUser = await requireSessionUser(event)

    const existing = await prisma.dataRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '数据记录不存在'
      })
    }

    // 权限检查：
    // - superadmin: 可删除全部
    // - admin: 可删除本部门数据 + 自己创建的数据
    // - normal: 只能删除自己创建的数据
    const isOwner = existing.createdById === currentUser.id
    if (!isSuperAdmin(currentUser) && !isOwner && !canModifyDepartment(currentUser, existing.responsibleDeptId)) {
      throw createError({
        statusCode: 403,
        message: '您没有删除该记录的权限'
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

  // PATCH: 切换数据公开/私密状态
  if (event.method === 'PATCH') {
    const currentUser = await requireSessionUser(event)
    const body = await readBody(event)
    const { isPublic } = body as { isPublic?: boolean }

    if (typeof isPublic !== 'boolean') {
      throw createError({ statusCode: 400, message: '缺少 isPublic 参数' })
    }

    const existing = await prisma.dataRecord.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: '数据记录不存在' })
    }

    // 权限：仅数据的创建者可以设置公开/私密（管理员也不可修改他人数据的私密状态）。
    // superadmin 作为系统最高权限例外可操作。
    const isOwner = existing.createdById === currentUser.id
    if (!isOwner && !isSuperAdmin(currentUser)) {
      throw createError({ statusCode: 403, message: '只有数据的创建者才能设置公开/私密状态' })
    }

    const record = await prisma.dataRecord.update({
      where: { id },
      data: { isPublic, updatedById: currentUser.id },
      include: dataInclude
    })

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        action: 'update',
        module: 'data',
        targetId: record.id,
        targetName: record.dataNo,
        detail: JSON.stringify({ isPublic })
      }
    })

    return { success: true, data: record, message: isPublic ? '已设为公开' : '已设为私密' }
  }

  throw createError({
    statusCode: 405,
    message: 'Method Not Allowed'
  })
})

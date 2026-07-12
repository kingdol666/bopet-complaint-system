/**
 * GET /api/images/[dataId] — 获取记录的所有图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canViewDepartment, isSuperAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')

    // 获取记录信息用于权限检查
    const record = await prisma.dataRecord.findUnique({
      where: { id: dataId },
      select: { responsibleDeptId: true, isPublic: true, createdById: true }
    })
    if (!record) throw createError({ statusCode: 404, message: '数据记录不存在' })

    // 权限检查：与详情页相同的逻辑
    if (!isSuperAdmin(currentUser)) {
      const isOwner = record.createdById === currentUser.id
      const canViewDept = canViewDepartment(currentUser, record.responsibleDeptId)
      const isPublicNoDept = !record.responsibleDeptId && record.isPublic
      if (!isOwner && !isPublicNoDept && !(canViewDept && record.isPublic)) {
        throw createError({ statusCode: 403, message: '您没有查看该记录附件的权限' })
      }
    }

    const attachments = await prisma.dataAttachment.findMany({
      where: { dataId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        storagePath: true,
        fileType: true,
        fileSize: true,
        width: true,
        height: true,
        createdAt: true
      }
    })

    return { success: true, data: attachments }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取图片列表失败' })
  }
})

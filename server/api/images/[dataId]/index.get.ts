/**
 * GET /api/images/[dataId] — 获取记录的所有图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canAccessDepartment } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')

    // 校验部门访问权限
    const record = await prisma.dataRecord.findUnique({ where: { id: dataId }, select: { responsibleDeptId: true } })
    if (!record) throw createError({ statusCode: 404, message: '数据记录不存在' })
    if (!canAccessDepartment(currentUser, record.responsibleDeptId)) {
      throw createError({ statusCode: 403, message: '您没有查看该记录附件的权限' })
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

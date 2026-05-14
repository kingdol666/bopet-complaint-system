/**
 * DELETE /api/images/[dataId]/[imageId] — 删除指定图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, canAccessDepartment } from '~/server/utils/auth'
import { ossDelete } from '~/server/utils/oss'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')
    const imageId = Number(getRouterParam(event, 'imageId') || '0')

    const attachment = await prisma.dataAttachment.findUnique({ where: { id: imageId } })
    if (!attachment) throw createError({ statusCode: 404, message: '图片不存在' })

    // Verify attachment belongs to the specified dataId
    if (attachment.dataId !== dataId) {
      throw createError({ statusCode: 400, message: '图片与数据记录不匹配' })
    }

    // Check department access
    if (dataId) {
      const record = await prisma.dataRecord.findUnique({ where: { id: dataId }, select: { responsibleDeptId: true } })
      if (record && !canAccessDepartment(currentUser, record.responsibleDeptId)) {
        throw createError({ statusCode: 403, message: '无权删除该记录的图片' })
      }
    }

    // 删除 OSS 文件
    // @ts-ignore - storagePath 字段在数据库迁移后添加，Prisma 客户端可能未更新
    if ((attachment as any).storagePath) {
      await ossDelete((attachment as any).storagePath)
    } else {
      const oldPath = attachment.fileUrl?.replace('/oss/', '')
      if (oldPath) await ossDelete(oldPath)
    }

    await prisma.dataAttachment.delete({ where: { id: imageId } })

    return { success: true, message: '图片已删除' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除失败' })
  }
})

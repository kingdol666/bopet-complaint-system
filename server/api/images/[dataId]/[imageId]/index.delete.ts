/**
 * DELETE /api/images/[dataId]/[imageId] — 删除指定图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canModifyDepartment, isSuperAdmin } from '~/server/utils/auth'
import { ossDelete } from '~/server/utils/oss'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')
    const imageId = Number(getRouterParam(event, 'imageId') || '0')

    const attachment = await prisma.dataAttachment.findUnique({ where: { id: imageId } })
    if (!attachment) throw createError({ statusCode: 404, message: '图片不存在' })

    // Verify attachment belongs to the specified dataId
    if (attachment.dataId !== dataId) {
      throw createError({ statusCode: 400, message: '图片与数据记录不匹配' })
    }

    // 权限检查：创建者或本部门 admin 可删除附件
    if (dataId) {
      const record = await prisma.dataRecord.findUnique({ where: { id: dataId }, select: { responsibleDeptId: true, createdById: true } })
      if (record) {
        const isOwner = record.createdById === currentUser.id
        if (!isSuperAdmin(currentUser) && !isOwner && !canModifyDepartment(currentUser, record.responsibleDeptId)) {
          throw createError({ statusCode: 403, message: '无权删除该记录的图片' })
        }
      }
    }

    // 先删除数据库记录，保证数据一致性
    await prisma.dataAttachment.delete({ where: { id: imageId } })

    // 再删除 OSS 文件（失败不影响 DB 一致性）
    try {
      if (attachment.storagePath) {
        await ossDelete(attachment.storagePath)
      } else {
        const oldPath = attachment.fileUrl?.replace('/oss/', '')
        if (oldPath) await ossDelete(oldPath)
      }
    } catch {
      // OSS 删除失败仅记录，不阻断接口返回成功
    }

    return { success: true, message: '图片已删除' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除失败' })
  }
})

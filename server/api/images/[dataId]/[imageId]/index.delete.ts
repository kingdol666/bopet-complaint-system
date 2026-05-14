/**
 * DELETE /api/images/[dataId]/[imageId] — 删除指定图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'
import { ossDelete } from '~/server/utils/oss'

export default defineEventHandler(async (event) => {
  try {
    await requireWritePermission(event)
    const imageId = Number(getRouterParam(event, 'imageId') || '0')

    const attachment = await prisma.dataAttachment.findUnique({ where: { id: imageId } })
    if (!attachment) throw createError({ statusCode: 404, message: '图片不存在' })

    // 删除 OSS 文件
    if (attachment.storagePath) {
      await ossDelete(attachment.storagePath)
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

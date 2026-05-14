/**
 * GET /api/images/[dataId] — 获取记录的所有图片
 */
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')

    const attachments = await prisma.dataAttachment.findMany({
      where: {
        dataId,
        fileType: { startsWith: 'image/' }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
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

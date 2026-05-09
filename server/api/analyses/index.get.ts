import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const analyses = await prisma.savedAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    })

    return { success: true, data: analyses }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

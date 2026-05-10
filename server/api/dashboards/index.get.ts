import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const dashboards = await prisma.analysisDashboard.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { analyses: true } }
      }
    })

    return { success: true, data: dashboards }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取看板列表失败' })
  }
})

import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')

    const dashboard = await prisma.analysisDashboard.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!dashboard || dashboard.userId !== user.id) {
      throw createError({ statusCode: 404, message: '看板不存在' })
    }

    return { success: true, data: dashboard }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取看板详情失败' })
  }
})

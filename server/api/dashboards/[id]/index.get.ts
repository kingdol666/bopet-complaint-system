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

    let canRead = dashboard && dashboard.userId === user.id
    if (!canRead && dashboard && dashboard.visibility === 'department') {
      // 同部门共享：创建者与当前用户存在共同部门，或当前用户为 superadmin
      if (user.role === 'superadmin') {
        canRead = true
      } else {
        const owner = await prisma.user.findUnique({
          where: { id: dashboard.userId },
          select: { departments: { select: { departmentId: true } } }
        })
        canRead = !!(owner?.departments || []).some(d => user.departmentIds.includes(d.departmentId))
      }
    }
    if (!canRead) {
      throw createError({ statusCode: 404, message: '看板不存在' })
    }

    return { success: true, data: dashboard }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取看板详情失败' })
  }
})

import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')

    const existing = await prisma.analysisDashboard.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      throw createError({ statusCode: 404, message: '看板不存在' })
    }

    // Detach all panels from this dashboard (set dashboardId to null)
    await prisma.savedAnalysis.updateMany({
      where: { dashboardId: id },
      data: { dashboardId: null, sortOrder: 0 }
    })

    // Delete the dashboard
    await prisma.analysisDashboard.delete({ where: { id } })

    return { success: true, message: '看板删除成功' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除看板失败' })
  }
})

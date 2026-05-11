import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, getVisibleDepartmentIds } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const where: any = { enabled: true }
    const visibleDepts = getVisibleDepartmentIds(user)
    if (visibleDepts !== null) {
      where.id = { in: visibleDepts }
    }

    const departments = await prisma.responsibleDepartment.findMany({
      where,
      include: {
        _count: { select: { userDepartments: true, dataRecords: true } }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return { success: true, data: departments }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

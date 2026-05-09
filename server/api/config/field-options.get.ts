import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, getVisibleDepartmentIds } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const configKey = query.configKey as string | undefined

    const where: any = { enabled: true }

    // Department scoping: users can see global + own department + public
    if (!isSuperAdmin(user)) {
      const deptIds = getVisibleDepartmentIds(user) || []
      where.OR = [
        { departmentId: null },
        ...(deptIds.length > 0 ? [{ departmentId: { in: deptIds } }] : [])
      ]
    }

    if (configKey) {
      where.configKey = configKey
    }

    const configs = await prisma.fieldOptionConfig.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return { success: true, data: configs }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取配置失败' })
  }
})

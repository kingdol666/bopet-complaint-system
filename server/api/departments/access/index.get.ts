import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canWrite } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const scope = (query.scope as string) || 'mine' // 'mine' = 我的授权, 'managed' = 我管理的授权

    const where: any = {}

    if (scope === 'mine') {
      where.userId = user.id
    } else if (scope === 'managed') {
      if (!canWrite(user)) {
        throw createError({ statusCode: 403, message: '仅管理员可查看管理的授权' })
      }
      if (isSuperAdmin(user)) {
        // superadmin 看全部
      } else {
        where.departmentId = { in: user.departmentIds }
      }
    }

    const accesses = await prisma.crossDepartmentAccess.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, username: true } },
        grantedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: accesses }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

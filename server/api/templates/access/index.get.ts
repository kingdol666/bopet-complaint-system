import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canWrite } from '~/server/utils/auth'

/**
 * 模板级访问授权列表
 * scope=mine: 我获得的模板查看授权
 * scope=managed: 我（作为模板所属部门管理员）授出的授权
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const scope = (query.scope as string) || 'mine'

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
        // 仅本部门模板的授权
        where.template = { departmentId: { in: user.departmentIds } }
      }
    }

    const accesses = await prisma.templateAccess.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, departmentId: true, department: { select: { id: true, name: true } } } },
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

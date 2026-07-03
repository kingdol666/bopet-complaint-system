import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canWrite } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const type = (query.type as string) || 'all' // 'outgoing' = 我发起的, 'incoming' = 待我审批的, 'all' = 两者

    const where: any = {}

    if (type === 'outgoing') {
      where.requesterId = user.id
    } else if (type === 'incoming') {
      // admin 可以看到自己部门的 incoming 请求
      if (!canWrite(user)) {
        throw createError({ statusCode: 403, message: '仅管理员可查看待审批请求' })
      }
      if (isSuperAdmin(user)) {
        // superadmin 看全部
      } else {
        where.departmentId = { in: user.departmentIds }
      }
    } else {
      // all: 自己发起的 + (如果是 admin) 自己部门的
      const conditions: any[] = [{ requesterId: user.id }]
      if (canWrite(user)) {
        if (isSuperAdmin(user)) {
          // superadmin 看全部
          where.OR = undefined
        } else {
          conditions.push({ departmentId: { in: user.departmentIds } })
        }
      }
      if (!isSuperAdmin(user)) {
        where.OR = conditions
      }
    }

    const requests = await prisma.crossDepartmentAccessRequest.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, username: true } },
        approver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: requests }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

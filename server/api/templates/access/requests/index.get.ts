import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

/**
 * 模板级访问申请列表
 * type=outgoing: 我发起的申请
 * type=incoming: 待我（作为模板所属部门管理员）审批的申请
 * type=all: 两者
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const query = getQuery(event)
    const type = (query.type as string) || 'all'

    const where: any = {}

    if (type === 'outgoing') {
      where.requesterId = user.id
    } else if (type === 'incoming') {
      // 仅 admin/superadmin 可审批
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        throw createError({ statusCode: 403, message: '仅管理员可查看待审批请求' })
      }
      if (user.role === 'superadmin') {
        // superadmin 看全部
      } else {
        // 仅本部门模板的申请
        where.template = { departmentId: { in: user.departmentIds } }
      }
    } else {
      // all: 自己发起的 + (如果是 admin) 本部门模板的
      const conditions: any[] = [{ requesterId: user.id }]
      if (user.role === 'admin') {
        conditions.push({ template: { departmentId: { in: user.departmentIds } } })
      }
      if (user.role === 'superadmin') {
        // superadmin 看全部
      } else {
        where.OR = conditions
      }
    }

    const requests = await prisma.templateAccessRequest.findMany({
      where,
      include: {
        template: {
          select: {
            id: true, name: true, departmentId: true,
            department: { select: { id: true, name: true } }
          }
        },
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

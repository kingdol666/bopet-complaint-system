import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const myDeptIds = user.departmentIds
    const where: any = user.role === 'superadmin'
      ? {}
      : {
          OR: [
            { userId: user.id },
            // superadmin 创建的部门共享内容对所有用户可见（superadmin 跨部门管理全局数据）
            { visibility: 'department', user: { role: 'superadmin' } },
            {
              visibility: 'department',
              user: { departments: { some: { departmentId: { in: myDeptIds } } } }
            }
          ]
        }

    const dashboards = await prisma.analysisDashboard.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true } },
        _count: { select: { analyses: true } }
      }
    })

    return { success: true, data: dashboards }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取看板列表失败' })
  }
})

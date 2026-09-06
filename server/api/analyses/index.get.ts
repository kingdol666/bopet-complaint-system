import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin } from '~/server/utils/auth'

/**
 * 分析配置列表：自己创建的（无论可见性）+ 同部门共享（visibility=department 且创建者与本用户同部门）。
 * superadmin 可见全部。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const myDeptIds = user.departmentIds
    const where: any = isSuperAdmin(user)
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

    const analyses = await prisma.savedAnalysis.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true } }
      }
    })

    return { success: true, data: analyses }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

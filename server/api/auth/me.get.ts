import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const [userDepts, grantedDepts] = await Promise.all([
      prisma.userDepartment.findMany({
        where: { userId: user.id },
        include: { department: { select: { id: true, name: true } } }
      }),
      prisma.crossDepartmentAccess.findMany({
        where: {
          userId: user.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: { department: { select: { id: true, name: true } } }
      })
    ])

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departments: userDepts.map(d => ({
          id: d.department.id,
          name: d.department.name
        })),
        grantedDepartments: grantedDepts.map(g => ({
          id: g.department.id,
          name: g.department.name
        }))
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取用户信息失败' })
  }
})

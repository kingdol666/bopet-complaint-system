import { prisma } from '~/server/utils/prisma'
import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)

    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      include: { department: { select: { id: true, name: true } } }
    })

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
        }))
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取用户信息失败' })
  }
})

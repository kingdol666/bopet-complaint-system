import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canWrite } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, message: '无效的授权ID' })

    const access = await prisma.crossDepartmentAccess.findUnique({
      where: { id }
    })
    if (!access) throw createError({ statusCode: 404, message: '授权记录不存在' })

    // 权限检查：被授权用户本人、授权部门的管理员、或 superadmin 可以撤销
    const isOwner = access.userId === user.id
    const isDeptAdmin = canWrite(user) && (isSuperAdmin(user) || user.departmentIds.includes(access.departmentId))

    if (!isOwner && !isDeptAdmin) {
      throw createError({ statusCode: 403, message: '无权撤销此授权' })
    }

    await prisma.crossDepartmentAccess.delete({ where: { id } })

    return { success: true, message: '授权已撤销' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})

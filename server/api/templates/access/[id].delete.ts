import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin, canWrite } from '~/server/utils/auth'

/**
 * 撤销模板级查看授权
 * 权限：模板所属部门的管理员、superadmin、或被授权用户本人（放弃授权）
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, message: '无效的授权ID' })

    const access = await prisma.templateAccess.findUnique({
      where: { id },
      include: { template: { select: { id: true, departmentId: true, name: true } } }
    })
    if (!access) throw createError({ statusCode: 404, message: '授权记录不存在' })

    // 权限检查：被授权用户本人、模板所属部门的管理员、或 superadmin
    const isOwner = access.userId === user.id
    const isDeptAdmin = canWrite(user) && (isSuperAdmin(user) || (access.template.departmentId && user.departmentIds.includes(access.template.departmentId)))

    if (!isOwner && !isDeptAdmin) {
      throw createError({ statusCode: 403, message: '无权撤销此授权（仅模板所属部门管理员可操作）' })
    }

    await prisma.templateAccess.delete({ where: { id } })

    return { success: true, message: '授权已撤销' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})

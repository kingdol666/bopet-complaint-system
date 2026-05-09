import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, isSuperAdmin, canAccessDepartment } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')

    const existing = await prisma.fieldOptionConfig.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: '配置不存在' })

    if (!isSuperAdmin(user)) {
      if (!existing.departmentId) throw createError({ statusCode: 403, message: '无权删除全局配置' })
      if (!canAccessDepartment(user, existing.departmentId)) throw createError({ statusCode: 403, message: '无权删除该配置' })
    }

    // Soft delete
    await prisma.fieldOptionConfig.update({ where: { id }, data: { enabled: false } })
    return { success: true, message: '配置已删除' }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除失败' })
  }
})

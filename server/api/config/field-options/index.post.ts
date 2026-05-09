import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, isSuperAdmin, canAccessDepartment } from '~/server/utils/auth'

const schema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1).max(200),
  configKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'configKey只能包含小写字母/数字/下划线'),
  options: z.array(z.string().min(1)).min(1, '至少需要一个选项'),
  departmentId: z.number().int().nullable().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const body = await readBody(event)
    const data = schema.parse(body)

    // Permission: only superadmin can create global configs
    if (!data.departmentId && !isSuperAdmin(user)) {
      throw createError({ statusCode: 403, message: '仅超级管理员可创建全局配置' })
    }

    // Department admin can only create for own dept
    if (data.departmentId && !isSuperAdmin(user) && !canAccessDepartment(user, data.departmentId)) {
      throw createError({ statusCode: 403, message: '无权在该部门创建配置' })
    }

    const optionsJson = JSON.stringify(data.options)

    let result
    if (data.id) {
      // Check permission on existing config
      const existing = await prisma.fieldOptionConfig.findUnique({ where: { id: data.id } })
      if (!existing) throw createError({ statusCode: 404, message: '配置不存在' })
      if (!isSuperAdmin(user) && existing.departmentId && !canAccessDepartment(user, existing.departmentId)) {
        throw createError({ statusCode: 403, message: '无权修改该配置' })
      }

      result = await prisma.fieldOptionConfig.update({
        where: { id: data.id },
        data: { name: data.name, options: optionsJson, departmentId: data.departmentId ?? null }
      })
    } else {
      result = await prisma.fieldOptionConfig.create({
        data: {
          name: data.name,
          configKey: data.configKey,
          options: optionsJson,
          departmentId: data.departmentId ?? null,
          createdById: user.id
        }
      })
    }

    return { success: true, data: result, message: data.id ? '配置已更新' : '配置已创建' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})

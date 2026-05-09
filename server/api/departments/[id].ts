import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin } from '~/server/utils/auth'

const updateSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().optional(),
  enabled: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = parseInt(getRouterParam(event, 'id') || '0')

  if (event.method === 'GET') {
    try {
      const dept = await prisma.responsibleDepartment.findUnique({
        where: { id },
        include: {
          userDepartments: { include: { user: { select: { id: true, username: true, name: true, role: true, enabled: true } } } },
          _count: { select: { complaints: true, processes: true } }
        }
      })
      if (!dept) throw createError({ statusCode: 404, message: '部门不存在' })
      return { success: true, data: dept }
    } catch (error: any) {
      throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
    }
  }

  if (!isSuperAdmin(user)) {
    throw createError({ statusCode: 403, message: '仅超级管理员可操作' })
  }

  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const data = updateSchema.parse(body)
      const dept = await prisma.responsibleDepartment.update({ where: { id }, data })
      return { success: true, data: dept, message: '更新成功' }
    } catch (error: any) {
      if (error instanceof z.ZodError) throw createError({ statusCode: 400, message: error.errors[0].message })
      throw createError({ statusCode: error.statusCode || 500, message: error.message || '更新失败' })
    }
  }

  if (event.method === 'DELETE') {
    try {
      await prisma.responsibleDepartment.update({ where: { id }, data: { enabled: false } })
      return { success: true, message: '删除成功' }
    } catch (error: any) {
      throw createError({ statusCode: error.statusCode || 500, message: error.message || '删除失败' })
    }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})

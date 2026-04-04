import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSuperAdminUser, hashPassword } from '~/server/utils/auth'

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  password: z.string().min(1).max(100).optional(),
  role: z.enum(['superadmin', 'admin', 'normal']).optional(),
  enabled: z.boolean().optional(),
  departmentIds: z.array(z.number().int()).optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdminUser(event)

  const id = Number.parseInt(getRouterParam(event, 'id') || '0', 10)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '无效的 ID' })
  }

  if (event.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        departments: {
          select: {
            departmentId: true,
            department: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    }

    return {
      success: true,
      data: {
        ...user,
        departments: user.departments.map(d => ({
          id: d.department.id,
          name: d.department.name
        }))
      }
    }
  }

  if (event.method === 'PUT') {
    try {
      const body = await readBody(event)
      const data = updateUserSchema.parse(body)

      const existing = await prisma.user.findUnique({ where: { id } })
      if (!existing) {
        throw createError({ statusCode: 404, statusMessage: '用户不存在' })
      }

      // Build update data
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.password !== undefined) updateData.password = hashPassword(data.password)
      if (data.role !== undefined) updateData.role = data.role
      if (data.enabled !== undefined) updateData.enabled = data.enabled

      // Update departments if provided
      if (data.departmentIds !== undefined) {
        // Validate department IDs
        if (data.departmentIds.length > 0) {
          const depts = await prisma.responsibleDepartment.findMany({
            where: { id: { in: data.departmentIds }, enabled: true }
          })
          if (depts.length !== data.departmentIds.length) {
            throw createError({ statusCode: 400, statusMessage: '包含无效的部门ID' })
          }
        }

        // Delete old and create new
        await prisma.userDepartment.deleteMany({ where: { userId: id } })
        updateData.departments = {
          create: data.departmentIds.map((deptId: number) => ({
            departmentId: deptId
          }))
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          departments: {
            select: {
              departmentId: true,
              department: { select: { id: true, name: true } }
            }
          }
        }
      })

      return {
        success: true,
        data: {
          ...user,
          departments: user.departments.map(d => ({
            id: d.department.id,
            name: d.department.name
          }))
        },
        message: '用户更新成功'
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createError({ statusCode: 400, statusMessage: error.errors[0].message })
      }
      throw error
    }
  }

  if (event.method === 'DELETE') {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    }

    // Delete user departments first, then user
    await prisma.userDepartment.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })

    return {
      success: true,
      message: '用户已删除'
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})

import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSuperAdminUser, hashPassword } from '~/server/utils/auth'

const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  password: z.string().min(1, '密码不能为空').max(100),
  name: z.string().min(1, '姓名不能为空').max(50),
  role: z.enum(['superadmin', 'admin', 'normal']),
  enabled: z.boolean().default(true),
  departmentIds: z.array(z.number().int()).default([])
})

export default defineEventHandler(async (event) => {
  await requireSuperAdminUser(event)

  try {
    const body = await readBody(event)
    const data = createUserSchema.parse(body)

    // Check if username exists
    const existing = await prisma.user.findUnique({
      where: { username: data.username }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户名已存在'
      })
    }

    // Validate department IDs
    if (data.departmentIds.length > 0) {
      const depts = await prisma.responsibleDepartment.findMany({
        where: { id: { in: data.departmentIds }, enabled: true }
      })
      if (depts.length !== data.departmentIds.length) {
        throw createError({
          statusCode: 400,
          statusMessage: '包含无效的部门ID'
        })
      }
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashPassword(data.password),
        name: data.name,
        role: data.role,
        enabled: data.enabled,
        departments: {
          create: data.departmentIds.map(deptId => ({
            departmentId: deptId
          }))
        }
      },
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
      message: '用户创建成功'
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0].message
      })
    }
    throw error
  }
})

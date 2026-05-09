import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSuperAdminUser } from '~/server/utils/auth'

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  sortOrder: z.coerce.number().int().default(0)
})

export default defineEventHandler(async (event) => {
  try {
    await requireSuperAdminUser(event)
    const body = await readBody(event)
    const validated = createSchema.parse(body)

    const dept = await prisma.responsibleDepartment.create({ data: validated })

    return { success: true, data: dept, message: '部门创建成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) throw createError({ statusCode: 400, message: error.errors[0].message })
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '创建失败' })
  }
})

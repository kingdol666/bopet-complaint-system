import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  config: z.object({}).passthrough(),
  dashboardId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  gridW: z.number().int().min(1).max(3).optional(),
  gridH: z.number().int().min(1).max(3).optional(),
  visibility: z.enum(['private', 'department']).default('private')
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const body = await readBody(event)
    const validated = createSchema.parse(body)

    const analysis = await prisma.savedAnalysis.create({
      data: {
        userId: user.id,
        name: validated.name,
        config: JSON.stringify(validated.config),
        dashboardId: validated.dashboardId ?? null,
        sortOrder: validated.sortOrder ?? 0,
        gridW: validated.gridW ?? 1,
        gridH: validated.gridH ?? 1,
        visibility: validated.visibility
      }
    })

    return { success: true, data: analysis, message: '保存成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '保存失败' })
  }
})

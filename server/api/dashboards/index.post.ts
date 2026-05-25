import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100),
  description: z.string().max(500).optional(),
  panelIds: z.array(z.number()).optional(), // 要加入此看板的已保存分析 ID 列表
  layout: z.any().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const body = await readBody(event)
    const validated = createSchema.parse(body)

    const dashboard = await prisma.analysisDashboard.create({
      data: {
        userId: user.id,
        name: validated.name,
        description: validated.description || null,
        layout: validated.layout ? JSON.stringify(validated.layout) : '{}'
      }
    })

    // If panel IDs provided, assign them to this dashboard
    if (validated.panelIds && validated.panelIds.length > 0) {
      await prisma.savedAnalysis.updateMany({
        where: {
          id: { in: validated.panelIds },
          userId: user.id
        },
        data: { dashboardId: dashboard.id }
      })
    }

    return { success: true, data: dashboard, message: '看板创建成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '创建看板失败' })
  }
})

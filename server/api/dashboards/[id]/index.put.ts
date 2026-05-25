import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  layout: z.any().optional(),
  panelIds: z.array(z.number()).optional() // 更新看板成员面板列表
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireWritePermission(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const validated = updateSchema.parse(body)

    const existing = await prisma.analysisDashboard.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      throw createError({ statusCode: 404, message: '看板不存在' })
    }

    const data: any = {}
    if (validated.name) data.name = validated.name
    if (validated.description !== undefined) data.description = validated.description
    if (validated.layout) data.layout = JSON.stringify(validated.layout)

    const dashboard = await prisma.analysisDashboard.update({
      where: { id },
      data
    })

    // Update panel assignments
    if (validated.panelIds !== undefined) {
      // Remove all panels from this dashboard first
      await prisma.savedAnalysis.updateMany({
        where: { dashboardId: id },
        data: { dashboardId: null, sortOrder: 0 }
      })
      // Assign selected panels to this dashboard with sort order
      for (let i = 0; i < validated.panelIds.length; i++) {
        await prisma.savedAnalysis.update({
          where: { id: validated.panelIds[i] },
          data: { dashboardId: id, sortOrder: i }
        })
      }
    }

    return { success: true, data: dashboard, message: '看板更新成功' }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '更新看板失败' })
  }
})

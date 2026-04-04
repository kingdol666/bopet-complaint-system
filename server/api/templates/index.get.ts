import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const where: any = { enabled: true }

  if (!isSuperAdmin(user)) {
    const deptIds = user.departmentIds || []
    where.OR = [
      { departmentId: null },
      ...(deptIds.length > 0 ? [{ departmentId: { in: deptIds } }] : [])
    ]
  }

  const templates = await prisma.formTemplate.findMany({
    where,
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      fields: { orderBy: { sortOrder: 'asc' } }
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
  })

  return { success: true, data: templates }
})

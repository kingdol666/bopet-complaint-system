import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, isSuperAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const query = getQuery(event)

  // all=1: 返回所有启用的模板（用于模板访问申请目录，含非公开部门模板）
  const showAll = query.all === '1' || query.all === 1

  const where: any = { enabled: true }

  if (!isSuperAdmin(user) && !showAll) {
    const deptIds = user.departmentIds || []
    // Users can see: global templates (departmentId=null), own department templates, and public templates from any department
    where.OR = [
      { departmentId: null },
      { isPublic: true },
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

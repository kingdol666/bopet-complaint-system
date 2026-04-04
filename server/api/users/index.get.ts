import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSuperAdminUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireSuperAdminUser(event)

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const keyword = (query.keyword as string) || ''

  const where: any = {}
  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { name: { contains: keyword } }
    ]
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
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
      },
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ])

  return {
    success: true,
    data: {
      records: users.map(u => ({
        ...u,
        departments: u.departments.map(d => ({
          id: d.department.id,
          name: d.department.name
        }))
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }
})

import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canViewDepartment } from '~/server/utils/auth'

// Returns only template-specific fields for custom analysis
export default defineEventHandler(async (event) => {
  try {
    const user = await requireSessionUser(event)
    const id = Number.parseInt(getRouterParam(event, 'id') || '0')

    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: { fields: { orderBy: { sortOrder: 'asc' } } }
    })

    if (!template || !template.enabled) {
      throw createError({ statusCode: 404, message: '模板不存在' })
    }

    if (template.departmentId && !template.isPublic && !canViewDepartment(user, template.departmentId)) {
      throw createError({ statusCode: 403, message: '无权访问该模板' })
    }

    const filterableTypes = ['text', 'textarea', 'number', 'select', 'date', 'switch', 'select-config', 'auto-complete']
    const filterFields: any[] = []

    for (const f of template.fields) {
      if (!filterableTypes.includes(f.fieldType)) continue

      const ff: any = {
        fieldKey: f.fieldKey,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType,
        configType: f.configType
      }

      if (f.fieldType === 'select' && f.options) {
        try { ff.options = JSON.parse(f.options).map((v: string) => ({ label: v, value: v })) } catch {}
      } else if (f.fieldType === 'select-config' && f.configType) {
        const config = await prisma.fieldOptionConfig.findFirst({
          where: { configKey: f.configType, enabled: true }
        })
        if (config) {
          try { ff.options = JSON.parse(config.options).map((v: string) => ({ label: v, value: v })) } catch {}
        }
      } else if (f.configType === 'customers') {
        const customers = await prisma.customer.findMany({ where: { enabled: true }, select: { id: true, name: true } })
        ff.options = customers.map((c: any) => ({ label: c.name, value: c.id }))
      } else if (f.configType === 'productModels') {
        const models = await prisma.productModel.findMany({ where: { enabled: true }, select: { id: true, name: true } })
        ff.options = models.map((m: any) => ({ label: m.name, value: m.id }))
      } else if (f.configType === 'responsibleDepartments') {
        const depts = await prisma.responsibleDepartment.findMany({ where: { enabled: true }, select: { id: true, name: true } })
        ff.options = depts.map((d: any) => ({ label: d.name, value: d.id }))
      }

      filterFields.push(ff)
    }

    return { success: true, data: filterFields }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

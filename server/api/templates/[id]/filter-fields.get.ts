import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canViewDepartment } from '~/server/utils/auth'
import { CONFIG_TYPE_FK_MAP } from '~/server/utils/db-columns'

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

      // ─── 1. FK configType (customers / productModels / productionLines / responsibleDepartments / responsibleProcesses) ───
      // 优先处理 FK 类型，因为后端过滤 SQL 期望 name 而非 id
      // 使用 db-columns.ts 中的统一映射，确保 prismaModel 名与 schema 一致
      if (f.configType && CONFIG_TYPE_FK_MAP[f.configType]) {
        const meta = CONFIG_TYPE_FK_MAP[f.configType]
        const entities = await (prisma as any)[meta.prismaModel].findMany({
          where: { enabled: true },
          select: { name: true },
          orderBy: { sortOrder: 'asc' }
        })
        ff.options = entities.map((e: any) => ({ label: e.name, value: e.name }))
      }
      // ─── 2. select 类型：直接解析 options JSON ───
      else if (f.fieldType === 'select' && f.options) {
        // 兼容两种历史格式：JSON 数组字符串 / 逗号分隔字符串
        try {
          ff.options = JSON.parse(f.options).map((v: string) => ({ label: v, value: v }))
        } catch {
          ff.options = String(f.options).split(/[,，]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0).map((v: string) => ({ label: v, value: v }))
        }
      }
      // ─── 3. 其他 select-config 类型：从 FieldOptionConfig 表查找 ───
      else if (f.fieldType === 'select-config' && f.configType) {
        const config = await prisma.fieldOptionConfig.findFirst({
          where: { configKey: f.configType, enabled: true }
        })
        if (config) {
          try { ff.options = JSON.parse(config.options).map((v: string) => ({ label: v, value: v })) } catch {}
        }
      }

      filterFields.push(ff)
    }

    return { success: true, data: filterFields }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '获取失败' })
  }
})

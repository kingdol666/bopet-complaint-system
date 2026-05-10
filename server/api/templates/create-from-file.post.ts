import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, isSuperAdmin, getVisibleDepartmentIds } from '~/server/utils/auth'

function detectType(values: any[], rowCount: number, selectThreshold: number = 5): string {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  if (nonEmpty.length === 0) return 'text'

  const allNums = nonEmpty.every(v => { const n = Number(v); return !isNaN(n) && isFinite(n) })
  if (allNums) return 'number'

  const dp = [/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/, /^\d{1,2}[-./]\d{1,2}[-./]\d{4}/]
  const allDates = nonEmpty.every(v => {
    const s = String(v).trim()
    if (dp.some(p => p.test(s))) return true
    if (typeof v === 'number' && v > 40000 && v < 60000) return true
    return !isNaN(new Date(s).getTime())
  })
  if (allDates) return 'date'

  const bools = ['是', '否', 'yes', 'no', 'true', 'false', '0', '1', 'Y', 'N']
  const allBool = nonEmpty.every(v => bools.includes(String(v).trim().toUpperCase()))
  if (allBool && nonEmpty.length > 0) return 'switch'

  // 数据量小于100条时，全部是文本类型
  if (rowCount < 100) return 'text'

  // 数据量大于等于100条时，检查唯一值数量
  const unique = [...new Set(nonEmpty.map(v => String(v).trim()))]
  if (unique.length <= selectThreshold && nonEmpty.every(v => String(v).length < 40)) return 'select'

  const avgLen = nonEmpty.reduce((s, v) => s + String(v).length, 0) / nonEmpty.length
  return avgLen > 50 ? 'textarea' : 'text'
}

function sanitizeKey(name: string, index: number): string {
  // Generate a safe field key from Chinese/English column name
  const cleaned = name.replace(/[^\w一-鿿]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase()
  if (cleaned.length > 0 && cleaned.length < 50) return cleaned
  return `field_${index}`
}

async function parseFileContent(file: { filename: string; data: Buffer }): Promise<{ headers: string[]; rows: any[][] }> {
  const XLSX = await import('xlsx')
  if (file.filename.endsWith('.csv')) {
    const text = file.data.toString('utf-8')
    const lines = text.split(/\r?\n/).filter(r => r.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    const parseCSVLine = (line: string) => {
      const result: string[] = []
      let current = '', inQuote = false
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { result.push(current.trim()); current = '' }
        else { current += ch }
      }
      result.push(current.trim())
      return result
    }
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
    const rows = lines.slice(1, 50).map(l => parseCSVLine(l))
    return { headers, rows }
  }

  const workbook = XLSX.read(file.data, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
  if (data.length === 0) return { headers: [], rows: [] }
  const headers = data[0].map((h: any) => String(h || '').trim())
  const rows = data.slice(1, 50)
  return { headers, rows }
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)
    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: '未选择文件' })

    // Parse multipart fields
    let file: any = null
    let action = 'preview'
    let templateName = ''
    let departmentId: number | null = null
    let isPublic = false
    let fieldOverrides: any[] = []

    for (const part of formData) {
      if ((part.name === 'file' || (!part.name && part.filename)) && part.filename) file = part
      else if (part.name === 'action' && part.data) action = part.data.toString()
      else if (part.name === 'templateName' && part.data) templateName = part.data.toString()
      else if (part.name === 'departmentId' && part.data) departmentId = parseInt(part.data.toString(), 10) || null
      else if (part.name === 'isPublic' && part.data) isPublic = part.data.toString() === 'true'
      else if (part.name === 'fieldOverrides' && part.data) {
        try { fieldOverrides = JSON.parse(part.data.toString()) } catch {}
      }
    }

    if (!file || !file.filename?.match(/\.(xlsx|xls|csv)$/i)) {
      throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls / .csv' })
    }

    // Permission
    if (!isSuperAdmin(currentUser)) {
      const depts = getVisibleDepartmentIds(currentUser) || []
      if (departmentId && !depts.includes(departmentId)) throw createError({ statusCode: 403, message: '无权在该部门创建' })
      if (!departmentId && depts.length > 0) departmentId = depts[0]
    }

    // Parse file
    const { headers, rows } = await parseFileContent(file)
    if (headers.length === 0) throw createError({ statusCode: 400, message: '文件中无数据' })

    const validHeaders = headers.map((name, i) => ({ name: name || `未命名列${i + 1}`, index: i })).filter(h => h.name)
    const overrideMap = new Map(fieldOverrides.map(f => [f.fieldKey, f]))

    // Detect fields
    const detectedFields: any[] = []
    for (const h of validHeaders) {
      const colValues = rows.map(r => r[h.index]).filter(v => v !== undefined)
      const fieldKey = sanitizeKey(h.name, detectedFields.length)
      const override = overrideMap.get(fieldKey)
      const fieldType = override?.fieldType || detectType(colValues, rows.length)
      const fieldLabel = override?.fieldLabel || h.name

      const field: any = {
        fieldKey, fieldLabel: h.name, suggestedLabel: fieldLabel, fieldType,
        suggestedType: detectType(colValues, rows.length),
        samples: colValues.filter(v => v && String(v).trim()).slice(0, 5).map(v => String(v).trim())
      }

      if (fieldType === 'select') {
        const uniq = [...new Set(colValues.filter(v => v && String(v).trim()))].sort().slice(0, 200)
        field.detectedOptions = uniq
      }

      detectedFields.push(field)
    }

    // Preview mode: just return detected fields
    if (action === 'preview') {
      return { success: true, mode: 'preview', data: { fileName: file.filename, fields: detectedFields, rowCount: rows.length } }
    }

    // Create mode: create template with overrides
    if (!templateName) templateName = file.filename.replace(/\.(xlsx|xls|csv)$/i, '')

    const createdConfigs: any[] = []
    const templateFields: any[] = []

    for (const df of detectedFields) {
      const finalType = overrideMap.get(df.fieldKey)?.fieldType || df.fieldType
      const finalLabel = overrideMap.get(df.fieldKey)?.fieldLabel || df.fieldLabel

      const tf: any = {
        fieldKey: df.fieldKey,
        fieldLabel: finalLabel,
        fieldType: finalType,
        sortOrder: templateFields.length + 1
      }

      if (finalType === 'select' && df.detectedOptions?.length > 0) {
        const configKey = `${templateName.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}_${df.fieldKey}`
        await prisma.fieldOptionConfig.upsert({
          where: { configKey },
          update: { options: JSON.stringify(df.detectedOptions), updatedAt: new Date() },
          create: { name: `${finalLabel}选项`, configKey, options: JSON.stringify(df.detectedOptions), departmentId, createdById: currentUser.id }
        })
        createdConfigs.push({ configKey, name: finalLabel, count: df.detectedOptions.length })
        tf.configType = configKey
        tf.options = JSON.stringify(df.detectedOptions)
      }

      templateFields.push(tf)
    }

    const template = await prisma.formTemplate.create({
      data: {
        name: templateName,
        description: `从 ${file.filename} 自动生成，${templateFields.length}字段`,
        departmentId, createdById: currentUser.id, isDefault: false, isPublic,
        fields: { create: templateFields }
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } }, department: true, createdBy: { select: { id: true, name: true } } }
    })

    return {
      success: true, mode: 'create',
      data: { template, createdConfigs, fieldCount: templateFields.length },
      message: `模板"${templateName}"创建成功: ${templateFields.length}个字段, ${createdConfigs.length}个下拉配置`
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '操作失败' })
  }
})

import dayjs from 'dayjs'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

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
    const rows = lines.slice(1).map(l => parseCSVLine(l))
    return { headers, rows }
  }

  const workbook = XLSX.read(file.data, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
  if (data.length === 0) return { headers: [], rows: [] }
  const headers = data[0].map((h: any) => String(h || '').trim())
  const rows = data.slice(1)
  return { headers, rows }
}

function parseDate(val: any, XLSX: any): Date | null {
  if (!val) return null
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d)
  }
  const str = String(val).replace(/\./g, '-').replace(/\//g, '-')
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)
    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: '未选择文件' })

    let file: any = null
    let templateId = 0
    let columnMapStr = ''

    for (const part of formData) {
      if ((part.name === 'file' || (!part.name && part.filename)) && part.filename) file = part
      else if (part.name === 'templateId' && part.data) templateId = parseInt(part.data.toString(), 10)
      else if (part.name === 'columnMap' && part.data) columnMapStr = part.data.toString()
    }

    if (!file) throw createError({ statusCode: 400, message: '未选择文件' })
    if (!templateId) throw createError({ statusCode: 400, message: '未选择模板' })

    // Load template fields
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } }
    })
    if (!template) throw createError({ statusCode: 404, message: '模板不存在' })

    // Parse file
    const { headers, rows } = await parseFileContent(file)
    if (rows.length === 0) throw createError({ statusCode: 400, message: '文件中无数据行' })

    // Build column mapping: file column → template field
    let columnMap: Record<string, string> = {}
    if (columnMapStr) {
      try { columnMap = JSON.parse(columnMapStr) } catch {}
    } else {
      // Auto-match by name similarity
      for (const fh of headers) {
        for (const tf of template.fields) {
          if (fh.includes(tf.fieldLabel) || tf.fieldLabel.includes(fh) ||
              fh.toLowerCase() === tf.fieldKey.toLowerCase()) {
            columnMap[fh] = tf.fieldKey
            break
          }
        }
      }
    }

    // Import xlsx for date parsing
    const XLSX = await import('xlsx')

    // Pre-load customers/models for name lookup
    const customers = await prisma.customer.findMany()
    const models = await prisma.productModel.findMany()
    const depts = await prisma.responsibleDepartment.findMany()

    function findRef(name: string, list: any[]): number | null {
      if (!name) return null
      const found = list.find(r => {
        if (!r.name) return false
        return r.name === name || r.name.includes(name) || (r.name.length >= 2 && name.includes(r.name.slice(0, 4)))
      })
      return found?.id || null
    }

    // Generate complaint numbers
    const year = new Date().getFullYear()
    const prefix = `CP-${year}-`
    const existingNos = await prisma.complaintRecord.findMany({
      where: { complaintNo: { startsWith: prefix } },
      select: { complaintNo: true }
    })
    let nextSeq = existingNos.reduce((max, r) => {
      const s = parseInt(r.complaintNo.slice(prefix.length), 10)
      return isNaN(s) ? max : Math.max(max, s)
    }, 0) + 1

    const DB_COLUMNS = new Set([
      'complaintNo', 'feedbackDate', 'customerId', 'productModelId', 'rollNo',
      'specification', 'feedbackContent', 'defectSource', 'specificDefect',
      'complaintCategory', 'shaftCount', 'quantityInvolved', 'productionTime',
      'productUsage', 'improvementAction', 'responsibleDeptId', 'closureStatus'
    ])

    let successCount = 0, errorCount = 0
    const importErrors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const recordData: Record<string, any> = {}
        const customData: Record<string, any> = {}

        for (const [fileHeader, fieldKey] of Object.entries(columnMap)) {
          const colIdx = headers.indexOf(fileHeader)
          if (colIdx < 0) continue
          const rawVal = row[colIdx]
          const field = template.fields.find(f => f.fieldKey === fieldKey)
          if (!field) continue

          // Determine storage target: DB column or templateData JSON
          const isDBColumn = DB_COLUMNS.has(fieldKey)

          switch (field.fieldType) {
            case 'date': {
              const d = parseDate(rawVal, XLSX) || new Date()
              if (isDBColumn) recordData[fieldKey] = d
              else customData[fieldKey] = dayjs(d).format('YYYY-MM-DD')
              break
            }
            case 'number': {
              const n = parseInt(String(rawVal)) || null
              if (isDBColumn) recordData[fieldKey] = n
              else customData[fieldKey] = n
              break
            }
            case 'switch': {
              const b = ['是', 'yes', 'true', '1'].includes(String(rawVal).toLowerCase())
              if (isDBColumn) recordData[fieldKey] = b
              else customData[fieldKey] = b
              break
            }
            case 'select-config':
            case 'auto-complete': {
              const cfg = field.configType
              if (cfg === 'customers') recordData.customerId = findRef(String(rawVal), customers)
              else if (cfg === 'productModels') recordData.productModelId = findRef(String(rawVal), models)
              else if (cfg === 'responsibleDepartments') recordData.responsibleDeptId = findRef(String(rawVal), depts)
              else if (isDBColumn) recordData[fieldKey] = String(rawVal)
              else customData[fieldKey] = String(rawVal)
              break
            }
            default:
              if (isDBColumn) recordData[fieldKey] = String(rawVal || '')
              else customData[fieldKey] = String(rawVal || '')
          }
        }

        if (!recordData.feedbackDate) recordData.feedbackDate = new Date()

        await prisma.complaintRecord.create({
          data: {
            complaintNo: `${prefix}${String(nextSeq++).padStart(4, '0')}`,
            feedbackDate: recordData.feedbackDate,
            customerId: recordData.customerId || null,
            productModelId: recordData.productModelId || null,
            rollNo: String(recordData.rollNo || ''),
            specification: String(recordData.specification || ''),
            feedbackContent: String(recordData.feedbackContent || ''),
            defectSource: String(recordData.defectSource || ''),
            specificDefect: String(recordData.specificDefect || ''),
            complaintCategory: String(recordData.complaintCategory || ''),
            shaftCount: recordData.shaftCount || null,
            quantityInvolved: recordData.quantityInvolved || null,
            productionTime: recordData.productionTime || null,
            productUsage: String(recordData.productUsage || ''),
            improvementAction: String(recordData.improvementAction || ''),
            responsibleDeptId: recordData.responsibleDeptId || null,
            closureStatus: 'pending',
            createdById: currentUser.id,
            updatedById: currentUser.id,
            templateIds: JSON.stringify([templateId]),
            templateData: Object.keys(customData).length > 0 ? JSON.stringify(customData) : null
          }
        })
        successCount++
      } catch (err: any) {
        errorCount++
        importErrors.push({ row: i + 2, message: err.message?.slice(0, 100) })
      }
    }

    await prisma.importLog.create({
      data: {
        fileName: file.filename, totalRows: rows.length, successCount, errorCount,
        errors: importErrors.length > 0 ? JSON.stringify(importErrors.slice(0, 50)) : null,
        importedById: currentUser.id
      }
    })

    return {
      success: true,
      data: { fileName: file.filename, templateName: template.name, total: rows.length, successCount, errorCount, errors: importErrors.slice(0, 20) },
      message: `导入完成: 成功${successCount}条, 失败${errorCount}条`
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '导入失败' })
  }
})

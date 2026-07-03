import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, canModifyDepartment } from '~/server/utils/auth'

dayjs.extend(customParseFormat)

// ─── DB column names on DataRecord ───
const DB_COLUMNS = new Set([
  'dataNo', 'feedbackDate', 'productionTime', 'customerId', 'productModelId', 'shaftCount',
  'thickness', 'rollNo', 'specification', 'quantityInvolved', 'application',
  'productionLineId', 'shiftTeam', 'machineNo', 'batchNo',
  'feedbackContent', 'category',
  'closureStatus',
  'responsibleDeptId', 'responsibleProcessId',
  'rootCauseAnalysis', 'correctiveAction', 'lessonsLearned', 'reviewConclusion',
  'productUsage', 'improvementAction', 'remark'
])

// FK columns → lookup table name for resolving names to IDs
const FK_COLUMNS: Record<string, 'customers' | 'product_models' | 'responsible_departments' | 'responsible_processes' | 'production_lines'> = {
  customerId: 'customers',
  productModelId: 'product_models',
  responsibleDeptId: 'responsible_departments',
  responsibleProcessId: 'responsible_processes',
  productionLineId: 'production_lines',
}

// Date formats to try parsing
const DATE_FORMATS = [
  'YYYY.M.D', 'YYYY.MM.DD', 'YYYY-MM-DD', 'YYYY/M/D', 'YYYY/MM/DD',
  'M/D/YY', 'M/D/YYYY', 'YYYY.MM', 'YYYY.M', 'YYYYMMDD', 'YYYYMM'
]

// ─── Date Parsing ───
function looksLikeDate(str: string): boolean {
  return /^[\d\s.\-/～~至到]+$/.test(str) && /\d/.test(str)
}

function parseDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('#'))) return null

  function excelSerialToDate(serial: number): Date {
    const excelEpoch = new Date(1899, 11, 30)
    return new Date(excelEpoch.getTime() + serial * 86400000)
  }

  if (typeof val === 'number') {
    if (val >= 40000 && val <= 60000) {
      return dayjs(excelSerialToDate(val)).format('YYYY-MM-DD')
    }
    return null
  }

  const str = String(val).trim()
  if (!str) return null

  const numVal = Number(str)
  if (!isNaN(numVal) && str.length >= 3 && /^\d+(\.\d+)?$/.test(str)) {
    if (numVal >= 40000 && numVal <= 60000) {
      return dayjs(excelSerialToDate(numVal)).format('YYYY-MM-DD')
    }
  }

  const firstLine = str.split(/[\n\r]+/)[0].trim()
  if (!firstLine || !looksLikeDate(firstLine)) return null

  const startDate = firstLine.split(/[~～至到]+/)[0].trim()
  if (!startDate) return null

  const parsed = dayjs(startDate, DATE_FORMATS, true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')

  return null
}

// ─── CSV Parsing ───
function parseCSVText(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
        i++
        continue
      } else if (char === '\r') {
        currentRow.push(currentField.trim())
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        if (text[i] === '\n') i++
        continue
      } else if (char === '\n') {
        currentRow.push(currentField.trim())
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    rows.push(currentRow)
  }

  return rows.filter(row => row.some(v => v !== ''))
}

// ─── File Parsing ───
async function parseFile(file: { filename: string; data: Buffer }): Promise<{ headers: string[]; rows: any[][] }> {
  const ext = file.filename.toLowerCase()
  if (ext.endsWith('.csv')) {
    const text = file.data.toString('utf-8')
    const allRows = parseCSVText(text)
    if (allRows.length < 2) return { headers: [], rows: [] }
    const headerRow = allRows[0]
    const headers = headerRow.map(h => h.replace(/^"|"$/g, '').trim()).filter(h => h !== '')
    const validIndices: number[] = []
    headerRow.forEach((h: string, i: number) => { if (h.trim() !== '') validIndices.push(i) })
    const rows = allRows.slice(1)
      .map(row => validIndices.map(i => {
        const v = row[i]
        if (typeof v === 'string' && v.startsWith('=')) return ''
        return v ?? ''
      }))
      .filter(row => row.some(v => v !== '' && v !== null && v !== undefined))
    return { headers, rows }
  }

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(file.data, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][]
  if (data.length < 2) return { headers: [], rows: [] }
  const headers = data[0].map((h: any) => String(h || '').trim()).filter((h: string) => h !== '')
  const fullHeaders = data[0].map((h: any) => String(h || '').trim())
  const validIndices: number[] = []
  fullHeaders.forEach((h: string, i: number) => { if (h !== '') validIndices.push(i) })
  const rows = data.slice(1)
    .map(row => validIndices.map(i => {
      const v = row[i]
      if (typeof v === 'string' && v.startsWith('=')) return ''
      return v ?? ''
    }))
    .filter(row => row.some(v => v !== '' && v !== null && v !== undefined))
  return { headers, rows }
}

// ─── Main Handler ───
export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)
    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: '未选择文件' })

    let file: any = null
    let templateId = 0

    for (const part of formData) {
      if ((part.name === 'file' || (!part.name && part.filename)) && part.filename) file = part
      else if (part.name === 'templateId' && part.data) templateId = parseInt(part.data.toString(), 10)
    }

    if (!file) throw createError({ statusCode: 400, message: '未选择文件' })
    if (!templateId) throw createError({ statusCode: 400, message: '未选择模板' })

    const ext = file.filename?.toLowerCase() || ''
    if (!ext.match(/\.(xlsx|xls|csv)$/)) {
      throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls / .csv 格式' })
    }

    // Load template with field definitions
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } }
    })
    if (!template) throw createError({ statusCode: 404, message: '模板不存在' })
    if (!template.enabled) throw createError({ statusCode: 400, message: '模板已停用' })

    // Check template access: non-superadmin users can only import to templates they can access
    if (template.departmentId && !template.isPublic && !canModifyDepartment(currentUser, template.departmentId)) {
      throw createError({ statusCode: 403, message: '无权使用该模板导入数据' })
    }

    // Build header → fieldKey mapping from template field definitions
    // Match by fieldLabel (what the user sees / what matches file headers)
    const headerToFieldKey = new Map<string, { fieldKey: string; fieldType: string }>()
    for (const f of template.fields) {
      headerToFieldKey.set(f.fieldLabel.trim(), { fieldKey: f.fieldKey, fieldType: f.fieldType })
      if (f.fieldKey !== f.fieldLabel) {
        headerToFieldKey.set(f.fieldKey.trim(), { fieldKey: f.fieldKey, fieldType: f.fieldType })
      }
    }

    // Parse file
    const { headers: fileHeaders, rows } = await parseFile(file)
    if (fileHeaders.length === 0 || rows.length === 0) {
      throw createError({ statusCode: 400, message: '文件中没有数据行' })
    }

    // Pre-load lookup data for FK resolution
    const [customers, models, depts, processes, productionLines] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true } }),
      prisma.productModel.findMany({ select: { id: true, name: true } }),
      prisma.responsibleDepartment.findMany({ select: { id: true, name: true } }),
      prisma.responsibleProcess.findMany({ select: { id: true, name: true } }),
      prisma.productionLine.findMany({ select: { id: true, name: true } })
    ])

    const fkLookupMap: Record<string, Array<{ id: number; name: string }>> = {
      customers,
      product_models: models,
      responsible_departments: depts,
      responsible_processes: processes,
      production_lines: productionLines,
    }

    function findByName(list: Array<{ id: number; name: string }>, name: string): number | null {
      if (!name) return null
      const trimmed = String(name).trim()
      const exact = list.find(item => item.name === trimmed)
      if (exact) return exact.id
      const matches = list.filter(item => item.name.includes(trimmed) || trimmed.includes(item.name))
      if (matches.length === 1) return matches[0].id
      return null
    }

    // Generate data numbers
    const year = new Date().getFullYear()
    const prefix = `DR-${year}-`
    const existingNos = await prisma.dataRecord.findMany({
      where: { dataNo: { startsWith: prefix } },
      select: { dataNo: true }
    })
    let nextSeq = existingNos.reduce((max, r) => {
      const s = parseInt(r.dataNo.slice(prefix.length), 10)
      return isNaN(s) ? max : Math.max(max, s)
    }, 0) + 1

    let successCount = 0
    let errorCount = 0
    const importErrors: Array<{ row: number; message: string }> = []

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]
      const rowNum = rowIdx + 2

      try {
        const templateData: Record<string, any> = {}
        const recordData: Record<string, any> = {
          dataNo: `${prefix}${String(nextSeq++).padStart(4, '0')}`,
          feedbackDate: new Date(),
          closureStatus: 'pending',
          createdById: currentUser.id,
          updatedById: currentUser.id,
          templateIds: JSON.stringify([templateId])
        }

        for (let c = 0; c < Math.min(fileHeaders.length, row.length); c++) {
          const header = fileHeaders[c].trim()
          if (!header) continue
          const rawValue = row[c]
          if (rawValue === '' || rawValue === null || rawValue === undefined) continue

          // Match header to template field by fieldLabel
          const tplMatch = headerToFieldKey.get(header)
          const fieldKey = tplMatch?.fieldKey || header
          const fieldType = tplMatch?.fieldType

          // Process value based on template field type
          let processedValue: any = rawValue
          if (fieldType === 'date') {
            processedValue = parseDate(rawValue)
          } else if (fieldType === 'number') {
            const firstLine = String(rawValue).trim().split(/[\n\r]+/)[0].trim()
            const n = Number(firstLine)
            processedValue = isNaN(n) ? null : n
          } else {
            processedValue = String(rawValue).trim()
            if (processedValue.startsWith('=')) processedValue = null
          }

          if (processedValue === null || processedValue === undefined) continue

          // 1. Store in templateData using fieldKey
          templateData[fieldKey] = processedValue

          // 2. If fieldKey is a DB column, also write to DB column
          if (DB_COLUMNS.has(fieldKey)) {
            if (FK_COLUMNS[fieldKey]) {
              // FK field: resolve name → ID
              const tableName = FK_COLUMNS[fieldKey]
              const lookupList = fkLookupMap[tableName]
              if (lookupList) {
                const fkId = findByName(lookupList, String(rawValue).trim())
                if (fkId !== null) {
                  recordData[fieldKey] = fkId
                }
              }
            } else if (fieldKey === 'feedbackDate' || fieldKey === 'productionTime') {
              const parsed = parseDate(rawValue)
              if (parsed) {
                recordData[fieldKey] = new Date(parsed)
              }
            } else if (fieldKey === 'quantityInvolved' || fieldKey === 'shaftCount') {
              const firstLine = String(rawValue).trim().split(/[\n\r]+/)[0].trim()
              const n = parseInt(firstLine, 10)
              if (!isNaN(n)) {
                recordData[fieldKey] = n
              }
            } else {
              recordData[fieldKey] = String(rawValue).trim()
            }
          }
        }

        // Ensure required feedbackDate
        if (!recordData.feedbackDate || !(recordData.feedbackDate instanceof Date)) {
          recordData.feedbackDate = new Date()
        }

        if (recordData.productionTime && typeof recordData.productionTime === 'string') {
          recordData.productionTime = new Date(recordData.productionTime)
        }

        // 校验导入部门权限（仅本部门管理员可导入）
        if (recordData.responsibleDeptId && !canModifyDepartment(currentUser, recordData.responsibleDeptId)) {
          throw new Error(`无权导入到责任部门 ID ${recordData.responsibleDeptId}`)
        }

        if (Object.keys(templateData).length > 0) {
          recordData.templateData = JSON.stringify(templateData)
        }

        await prisma.dataRecord.create({ data: recordData as any })
        successCount++
      } catch (err: any) {
        errorCount++
        importErrors.push({ row: rowNum, message: err.message || String(err) })
      }
    }

    // Log import
    await prisma.importLog.create({
      data: {
        fileName: file.filename,
        totalRows: rows.length,
        successCount,
        errorCount,
        errors: importErrors.length > 0 ? JSON.stringify(importErrors.slice(0, 50)) : null,
        importedById: currentUser.id
      }
    })

    return {
      success: true,
      data: {
        fileName: file.filename,
        templateName: template.name,
        total: rows.length,
        successCount,
        errorCount,
        errors: importErrors.slice(0, 20),
        headers: fileHeaders
      },
      message: errorCount === 0
        ? `全部导入成功: ${successCount}条`
        : `导入完成: 成功${successCount}条, 失败${errorCount}条`
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '导入失败' })
  }
})

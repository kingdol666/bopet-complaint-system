import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission, canAccessDepartment } from '~/server/utils/auth'

dayjs.extend(customParseFormat)

// Map of common Chinese/English headers to DataRecord column names
const STANDARD_FIELD_MAP: Record<string, string> = {
  '反馈日期': 'feedbackDate',
  '生产日期': 'productionTime',
  '反馈轴生产日期': 'productionTime',
  '客户': 'customerId',
  '客户名称': 'customerId',
  '型号': 'productModelId',
  '产品型号': 'productModelId',
  '责任部门': 'responsibleDeptId',
  '部门': 'responsibleDeptId',
  '责任工序': 'responsibleProcessId',
  '工序': 'responsibleProcessId',
  '轴号': 'rollNo',
  '规格': 'specification',
  '反馈内容': 'feedbackContent',
  '问题描述': 'feedbackContent',
  '数据分类': 'category',
  '分类': 'category',
  '数量': 'quantityInvolved',
  '数量(轴)': 'quantityInvolved',
  '涉及数量': 'quantityInvolved',
  '产品用途': 'productUsage',
  '用途': 'productUsage',
  '改善措施': 'improvementAction',
  '纠正措施': 'correctiveAction',
  '原因分析': 'rootCauseAnalysis',
  '经验总结': 'lessonsLearned',
  '复盘结论': 'reviewConclusion',
  '备注': 'remark',
  '产线': 'productionLineId',
  '生产线': 'productionLineId',
  '班组': 'shiftTeam',
  '机台': 'machineNo',
  '批次号': 'batchNo',
  '厚度': 'thickness',
  '轴数': 'shaftCount'
}

// Date field keys
const DATE_FIELDS = new Set([
  'feedbackDate', 'productionTime'
])

// Numeric field keys
const NUMBER_FIELDS = new Set([
  'quantityInvolved', 'shaftCount', 'customerId', 'productModelId',
  'responsibleDeptId', 'responsibleProcessId', 'productionLineId'
])

// All date formats to try parsing
const DATE_FORMATS = [
  'YYYY.M.D', 'YYYY.MM.DD', 'YYYY-MM-DD', 'YYYY/MM/DD',
  'M/D/YY', 'M/D/YYYY', 'YYYY.MM', 'YYYY.M', 'YYYYMMDD', 'YYYYMM'
]

// ---- Date Parsing ----
function parseDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null

  // Handle Excel formula strings
  if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('#'))) return null

  // Helper: convert Excel serial to Date
  function excelSerialToDate(serial: number): Date {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + serial * 86400000)
    return isNaN(d.getTime()) ? new Date(0) : d
  }

  // Case 1: Actual number (from programmatic calls or Excel raw values)
  if (typeof val === 'number') {
    // Excel serial date (40000-60000 range)
    if (val >= 40000 && val <= 60000) {
      const d = excelSerialToDate(val)
      return dayjs(d).format('YYYY-MM-DD')
    }
    return null
  }

  // Case 2: String value (from CSV import)
  const str = String(val).trim()
  if (!str) return null

  // Check if string is a numeric Excel serial date (from CSV: number → string)
  const numVal = Number(str)
  if (!isNaN(numVal) && str.length >= 3 && /^\d+(\.\d+)?$/.test(str)) {
    if (numVal >= 40000 && numVal <= 60000) {
      const d = excelSerialToDate(numVal)
      return dayjs(d).format('YYYY-MM-DD')
    }
  }

  // Take first line for multi-line values
  const firstLine = str.split(/[\n\r]+/)[0].trim()
  if (!firstLine) return null

  // Only parse as date if the string looks like a date (avoids parsing "型号E-500" etc.)
  if (!looksLikeDate(firstLine)) return null

  // Handle date ranges: take the start date（注意：- / . 是日期分隔符，不能作为范围分隔符）
  const startDate = firstLine.split(/[~～至到]+/)[0].trim()
  if (!startDate) return null

  // Try dayjs with all known formats (strict mode)
  const parsed = dayjs(startDate, DATE_FORMATS, true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')

  return null
}

// Heuristic: string looks like a date (contains digits and date separators only)
function looksLikeDate(str: string): boolean {
  // Allow digits, separators, spaces, and range connectors
  return /^[\d\s.\-/～~至到]+$/.test(str) && /\d/.test(str)
}

// ---- CSV Parsing ----
function parseCSVLine(line: string): string[] {
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

// ---- File Parsing ----
async function parseFile(file: { filename: string; data: Buffer }): Promise<{ headers: string[]; rows: any[][] }> {
  const ext = file.filename.toLowerCase()
  if (ext.endsWith('.csv')) {
    const text = file.data.toString('utf-8')
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
    const lines = cleanText.split(/\r?\n/).filter((r: string) => r.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim()).filter(h => h !== '')
    const rows = lines.slice(1)
      .map((l: string) => parseCSVLine(l))
      .filter((row: string[]) => row.some((v: string) => v !== '' && v !== null && v !== undefined))
    return { headers, rows }
  }

  // Excel
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

// ---- Value Processing ----
function processFieldValue(fieldKey: string, rawValue: any): any {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null

  const str = String(rawValue).trim()
  if (!str || str.startsWith('=')) return null

  if (DATE_FIELDS.has(fieldKey)) {
    return parseDate(rawValue)
  }

  if (NUMBER_FIELDS.has(fieldKey)) {
    const n = Number(str)
    return isNaN(n) ? null : n
  }

  return str
}

// ---- Main Handler ----
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

    // Validate file extension
    const ext = file.filename?.toLowerCase() || ''
    if (!ext.match(/\.(xlsx|xls|csv)$/)) {
      throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls / .csv 格式' })
    }

    // Load template
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId }
    })
    if (!template) throw createError({ statusCode: 404, message: '模板不存在' })

    // Parse file
    const { headers: fileHeaders, rows } = await parseFile(file)
    if (fileHeaders.length === 0 || rows.length === 0) {
      throw createError({ statusCode: 400, message: '文件中没有数据行' })
    }

    // Pre-load lookup data
    const [customers, models, depts, processes, productionLines] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true } }),
      prisma.productModel.findMany({ select: { id: true, name: true } }),
      prisma.responsibleDepartment.findMany({ select: { id: true, name: true } }),
      prisma.responsibleProcess.findMany({ select: { id: true, name: true } }),
      prisma.productionLine.findMany({ select: { id: true, name: true } })
    ])

    function findByName<T extends { id: number; name: string }>(list: T[], name: string): number | null {
      if (!name) return null
      const trimmed = String(name).trim()
      // 优先精确匹配
      const exact = list.find(item => item.name === trimmed)
      if (exact) return exact.id
      // 模糊匹配：当且仅当命中唯一结果时才采用，避免互相包含导致误判
      const matches = list.filter(item =>
        item.name.includes(trimmed) || trimmed.includes(item.name)
      )
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
      const rowNum = rowIdx + 2 // Excel row number (1-based + header)

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

          const fieldKey = STANDARD_FIELD_MAP[header]

          if (fieldKey) {
            // Standard field: map to DataRecord column
            if (fieldKey === 'customerId') {
              recordData.customerId = findByName(customers, String(rawValue).trim())
            } else if (fieldKey === 'productModelId') {
              recordData.productModelId = findByName(models, String(rawValue).trim())
            } else if (fieldKey === 'responsibleDeptId') {
              recordData.responsibleDeptId = findByName(depts, String(rawValue).trim())
            } else if (fieldKey === 'responsibleProcessId') {
              recordData.responsibleProcessId = findByName(processes, String(rawValue).trim())
            } else if (fieldKey === 'productionLineId') {
              recordData.productionLineId = findByName(productionLines, String(rawValue).trim())
            } else {
              recordData[fieldKey] = processFieldValue(fieldKey, rawValue)
            }
          } else {
            // Custom field: store in templateData
            const processedValue = processFieldValue(header, rawValue)
            if (processedValue !== null && processedValue !== undefined) {
              templateData[header] = processedValue
            }
          }
        }

        // Ensure required feedbackDate
        if (!recordData.feedbackDate) {
          recordData.feedbackDate = new Date()
        } else {
          recordData.feedbackDate = new Date(recordData.feedbackDate)
        }

        if (recordData.productionTime) {
          recordData.productionTime = new Date(recordData.productionTime)
        }

        // 校验导入部门权限
        if (recordData.responsibleDeptId && !canAccessDepartment(currentUser, recordData.responsibleDeptId)) {
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

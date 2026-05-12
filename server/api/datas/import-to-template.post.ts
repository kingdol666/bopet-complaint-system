import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

dayjs.extend(customParseFormat)

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

  // Case 1: Actual number (from programmatic calls)
  if (typeof val === 'number') {
    // Excel serial date (40000-60000 range)
    if (val >= 40000 && val <= 60000) {
      const d = excelSerialToDate(val)
      return dayjs(d).format('YYYY-MM-DD')
    }
    // YYYY.MM decimal like 2025.12 → December 2025
    if (val >= 2000 && val < 2100) {
      const year = Math.floor(val)
      const monthDecimal = Math.round((val - year) * 100)
      if (monthDecimal >= 1 && monthDecimal <= 12) {
        return dayjs(new Date(year, monthDecimal - 1, 1)).format('YYYY-MM-DD')
      }
    }
    // Integer year
    if (Number.isInteger(val) && val >= 2000 && val <= 2100) {
      return dayjs(new Date(val, 0, 1)).format('YYYY-MM-DD')
    }
    return null
  }

  // Case 2: String value (from CSV import)
  const str = String(val).trim()
  if (!str) return null

  // Check if string is a numeric Excel serial date (from CSV: number → string)
  const numVal = Number(str)
  if (!isNaN(numVal) && str.length >= 3) {
    if (numVal >= 40000 && numVal <= 60000) {
      const d = excelSerialToDate(numVal)
      return dayjs(d).format('YYYY-MM-DD')
    }
  }

  // Take first line for multi-line values
  const firstLine = str.split(/[\n\r]+/)[0].trim()
  if (!firstLine) return null

  // Handle date ranges: take the start date
  const startDate = firstLine.split(/[-~～至到]+/)[0].trim()
  if (!startDate) return null

  // Try dayjs with all known formats (strict mode)
  const parsed = dayjs(startDate, DATE_FORMATS, true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')

  // Try default dayjs parsing as fallback
  const fallback = dayjs(startDate)
  if (fallback.isValid() && fallback.year() > 2000) return fallback.format('YYYY-MM-DD')

  return null
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

// ---- Value Processing ----
function processValue(rawValue: any): any {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null

  const str = String(rawValue).trim()
  if (!str || str.startsWith('=')) return null

  // Try to parse as date
  const dateStr = parseDate(rawValue)
  if (dateStr) return dateStr

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
    const text = file.data.toString('utf-8')
    // Strip BOM if present
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
    const lines = cleanText.split(/\r?\n/).filter((r: string) => r.trim())
    if (lines.length < 2) throw createError({ statusCode: 400, message: '文件中没有数据行' })

    const fileHeaders = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim()).filter(h => h !== '')
    const rows = lines.slice(1)
      .map((l: string) => parseCSVLine(l))
      .filter((row: string[]) => row.some((v: string) => v !== '' && v !== null && v !== undefined))

    if (rows.length === 0) throw createError({ statusCode: 400, message: '文件中没有数据行' })

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

    let successCount = 0, errorCount = 0
    const importErrors: Array<{ row: number; message: string }> = []

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]
      const rowNum = rowIdx + 2 // Excel row number (1-based + header)

      try {
        // Build data object using original headers as keys
        const templateData: Record<string, any> = {}

        for (let c = 0; c < Math.min(fileHeaders.length, row.length); c++) {
          const header = fileHeaders[c].trim()
          if (!header) continue
          const rawValue = row[c]
          if (rawValue === '' || rawValue === null || rawValue === undefined) continue

          // Process value: try date parsing first, otherwise keep as string
          const processedValue = processValue(rawValue)
          if (processedValue !== null && processedValue !== undefined) {
            templateData[header] = processedValue
          }
        }

        // Create data record with all data in templateData (JSON)
        const createData: any = {
          dataNo: `${prefix}${String(nextSeq++).padStart(4, '0')}`,
          feedbackDate: new Date(),
          closureStatus: 'pending',
          createdById: currentUser.id,
          updatedById: currentUser.id,
          templateIds: JSON.stringify([templateId]),
          templateData: JSON.stringify(templateData)
        }

        await prisma.dataRecord.create({ data: createData })
        successCount++
      } catch (err: any) {
        errorCount++
        // Build detailed error message
        const errorDetail = err.message || String(err)
        importErrors.push({ row: rowNum, message: errorDetail })
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

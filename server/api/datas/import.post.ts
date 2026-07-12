import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, canCreateForDepartment } from '~/server/utils/auth'

// Proper CSV parser that handles multiline quoted values and escaped quotes
function parseCSVText(text: string): string[][] {
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

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: '未选择文件' })
    }

    const file = formData[0]
    if (!file.filename || !file.filename.match(/\.(xlsx|xls|csv)$/i)) {
      throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls / .csv 格式的文件' })
    }

    const isCSV = file.filename.endsWith('.csv')
    let jsonData: Record<string, any>[]

    if (isCSV) {
      const text = file.data.toString('utf-8')
      const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
      const allRows = parseCSVText(cleanText)
      if (allRows.length < 2) {
        throw createError({ statusCode: 400, message: 'CSV文件中没有数据' })
      }
      const headers = allRows[0].map(h => h.replace(/^"|"$/g, ''))
      jsonData = allRows.slice(1).map(row => {
        const obj: Record<string, any> = {}
        headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
        return obj
      })
    } else {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(file.data, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]
    }

    if (jsonData.length === 0) {
      throw createError({ statusCode: 400, message: '文件中没有数据' })
    }

    const originalHeaders = Object.keys(jsonData[0])

    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    // Generate data numbers
    const year = new Date().getFullYear()
    const prefix = `DR-${year}-`
    const existingRecords = await prisma.dataRecord.findMany({
      where: { dataNo: { startsWith: prefix } },
      select: { dataNo: true }
    })
    let nextSeq = existingRecords.reduce((max, r) => {
      const seq = parseInt(r.dataNo.slice(prefix.length), 10)
      return isNaN(seq) ? max : Math.max(max, seq)
    }, 0) + 1

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i]
        const dataNo = `${prefix}${String(nextSeq++).padStart(4, '0')}`

        // Store all data in templateData using original headers
        const templateData: Record<string, any> = {}
        for (const [key, val] of Object.entries(row)) {
          if (val !== '' && val !== null && val !== undefined) {
            const str = String(val).trim()
            if (str && !str.startsWith('=')) {
              templateData[key] = str
            }
          }
        }

        await prisma.dataRecord.create({
          data: {
            dataNo,
            feedbackDate: new Date(),
            responsibleDeptId: currentUser.departmentIds?.[0] ?? null,
            isPublic: true,
            createdById: currentUser.id,
            updatedById: currentUser.id,
            templateData: JSON.stringify({
              headers: originalHeaders,
              ...templateData
            })
          }
        })
        successCount++
      } catch (err: any) {
        errorCount++
        errors.push({ row: i + 2, message: err.message })
      }
    }

    // Log import
    await prisma.importLog.create({
      data: {
        fileName: file.filename,
        totalRows: jsonData.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
        importedById: currentUser.id
      }
    })

    return {
      success: true,
      data: { fileName: file.filename, total: jsonData.length, successCount, errorCount, errors: errors.slice(0, 20) },
      message: `导入完成：成功${successCount}条，失败${errorCount}条`
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '导入失败' })
  }
})

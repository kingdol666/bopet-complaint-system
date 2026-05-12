import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)

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
      // Parse CSV
      const text = file.data.toString('utf-8')
      const lines = text.split(/\r?\n/).filter(r => r.trim())
      if (lines.length < 2) {
        throw createError({ statusCode: 400, message: 'CSV文件中没有数据' })
      }
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
      jsonData = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const row: Record<string, any> = {}
        headers.forEach((h, i) => { row[h] = values[i] ?? '' })
        return row
      })
    } else {
      // Parse Excel
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(file.data, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]
    }

    if (jsonData.length === 0) {
      throw createError({ statusCode: 400, message: '文件中没有数据' })
    }

    // Get original headers from first row
    const originalHeaders = Object.keys(jsonData[0])

    // Pre-load lookup data
    const [customers, models, depts] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true } }),
      prisma.productModel.findMany({ select: { id: true, name: true } }),
      prisma.responsibleDepartment.findMany({ select: { id: true, name: true } })
    ])

    function findCustomer(name: string): number | null {
      if (!name) return null
      const found = customers.find(c => c.name === name || c.name.includes(name) || name.includes(c.name))
      return found?.id || null
    }

    function findModel(name: string): number | null {
      if (!name) return null
      const found = models.find(m => m.name === name || m.name.includes(name) || name.includes(m.name))
      return found?.id || null
    }

    function findDept(name: string): number | null {
      if (!name) return null
      const found = depts.find(d => d.name === name || d.name.includes(name) || name.includes(d.name))
      return found?.id || null
    }

    function parseDate(val: any): Date | null {
      if (!val) return null
      // Handle Excel serial date number (days since 1900-01-01, with the 1900 leap year bug)
      if (typeof val === 'number' && val > 40000 && val < 60000) {
        const excelEpoch = new Date(1899, 11, 30)
        const d = new Date(excelEpoch.getTime() + val * 86400000)
        return isNaN(d.getTime()) ? null : d
      }
      const str = String(val).replace(/\./g, '-').replace(/\//g, '-')
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d
    }

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
        const feedbackDate = parseDate(row['反馈日期']) || new Date()
        const customerId = findCustomer(row['客户'])

        const dataNo = `${prefix}${String(nextSeq++).padStart(4, '0')}`

        await prisma.dataRecord.create({
          data: {
            dataNo,
            feedbackDate,
            customerId,
            productModelId: findModel(row['型号']),
            responsibleDeptId: findDept(row['责任部门']),
            rollNo: String(row['轴号'] || ''),
            specification: String(row['规格'] || ''),
            feedbackContent: String(row['反馈内容'] || ''),
            category: String(row['数据分类'] || ''),
            quantityInvolved: parseInt(row['数量']) || null,
            productionTime: parseDate(row['反馈轴生产日期']),
            productUsage: String(row['产品用途'] || ''),
            improvementAction: String(row['改善措施'] || ''),
            createdById: currentUser.id,
            updatedById: currentUser.id,
            templateData: JSON.stringify({
              headers: originalHeaders,
              rawData: row
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

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
    if (!file.filename || !file.filename.match(/\.(xlsx|xls)$/i)) {
      throw createError({ statusCode: 400, message: '仅支持 .xlsx / .xls 格式的Excel文件' })
    }

    // Parse Excel
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(file.data, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]

    if (jsonData.length === 0) {
      throw createError({ statusCode: 400, message: 'Excel文件中没有数据' })
    }

    // Column mapping (Excel Chinese headers -> DB fields)
    const columnMap: Record<string, string> = {
      '反馈日期': 'feedbackDate',
      '客户': 'customerName',
      '责任部门': 'deptName',
      '型号': 'modelName',
      '轴号': 'rollNo',
      '规格': 'specification',
      '反馈内容': 'feedbackContent',
      '弊病源': 'defectSource',
      '图片信息': 'imageInfo',
      '数量': 'quantityInvolved',
      '反馈轴生产日期': 'productionTime',
      '具体不良点': 'specificDefect',
      '数据分类': 'complaintCategory',
      '技术类': 'technicalType',
      '可插入8D报告': 'report8d',
      '产品用途': 'productUsage',
      '改善措施': 'improvementAction'
    }

    // Map columns from header row
    const firstRow = jsonData[0]
    const fieldMapping: Record<string, string> = {}
    for (const [key, value] of Object.entries(columnMap)) {
      // Try exact match first, then contains
      const colKey = Object.keys(firstRow).find(k =>
        k === key || k.includes(key) || key.includes(k)
      )
      if (colKey) {
        fieldMapping[colKey] = value
      }
    }

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
      // Handle Excel serial date number
      if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val)
        if (date) return new Date(date.y, date.m - 1, date.d)
        return null
      }
      const str = String(val).replace(/\./g, '-')
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d
    }

    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    // Generate complaint numbers
    const year = new Date().getFullYear()
    const prefix = `CP-${year}-`
    const existingRecords = await prisma.complaintRecord.findMany({
      where: { complaintNo: { startsWith: prefix } },
      select: { complaintNo: true }
    })
    let nextSeq = existingRecords.reduce((max, r) => {
      const seq = parseInt(r.complaintNo.slice(prefix.length), 10)
      return isNaN(seq) ? max : Math.max(max, seq)
    }, 0) + 1

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i]
        const mapped: Record<string, any> = {}
        for (const [colKey, field] of Object.entries(fieldMapping)) {
          mapped[field] = row[colKey]
        }

        const feedbackDate = parseDate(mapped.feedbackDate) || new Date()
        const customerId = findCustomer(mapped.customerName)

        const complaintNo = `${prefix}${String(nextSeq++).padStart(4, '0')}`

        await prisma.complaintRecord.create({
          data: {
            complaintNo,
            feedbackDate,
            customerId,
            productModelId: findModel(mapped.modelName),
            responsibleDeptId: findDept(mapped.deptName),
            rollNo: String(mapped.rollNo || ''),
            specification: String(mapped.specification || ''),
            feedbackContent: String(mapped.feedbackContent || ''),
            defectSource: String(mapped.defectSource || ''),
            specificDefect: String(mapped.specificDefect || ''),
            complaintCategory: String(mapped.complaintCategory || ''),
            quantityInvolved: parseInt(mapped.quantityInvolved) || null,
            productionTime: parseDate(mapped.productionTime),
            productUsage: String(mapped.productUsage || ''),
            improvementAction: String(mapped.improvementAction || ''),
            createdById: currentUser.id,
            updatedById: currentUser.id
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

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

    for (const part of formData) {
      if ((part.name === 'file' || (!part.name && part.filename)) && part.filename) file = part
      else if (part.name === 'templateId' && part.data) templateId = parseInt(part.data.toString(), 10)
    }

    if (!file) throw createError({ statusCode: 400, message: '未选择文件' })
    if (!templateId) throw createError({ statusCode: 400, message: '未选择模板' })

    // Load template
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId }
    })
    if (!template) throw createError({ statusCode: 404, message: '模板不存在' })

    // Parse file
    const XLSX = await import('xlsx')
    const { headers, rows } = await parseFileContent(file)
    if (rows.length === 0) throw createError({ statusCode: 400, message: '文件中无数据行' })

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
    const importErrors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const rowData: Record<string, any> = {}
        
        // Use original headers directly, no column mapping
        for (let j = 0; j < headers.length; j++) {
          rowData[headers[j]] = row[j] ?? ''
        }

        // Extract common fields by header name matching
        const feedbackDate = parseDate(rowData['反馈日期'] || rowData['日期'] || rowData['时间'], XLSX) || new Date()
        const customerId = findRef(rowData['客户'] || rowData['客户名称'], customers)
        const productModelId = findRef(rowData['型号'] || rowData['产品型号'], models)
        const responsibleDeptId = findRef(rowData['责任部门'] || rowData['部门'], depts)

        await prisma.dataRecord.create({
          data: {
            dataNo: `${prefix}${String(nextSeq++).padStart(4, '0')}`,
            feedbackDate,
            customerId,
            productModelId,
            rollNo: String(rowData['轴号'] || ''),
            specification: String(rowData['规格'] || ''),
            feedbackContent: String(rowData['反馈内容'] || rowData['问题描述'] || ''),
            category: String(rowData['数据分类'] || rowData['问题分类'] || ''),
            quantityInvolved: parseInt(rowData['数量']) || null,
            productionTime: parseDate(rowData['反馈轴生产日期'] || rowData['生产日期'], XLSX),
            productUsage: String(rowData['产品用途'] || ''),
            improvementAction: String(rowData['改善措施'] || rowData['纠正措施'] || ''),
            responsibleDeptId,
            closureStatus: 'pending',
            createdById: currentUser.id,
            updatedById: currentUser.id,
            templateIds: JSON.stringify([templateId]),
            // Store all original data with headers
            templateData: JSON.stringify({
              headers,
              rawData: rowData
            })
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

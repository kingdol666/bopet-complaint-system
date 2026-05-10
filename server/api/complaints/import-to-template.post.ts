import dayjs from 'dayjs'
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        current += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += ch
        i++
      }
    }
  }
  result.push(current.trim())
  return result
}

async function parseFileContent(file: { filename: string; data: Buffer }): Promise<{ headers: string[]; rows: any[][] }> {
  const XLSX = await import('xlsx')
  if (file.filename.endsWith('.csv')) {
    const text = file.data.toString('utf-8')
    const lines = text.split(/\r?\n/).filter(r => r.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(l => parseCSVLine(l))
    return { headers, rows }
  }

  const workbook = XLSX.read(file.data, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]
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

    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } }
    })
    if (!template) throw createError({ statusCode: 404, message: '模板不存在' })

    const { headers, rows } = await parseFileContent(file)
    if (rows.length === 0) throw createError({ statusCode: 400, message: '文件中无数据行' })

    let columnMap: Record<string, string> = {}
    if (columnMapStr) {
      try { columnMap = JSON.parse(columnMapStr) } catch {}
    } else {
      for (const fh of headers) {
        for (const tf of template.fields) {
          if (fh.includes(tf.fieldLabel) || tf.fieldLabel.includes(fh) ||
              fh.toLowerCase() === tf.fieldKey.toLowerCase()) {
            columnMap[tf.fieldKey] = fh
            break
          }
        }
      }
    }

    console.log('=== 导入调试信息 ===')
    console.log('文件表头:', headers)
    console.log('模板字段:', template.fields.map(f => ({ key: f.fieldKey, label: f.fieldLabel, type: f.fieldType })))
    console.log('列映射:', columnMap)
    console.log('第一行数据:', rows[0])

    const XLSX = await import('xlsx')

    const customers = await prisma.customer.findMany()
    const models = await prisma.productModel.findMany()
    const depts = await prisma.responsibleDepartment.findMany()
    const categories = await prisma.problemCategory.findMany()
    const subcategories = await prisma.problemSubcategory.findMany()
    const demands = await prisma.customerDemand.findMany()
    const compTypes = await prisma.compensationType.findMany()
    const severityLevels = await prisma.severityLevel.findMany()
    const lines = await prisma.productionLine.findMany()
    const processes = await prisma.responsibleProcess.findMany()

    function findRef(name: string, list: any[]): number | null {
      if (!name) return null
      const found = list.find(r => {
        if (!r.name) return false
        return r.name === name || r.name.includes(name) || name.includes(r.name)
      })
      return found?.id || null
    }

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

    let successCount = 0, errorCount = 0
    const importErrors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const recordData: Record<string, any> = {}
        const customData: Record<string, any> = {}

        if (i === 0) {
          console.log('=== 处理第一行 ===')
          console.log('行数据:', row)
        }

        for (const [fieldKey, fileHeader] of Object.entries(columnMap)) {
          if (!fileHeader) continue
          const colIdx = headers.indexOf(fileHeader)
          if (colIdx < 0) continue
          const rawVal = row[colIdx]
          if (rawVal === null || rawVal === undefined) continue

          const field = template.fields.find(f => f.fieldKey === fieldKey)
          if (!field) continue

          if (i === 0) {
            console.log(`字段: ${fieldKey}, 文件列: ${fileHeader}, 列索引: ${colIdx}, 原始值: ${rawVal}, 字段类型: ${field.fieldType}`)
          }

          const DB_COLUMNS = new Set([
            'feedbackDate', 'productionTime', 'customerId', 'productModelId', 'shaftCount',
            'thickness', 'rollNo', 'specification', 'quantityInvolved', 'application',
            'productionLineId', 'shiftTeam', 'machineNo', 'batchNo',
            'feedbackContent', 'customerComplaintText', 'internalComplaintName',
            'defectSource', 'specificDefect', 'complaintCategory',
            'problemCategoryId', 'problemSubcategoryId', 'severityLevelId', 'repeatedIssue',
            'customerDemandId', 'disposalResult', 'compensationTypeId', 'closureStatus',
            'responsibleDeptId', 'responsibleProcessId',
            'rootCauseAnalysis', 'correctiveAction', 'lessonsLearned', 'reviewConclusion',
            'standardizedAction', 'productUsage', 'improvementAction', 'remark'
          ])

          const isDBColumn = DB_COLUMNS.has(fieldKey)

          switch (field.fieldType) {
            case 'date': {
              const d = parseDate(rawVal, XLSX)
              if (d) {
                if (isDBColumn) recordData[fieldKey] = d
                else customData[fieldKey] = dayjs(d).format('YYYY-MM-DD')
              }
              break
            }
            case 'number': {
              const n = parseFloat(String(rawVal))
              if (!isNaN(n)) {
                if (isDBColumn) recordData[fieldKey] = n
                else customData[fieldKey] = n
              }
              break
            }
            case 'switch': {
              const b = ['是', 'yes', 'true', '1', 'y'].includes(String(rawVal).toLowerCase().trim())
              if (isDBColumn) recordData[fieldKey] = b
              else customData[fieldKey] = b
              break
            }
            case 'select-config':
            case 'auto-complete': {
              const cfg = field.configType
              let refId: number | null = null
              if (cfg === 'customers') refId = findRef(String(rawVal), customers)
              else if (cfg === 'productModels') refId = findRef(String(rawVal), models)
              else if (cfg === 'responsibleDepartments') refId = findRef(String(rawVal), depts)
              else if (cfg === 'problemCategories') refId = findRef(String(rawVal), categories)
              else if (cfg === 'problemSubcategories') refId = findRef(String(rawVal), subcategories)
              else if (cfg === 'customerDemands') refId = findRef(String(rawVal), demands)
              else if (cfg === 'compensationTypes') refId = findRef(String(rawVal), compTypes)
              else if (cfg === 'severityLevels') refId = findRef(String(rawVal), severityLevels)
              else if (cfg === 'productionLines') refId = findRef(String(rawVal), lines)
              else if (cfg === 'responsibleProcesses') refId = findRef(String(rawVal), processes)

              if (refId) {
                if (fieldKey === 'customerId') recordData.customerId = refId
                else if (fieldKey === 'productModelId') recordData.productModelId = refId
                else if (fieldKey === 'responsibleDeptId') recordData.responsibleDeptId = refId
                else if (fieldKey === 'problemCategoryId') recordData.problemCategoryId = refId
                else if (fieldKey === 'problemSubcategoryId') recordData.problemSubcategoryId = refId
                else if (fieldKey === 'customerDemandId') recordData.customerDemandId = refId
                else if (fieldKey === 'compensationTypeId') recordData.compensationTypeId = refId
                else if (fieldKey === 'severityLevelId') recordData.severityLevelId = refId
                else if (fieldKey === 'productionLineId') recordData.productionLineId = refId
                else if (fieldKey === 'responsibleProcessId') recordData.responsibleProcessId = refId
                else if (isDBColumn) recordData[fieldKey] = String(rawVal)
                else customData[fieldKey] = String(rawVal)
              } else {
                if (isDBColumn) recordData[fieldKey] = String(rawVal)
                else customData[fieldKey] = String(rawVal)
              }
              break
            }
            default: {
              const strVal = String(rawVal).trim()
              if (strVal) {
                if (isDBColumn) recordData[fieldKey] = strVal
                else customData[fieldKey] = strVal
              }
            }
          }
        }

        if (!recordData.feedbackDate) recordData.feedbackDate = new Date()

        await prisma.complaintRecord.create({
          data: {
            complaintNo: `${prefix}${String(nextSeq++).padStart(4, '0')}`,
            feedbackDate: recordData.feedbackDate,
            productionTime: recordData.productionTime || null,
            customerId: recordData.customerId || null,
            productModelId: recordData.productModelId || null,
            shaftCount: recordData.shaftCount || null,
            thickness: recordData.thickness || null,
            rollNo: recordData.rollNo || null,
            specification: recordData.specification || null,
            quantityInvolved: recordData.quantityInvolved || null,
            application: recordData.application || null,
            productionLineId: recordData.productionLineId || null,
            shiftTeam: recordData.shiftTeam || null,
            machineNo: recordData.machineNo || null,
            batchNo: recordData.batchNo || null,
            feedbackContent: recordData.feedbackContent || null,
            customerComplaintText: recordData.customerComplaintText || null,
            internalComplaintName: recordData.internalComplaintName || null,
            defectSource: recordData.defectSource || null,
            specificDefect: recordData.specificDefect || null,
            complaintCategory: recordData.complaintCategory || null,
            problemCategoryId: recordData.problemCategoryId || null,
            problemSubcategoryId: recordData.problemSubcategoryId || null,
            severityLevelId: recordData.severityLevelId || null,
            repeatedIssue: recordData.repeatedIssue || false,
            customerDemandId: recordData.customerDemandId || null,
            disposalResult: recordData.disposalResult || null,
            compensationTypeId: recordData.compensationTypeId || null,
            closureStatus: 'pending',
            responsibleDeptId: recordData.responsibleDeptId || null,
            responsibleProcessId: recordData.responsibleProcessId || null,
            rootCauseAnalysis: recordData.rootCauseAnalysis || null,
            correctiveAction: recordData.correctiveAction || null,
            lessonsLearned: recordData.lessonsLearned || null,
            reviewConclusion: recordData.reviewConclusion || null,
            standardizedAction: recordData.standardizedAction || false,
            productUsage: recordData.productUsage || null,
            improvementAction: recordData.improvementAction || null,
            remark: recordData.remark || null,
            createdById: currentUser.id,
            updatedById: currentUser.id,
            templateIds: JSON.stringify([templateId]),
            templateData: Object.keys(customData).length > 0 ? JSON.stringify(customData) : null
          }
        })
        successCount++
      } catch (err: any) {
        errorCount++
        importErrors.push({ row: i + 2, message: err.message?.slice(0, 100) || String(err) })
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

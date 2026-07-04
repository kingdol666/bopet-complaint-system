import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'
import { ossRetrieve } from '~/server/utils/oss'

// Same DB_COLUMNS set as index.get.ts for filtering
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

// Query schema — mirrors the list API for consistent filtering
const querySchema = z.object({
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().int().optional(),
  productModelId: z.coerce.number().int().optional(),
  productionLineId: z.coerce.number().int().optional(),
  category: z.string().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.coerce.number().int().optional(),
  templateId: z.coerce.number().int().optional(),
  sortBy: z.string().default('feedbackDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z.string().optional()
})

// Apply dynamic filter (same logic as list API)
function applyDynamicFilter(where: any, fieldName: string, operator: string, val: any) {
  if (val === undefined || val === null || val === '') return
  const isDBColumn = DB_COLUMNS.has(fieldName)

  if (isDBColumn) {
    switch (operator) {
      case 'eq':
        if (['shaftCount', 'quantityInvolved', 'productModelId', 'customerId', 'productionLineId',
             'responsibleDeptId', 'responsibleProcessId'].includes(fieldName)) {
          where[fieldName] = Number(val)
        } else if (fieldName === 'closureStatus') {
          where[fieldName] = val
        } else if (fieldName === 'feedbackDate' || fieldName === 'productionTime') {
          where[fieldName] = { gte: new Date(val), lte: new Date(new Date(val).setHours(23, 59, 59, 999)) }
        } else {
          where[fieldName] = { equals: val }
        }
        break
      case 'contains':
        where[fieldName] = { contains: String(val) }
        break
      case 'gt': where[fieldName] = { gt: Number(val) }; break
      case 'lt': where[fieldName] = { lt: Number(val) }; break
      case 'gte': where[fieldName] = { gte: Number(val) }; break
      case 'lte': where[fieldName] = { lte: Number(val) }; break
      case 'date_eq':
        where[fieldName] = { gte: new Date(val), lte: new Date(new Date(val).setHours(23, 59, 59, 999)) }
        break
      case 'date_gte': where[fieldName] = { gte: new Date(val) }; break
      case 'date_lte': where[fieldName] = { lte: new Date(val) }; break
      default: where[fieldName] = { contains: String(val) }
    }
  } else {
    if (!where._customFilters) where._customFilters = []
    where._customFilters.push({ fieldName, operator, val: String(val) })
  }
}

function formatDateSafe(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTimeSafe(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    // ─── Build where clause (same as list API) ───
    const where: any = {}
    const deptFilter = buildDepartmentFilter(currentUser)
    Object.assign(where, deptFilter)

    if (params.keyword) {
      const kw = params.keyword
      where.OR = [
        { dataNo: { contains: kw } },
        { feedbackContent: { contains: kw } },
        { category: { contains: kw } },
        { rootCauseAnalysis: { contains: kw } },
        { correctiveAction: { contains: kw } },
        { rollNo: { contains: kw } },
        { batchNo: { contains: kw } }
      ]
    }

    if (params.startDate || params.endDate) {
      where.feedbackDate = {}
      if (params.startDate) where.feedbackDate.gte = new Date(params.startDate)
      if (params.endDate) {
        const eod = new Date(params.endDate); eod.setHours(23, 59, 59, 999)
        where.feedbackDate.lte = eod
      }
    }

    if (params.customerId) where.customerId = params.customerId
    if (params.productModelId) where.productModelId = params.productModelId
    if (params.productionLineId) where.productionLineId = params.productionLineId
    if (params.category) where.category = params.category
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId

    if (params.templateId) {
      const tid = String(params.templateId)
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { templateIds: { contains: `[${tid}]` } },
          { templateIds: { contains: `[${tid},` } },
          { templateIds: { contains: `,${tid}]` } },
          { templateIds: { contains: `,${tid},` } }
        ]
      })
    }

    // Dynamic filters
    if (params.filters) {
      try {
        const dynamicFilters: Array<{ field: string; operator: string; value: any }> = JSON.parse(params.filters)
        for (const df of dynamicFilters) {
          if (!df.field) continue
          applyDynamicFilter(where, df.field, df.operator, df.value)
        }
      } catch {}
    }

    const customFilters = where._customFilters || []
    delete where._customFilters

    // ─── Fetch ALL matching records (no pagination) ───
    const EXPORT_LIMIT = 5000
    let records: any[] = []

    if (customFilters.length > 0) {
      const allRecords = await prisma.dataRecord.findMany({
        where,
        include: {
          customer: true, productModel: true, productionLine: true,
          responsibleDept: true, responsibleProcess: true
        },
        orderBy: { [params.sortBy]: params.sortOrder },
        take: EXPORT_LIMIT
      })
      records = allRecords.filter(record => {
        let templateData: Record<string, any> = {}
        if (record.templateData) {
          try { templateData = JSON.parse(record.templateData) } catch { return false }
        }
        for (const cf of customFilters) {
          const fieldVal = templateData[cf.fieldName]
          if (fieldVal === undefined || fieldVal === null) return false
          const strFV = String(fieldVal).toLowerCase()
          const strCV = String(cf.val).toLowerCase()
          switch (cf.operator) {
            case 'eq': if (strFV !== strCV) return false; break
            case 'contains': if (!strFV.includes(strCV)) return false; break
            case 'gt': if (Number(fieldVal) <= Number(cf.val)) return false; break
            case 'lt': if (Number(fieldVal) >= Number(cf.val)) return false; break
            case 'gte': if (Number(fieldVal) < Number(cf.val)) return false; break
            case 'lte': if (Number(fieldVal) > Number(cf.val)) return false; break
            case 'date_eq':
            case 'date_gte':
            case 'date_lte':
              const fd = new Date(fieldVal), fdate = new Date(cf.val)
              if (cf.operator === 'date_eq' && fd.toISOString().slice(0, 10) !== fdate.toISOString().slice(0, 10)) return false
              if (cf.operator === 'date_gte' && fd < fdate) return false
              if (cf.operator === 'date_lte' && fd > fdate) return false
              break
            default: if (!strFV.includes(strCV)) return false
          }
        }
        return true
      })
    } else {
      records = await prisma.dataRecord.findMany({
        where,
        include: {
          customer: true, productModel: true, productionLine: true,
          responsibleDept: true, responsibleProcess: true
        },
        orderBy: { [params.sortBy]: params.sortOrder },
        take: EXPORT_LIMIT
      })
    }

    // ─── Load template fields if templateId is specified ───
    let templateFields: any[] = []
    if (params.templateId) {
      templateFields = await prisma.formTemplateField.findMany({
        where: { templateId: params.templateId },
        orderBy: { sortOrder: 'asc' }
      })
    }

    // ─── Fetch image attachments for all records ───
    const recordIds = records.map(r => r.id)
    const allAttachments = await prisma.dataAttachment.findMany({
      where: { dataId: { in: recordIds } },
      orderBy: { createdAt: 'asc' }
    })
    // Group by dataId, only keep images
    const imageAttachmentsByDataId = new Map<number, any[]>()
    for (const att of allAttachments) {
      if (att.fileType && att.fileType.startsWith('image/')) {
        if (!imageAttachmentsByDataId.has(att.dataId)) {
          imageAttachmentsByDataId.set(att.dataId, [])
        }
        imageAttachmentsByDataId.get(att.dataId)!.push(att)
      }
    }

    // ─── Build Excel with ExcelJS ───
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('数据导出', {
      properties: { defaultRowHeight: 20 }
    })

    const statusMap: Record<string, string> = {
      pending: '待分析', processing: '处理中', closed: '已结案'
    }

    // Define columns — DB columns always present
    const dbColumns: Array<{ header: string; key: string; width: number }> = [
      { header: '记录编号', key: 'dataNo', width: 16 },
      { header: '反馈日期', key: 'feedbackDate', width: 12 },
      { header: '生产日期', key: 'productionTime', width: 12 },
      { header: '客户名称', key: 'customerName', width: 14 },
      { header: '产品型号', key: 'productModelName', width: 14 },
      { header: '轴数', key: 'shaftCount', width: 8 },
      { header: '厚度', key: 'thickness', width: 10 },
      { header: '轴号', key: 'rollNo', width: 12 },
      { header: '规格', key: 'specification', width: 12 },
      { header: '涉及数量', key: 'quantityInvolved', width: 10 },
      { header: '产线', key: 'productionLineName', width: 10 },
      { header: '班组', key: 'shiftTeam', width: 8 },
      { header: '机台', key: 'machineNo', width: 8 },
      { header: '批次号', key: 'batchNo', width: 12 },
      { header: '反馈内容', key: 'feedbackContent', width: 30 },
      { header: '数据分类', key: 'category', width: 12 },
      { header: '闭环状态', key: 'closureStatus', width: 10 },
      { header: '责任部门', key: 'responsibleDeptName', width: 12 },
      { header: '责任工序', key: 'responsibleProcessName', width: 12 },
      { header: '原因分析', key: 'rootCauseAnalysis', width: 30 },
      { header: '改善措施', key: 'correctiveAction', width: 30 },
      { header: '备注', key: 'remark', width: 20 },
    ]

    // Template-specific columns
    const tplColumnKeys: string[] = []
    for (const tf of templateFields) {
      const key = `_tpl_${tf.fieldKey}`
      tplColumnKeys.push(key)
      dbColumns.push({ header: tf.fieldLabel, key, width: 16 })
    }

    // Attachment column (last)
    dbColumns.push({ header: '附件', key: '_attachments', width: 30 })

    ws.columns = dbColumns

    // Style header row
    ws.getRow(1).font = { bold: true, size: 11 }
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' }
    }
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    ws.getRow(1).height = 24

    // ─── Add data rows ───
    const MAX_IMG_HEIGHT = 180  // pixels
    const MAX_IMG_WIDTH = 260   // pixels
    const attachColIndex = dbColumns.length - 1 // 0-based

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const rowNum = i + 2 // Excel rows are 1-based, row 1 is header

      // Parse templateData
      let templateData: Record<string, any> = {}
      if (r.templateData) {
        try { templateData = JSON.parse(r.templateData) } catch {}
      }

      // Build row data
      const rowData: any = {
        dataNo: r.dataNo || '',
        feedbackDate: r.feedbackDate ? formatDateSafe(r.feedbackDate) : '',
        productionTime: r.productionTime ? formatDateSafe(r.productionTime) : '',
        customerName: r.customer?.name || '',
        productModelName: r.productModel?.name || '',
        shaftCount: r.shaftCount ?? '',
        thickness: r.thickness || '',
        rollNo: r.rollNo || '',
        specification: r.specification || '',
        quantityInvolved: r.quantityInvolved ?? '',
        productionLineName: r.productionLine?.name || '',
        shiftTeam: r.shiftTeam || '',
        machineNo: r.machineNo || '',
        batchNo: r.batchNo || '',
        feedbackContent: r.feedbackContent || '',
        category: r.category || '',
        closureStatus: statusMap[r.closureStatus] || r.closureStatus || '',
        responsibleDeptName: r.responsibleDept?.name || '',
        responsibleProcessName: r.responsibleProcess?.name || '',
        rootCauseAnalysis: r.rootCauseAnalysis || '',
        correctiveAction: r.correctiveAction || '',
        remark: r.remark || '',
      }

      // Template fields
      for (const tf of templateFields) {
        rowData[`_tpl_${tf.fieldKey}`] = templateData[tf.fieldKey] ?? ''
      }

      rowData._attachments = '' // placeholder, images will be inserted

      const row = ws.addRow(rowData)
      row.alignment = { vertical: 'top', wrapText: true }

      // ─── Embed images in the attachment column ───
      const images = imageAttachmentsByDataId.get(r.id) || []
      if (images.length > 0) {
        let imgOffset = 0 // vertical offset in pixels within the cell

        for (const img of images) {
          try {
            const retrieved = await ossRetrieve(img.storagePath)
            if (!retrieved || !retrieved.buffer) continue

            // Determine image extension
            const ext = img.fileType.includes('png') ? 'png'
              : img.fileType.includes('jpeg') || img.fileType.includes('jpg') ? 'jpeg'
              : img.fileType.includes('gif') ? 'gif'
              : 'png' // default

            const imageId = workbook.addImage({
              buffer: retrieved.buffer,
              extension: ext as 'png' | 'jpeg' | 'gif'
            })

            // Calculate scaled dimensions
            let imgW = img.width || 200
            let imgH = img.height || 150
            const ratio = Math.min(MAX_IMG_WIDTH / imgW, MAX_IMG_HEIGHT / imgH, 1)
            const scaledW = Math.round(imgW * ratio)
            const scaledH = Math.round(imgH * ratio)

            // Place image in the attachment column
            ws.addImage(imageId, {
              tl: { col: attachColIndex, row: rowNum - 1 + imgOffset / 20 },
              ext: { width: scaledW, height: scaledH }
            })

            imgOffset += scaledH + 4 // gap between images
          } catch (e) {
            // Skip failed image
          }
        }

        // Set row height to accommodate images
        if (imgOffset > 0) {
          const minRowHeight = Math.max(imgOffset / 1.2, 20)
          row.height = Math.min(minRowHeight, 400) // cap at 400
        }
      }
    }

    // ─── Add watermark/info row at the top ───
    // Insert a row at the top with export info
    ws.spliceRows(1, 0, [`导出人: ${currentUser.name}  导出时间: ${new Date().toISOString().slice(0, 10)}  共 ${records.length} 条记录  内部使用，请勿外传`])
    ws.mergeCells(1, 1, 1, dbColumns.length)
    ws.getRow(1).font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } }
    ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 22
    // Style the header row (now row 2)
    ws.getRow(2).font = { bold: true, size: 11 }
    ws.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
    ws.getRow(2).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    ws.getRow(2).height = 24

    // ─── Generate buffer and return ───
    const buffer = await workbook.xlsx.writeBuffer()

    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="datas_${new Date().toISOString().slice(0, 10)}.xlsx"`
    })

    return buffer
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0].message })
    }
    throw error
  }
})

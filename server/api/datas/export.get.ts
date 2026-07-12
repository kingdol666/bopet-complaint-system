import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'
import { ossRetrieve } from '~/server/utils/oss'
import {
  DB_COLUMNS,
  DB_INT_COLUMNS,
  EDITABLE_DATE_COLUMNS,
  DATA_INCLUDE
} from '~/server/utils/db-columns'

// ─── Query schema：与列表 API 保持完全一致的筛选条件 ───
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

// ─── 动态筛选器（与列表 API 完全相同的逻辑） ───
function applyDynamicFilter(where: any, fieldName: string, operator: string, val: any) {
  if (val === undefined || val === null || val === '') return

  const isDBColumn = DB_COLUMNS.has(fieldName)

  if (isDBColumn) {
    switch (operator) {
      case 'eq':
        if (DB_INT_COLUMNS.has(fieldName)) {
          where[fieldName] = Number(val)
        } else if (fieldName === 'closureStatus') {
          where[fieldName] = val
        } else if (EDITABLE_DATE_COLUMNS.has(fieldName)) {
          where[fieldName] = {
            gte: new Date(val),
            lte: new Date(new Date(val).setHours(23, 59, 59, 999))
          }
        } else {
          where[fieldName] = { equals: val }
        }
        break
      case 'contains':
        where[fieldName] = { contains: String(val) }
        break
      case 'gt':
        where[fieldName] = { gt: Number(val) }
        break
      case 'lt':
        where[fieldName] = { lt: Number(val) }
        break
      case 'gte':
        where[fieldName] = { gte: Number(val) }
        break
      case 'lte':
        where[fieldName] = { lte: Number(val) }
        break
      case 'date_eq':
        where[fieldName] = {
          gte: new Date(val),
          lte: new Date(new Date(val).setHours(23, 59, 59, 999))
        }
        break
      case 'date_gte':
        where[fieldName] = { gte: new Date(val) }
        break
      case 'date_lte':
        where[fieldName] = { lte: new Date(val) }
        break
      default:
        where[fieldName] = { contains: String(val) }
    }
  } else {
    // 自定义字段存储在 templateData JSON 中，稍后在内存中过滤
    if (!where._customFilters) where._customFilters = []
    where._customFilters.push({ fieldName, operator, val: String(val) })
  }
}

// ─── 日期格式化工具 ───
function formatDateSafe(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTimeSafe(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const statusMap: Record<string, string> = {
  pending: '待分析',
  processing: '处理中',
  closed: '已结案'
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    // ─── 构建 where 子句（与列表 API 完全一致） ───
    const where: any = {}
    const deptFilter = buildDepartmentFilter(currentUser)
    Object.assign(where, deptFilter)

    // 关键词搜索
    if (params.keyword) {
      const kw = params.keyword
      // 注意：不能直接用 where.OR = [...]，因为 buildDepartmentFilter 可能已设置了 where.OR
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { dataNo: { contains: kw } },
          { feedbackContent: { contains: kw } },
          { category: { contains: kw } },
          { rootCauseAnalysis: { contains: kw } },
          { correctiveAction: { contains: kw } },
          { rollNo: { contains: kw } },
          { batchNo: { contains: kw } }
        ]
      })
    }

    // 日期范围
    if (params.startDate || params.endDate) {
      where.feedbackDate = {}
      if (params.startDate) where.feedbackDate.gte = new Date(params.startDate)
      if (params.endDate) {
        const eod = new Date(params.endDate)
        eod.setHours(23, 59, 59, 999)
        where.feedbackDate.lte = eod
      }
    }

    // 其他筛选
    if (params.customerId) where.customerId = params.customerId
    if (params.productModelId) where.productModelId = params.productModelId
    if (params.productionLineId) where.productionLineId = params.productionLineId
    if (params.category) where.category = params.category
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId

    // 模板筛选
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

    // 动态筛选
    if (params.filters) {
      try {
        const dynamicFilters: Array<{ field: string; operator: string; value: any }> = JSON.parse(params.filters)
        for (const df of dynamicFilters) {
          if (!df.field) continue
          applyDynamicFilter(where, df.field, df.operator, df.value)
        }
      } catch {}
    }

    // 提取自定义筛选条件
    const customFilters = where._customFilters || []
    delete where._customFilters

    // ─── 获取全部匹配记录（不分页） ───
    const EXPORT_LIMIT = 5000
    let records: any[] = []

    if (customFilters.length > 0) {
      // 有自定义字段筛选时需要内存过滤
      const allRecords = await prisma.dataRecord.findMany({
        where,
        include: DATA_INCLUDE,
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
            case 'date_lte': {
              const fd = new Date(fieldVal), fdate = new Date(cf.val)
              if (cf.operator === 'date_eq' && fd.toISOString().slice(0, 10) !== fdate.toISOString().slice(0, 10)) return false
              if (cf.operator === 'date_gte' && fd < fdate) return false
              if (cf.operator === 'date_lte' && fd > fdate) return false
              break
            }
            default: if (!strFV.includes(strCV)) return false
          }
        }
        return true
      })
    } else {
      records = await prisma.dataRecord.findMany({
        where,
        include: DATA_INCLUDE,
        orderBy: { [params.sortBy]: params.sortOrder },
        take: EXPORT_LIMIT
      })
    }

    // ─── 加载模板字段定义（如果指定了模板） ───
    let templateFields: any[] = []
    if (params.templateId) {
      templateFields = await prisma.formTemplateField.findMany({
        where: { templateId: params.templateId },
        orderBy: { sortOrder: 'asc' }
      })
    }

    // ─── 获取所有记录的附件 ───
    const recordIds = records.map(r => r.id)
    const allAttachments = recordIds.length > 0
      ? await prisma.dataAttachment.findMany({
          where: { dataId: { in: recordIds } },
          orderBy: { createdAt: 'asc' }
        })
      : []

    // 按 dataId 分组
    const attachmentsByDataId = new Map<number, any[]>()
    for (const att of allAttachments) {
      if (!attachmentsByDataId.has(att.dataId)) {
        attachmentsByDataId.set(att.dataId, [])
      }
      attachmentsByDataId.get(att.dataId)!.push(att)
    }

    // ─── 使用 ExcelJS 构建 Excel 文件 ───
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('数据导出', {
      properties: { defaultRowHeight: 20 }
    })

    // 定义固定列（DB 字段）
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
      { header: '纠正措施', key: 'correctiveAction', width: 30 },
      { header: '改善措施', key: 'improvementAction', width: 30 },
      { header: '经验总结', key: 'lessonsLearned', width: 25 },
      { header: '复盘结论', key: 'reviewConclusion', width: 25 },
      { header: '备注', key: 'remark', width: 20 }
    ]

    // 模板自定义字段列
    for (const tf of templateFields) {
      const key = `_tpl_${tf.fieldKey}`
      dbColumns.push({ header: tf.fieldLabel, key, width: 16 })
    }

    // 附件列（最后一列）
    dbColumns.push({ header: '附件', key: '_attachments', width: 30 })

    ws.columns = dbColumns

    // 附件列的索引（0-based）
    const attachColIndex = dbColumns.length - 1

    // ─── 添加数据行 ───
    const MAX_IMG_HEIGHT = 180  // 图片最大高度（像素）
    const MAX_IMG_WIDTH = 260   // 图片最大宽度（像素）

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const rowNum = i + 2 // Excel 行从 1 开始，第 1 行是表头

      // 解析 templateData
      let templateData: Record<string, any> = {}
      if (r.templateData) {
        try { templateData = JSON.parse(r.templateData) } catch {}
      }

      // 构建行数据
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
        improvementAction: r.improvementAction || '',
        lessonsLearned: r.lessonsLearned || '',
        reviewConclusion: r.reviewConclusion || '',
        remark: r.remark || ''
      }

      // 模板自定义字段值
      for (const tf of templateFields) {
        rowData[`_tpl_${tf.fieldKey}`] = templateData[tf.fieldKey] ?? ''
      }

      // 附件列初始为空占位
      rowData._attachments = ''

      const row = ws.addRow(rowData)
      row.alignment = { vertical: 'top', wrapText: true }

      // ─── 处理附件：图片直接嵌入，非图片列出文件名 ───
      const attachments = attachmentsByDataId.get(r.id) || []
      if (attachments.length > 0) {
        const imageAttachments = attachments.filter(a => a.fileType && a.fileType.startsWith('image/'))
        const otherAttachments = attachments.filter(a => !a.fileType || !a.fileType.startsWith('image/'))

        // 非图片附件：在单元格中列出文件名
        if (otherAttachments.length > 0) {
          const fileNames = otherAttachments.map(a => a.fileName).join('\n')
          // 获取附件列的单元格并设置值
          const attachCell = row.getCell(attachColIndex + 1) // 1-based
          attachCell.value = fileNames
        }

        // 图片附件：嵌入到 Excel 中
        if (imageAttachments.length > 0) {
          let imgOffset = 0 // 在单元格内的垂直偏移（像素）

          for (const img of imageAttachments) {
            try {
              const retrieved = await ossRetrieve(img.storagePath)
              if (!retrieved || !retrieved.buffer) continue

              // 确定图片格式
              const ext = img.fileType.includes('png') ? 'png'
                : img.fileType.includes('jpeg') || img.fileType.includes('jpg') ? 'jpeg'
                : img.fileType.includes('gif') ? 'gif'
                : 'png'

              const imageId = workbook.addImage({
                buffer: retrieved.buffer,
                extension: ext as 'png' | 'jpeg' | 'gif'
              })

              // 计算缩放后的尺寸
              let imgW = img.width || 200
              let imgH = img.height || 150
              const ratio = Math.min(MAX_IMG_WIDTH / imgW, MAX_IMG_HEIGHT / imgH, 1)
              const scaledW = Math.round(imgW * ratio)
              const scaledH = Math.round(imgH * ratio)

              // 将图片放置在附件列
              ws.addImage(imageId, {
                tl: { col: attachColIndex, row: rowNum - 1 + imgOffset / 20 },
                ext: { width: scaledW, height: scaledH }
              })

              imgOffset += scaledH + 4 // 图片之间的间距
            } catch {
              // 单个图片加载失败时跳过，不影响其他图片
            }
          }

          // 根据图片总高度调整行高
          if (imgOffset > 0) {
            const minRowHeight = Math.max(imgOffset / 1.2, 20)
            row.height = Math.min(minRowHeight, 400) // 行高上限 400
          }
        }
      }
    }

    // ─── 在顶部插入水印/导出信息行 ───
    ws.spliceRows(1, 0, [
      `导出人: ${currentUser.name}  导出时间: ${new Date().toISOString().slice(0, 10)}  共 ${records.length} 条记录  内部使用，请勿外传`
    ])
    ws.mergeCells(1, 1, 1, dbColumns.length)
    ws.getRow(1).font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } }
    ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 22

    // 设置表头行样式（现在在第 2 行）
    ws.getRow(2).font = { bold: true, size: 11 }
    ws.getRow(2).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' }
    }
    ws.getRow(2).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    ws.getRow(2).height = 24

    // ─── 生成 buffer 并返回 ───
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

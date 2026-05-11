import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireSessionUser, buildDepartmentFilter } from '~/server/utils/auth'

// Query schema for filtering (same as list)
const querySchema = z.object({
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().int().optional(),
  productModelId: z.coerce.number().int().optional(),
  productionLineId: z.coerce.number().int().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.coerce.number().int().optional()
})

// Escape CSV field
function escapeCSV(field: any): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Format date safely without locale dependency
function formatDateSafe(date: Date | string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format datetime safely without locale dependency
function formatDateTimeSafe(date: Date | string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    // Build where clause (same as list)
    const where: any = {}

    // Department filter
    const deptFilter = buildDepartmentFilter(currentUser)
    Object.assign(where, deptFilter)

    if (params.keyword) {
      const keyword = params.keyword
      where.OR = [
        { dataNo: { contains: keyword } },
        { feedbackContent: { contains: keyword } },
        { rootCauseAnalysis: { contains: keyword } },
        { correctiveAction: { contains: keyword } },
        { rollNo: { contains: keyword } },
        { batchNo: { contains: keyword } }
      ]
    }

    if (params.startDate || params.endDate) {
      where.feedbackDate = {}
      if (params.startDate) {
        where.feedbackDate.gte = new Date(params.startDate)
      }
      if (params.endDate) {
        where.feedbackDate.lte = new Date(params.endDate)
      }
    }

    if (params.customerId) where.customerId = params.customerId
    if (params.productModelId) where.productModelId = params.productModelId
    if (params.productionLineId) where.productionLineId = params.productionLineId
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId

    // Get all matching records
    const records = await prisma.dataRecord.findMany({
      where,
      include: {
        customer: true,
        productModel: true,
        productionLine: true,
        responsibleDept: true,
        responsibleProcess: true
      },
      orderBy: {
        feedbackDate: 'desc'
      }
    })

    // Add watermark / export info row
    const watermarkRows = [
      `导出人:${currentUser.name} 时间:${new Date().toISOString().slice(0, 10)} 内部使用`,
      ''
    ]

    // Build CSV content
    const headers = [
      '记录编号',
      '反馈日期',
      '生产日期',
      '客户编码',
      '客户名称',
      '产品型号',
      '轴数',
      '厚度',
      '轴号',
      '规格',
      '涉及数量',
      '用途',
      '产线',
      '班组',
      '机台',
      '批次号',
      '反馈内容',
      '数据分类',
      '闭环状态',
      '责任部门',
      '责任工序',
      '原因分析',
      '改善措施',
      '启示',
      '复盘结论',
      '产品用途',
      '备注',
      '创建时间',
      '更新时间'
    ]

    const statusMap: Record<string, string> = {
      pending: '待分析',
      processing: '处理中',
      closed: '已结案'
    }

    const rows = records.map(r => [
      escapeCSV(r.dataNo),
      escapeCSV(r.feedbackDate ? formatDateSafe(r.feedbackDate) : ''),
      escapeCSV(r.productionTime ? formatDateSafe(r.productionTime) : ''),
      escapeCSV(r.customer?.code),
      escapeCSV(r.customer?.name),
      escapeCSV(r.productModel?.name),
      escapeCSV(r.shaftCount ?? ''),
      escapeCSV(r.thickness),
      escapeCSV(r.rollNo),
      escapeCSV(r.specification),
      escapeCSV(r.quantityInvolved ?? ''),
      escapeCSV(r.application),
      escapeCSV(r.productionLine?.name),
      escapeCSV(r.shiftTeam),
      escapeCSV(r.machineNo),
      escapeCSV(r.batchNo),
      escapeCSV(r.feedbackContent),
      escapeCSV(r.category),
      escapeCSV(statusMap[r.closureStatus] || r.closureStatus),
      escapeCSV(r.responsibleDept?.name),
      escapeCSV(r.responsibleProcess?.name),
      escapeCSV(r.rootCauseAnalysis),
      escapeCSV(r.correctiveAction),
      escapeCSV(r.lessonsLearned),
      escapeCSV(r.reviewConclusion),
      escapeCSV(r.productUsage),
      escapeCSV(r.remark),
      escapeCSV(r.createdAt ? formatDateTimeSafe(r.createdAt) : ''),
      escapeCSV(r.updatedAt ? formatDateTimeSafe(r.updatedAt) : '')
    ])

    const watermarkLine = `\u5BFC\u51FA\u4EBA:${currentUser.name} \u5BFC\u51FA\u65F6\u95F4:${new Date().toISOString().slice(0, 10)} \u5185\u90E8\u4F7F\u7528\uFF0C\u8BF7\u52FF\u5916\u4F20`
    const csvContent = '\uFEFF' + watermarkLine + '\n\n' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')

    // Set response headers for file download
    setResponseHeaders(event, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="datas_${new Date().toISOString().slice(0, 10)}.csv"`
    })

    return csvContent
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.errors[0].message
      })
    }
    throw error
  }
})

import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { booleanQueryParam } from '~/server/utils/query'

// Query schema for filtering (same as list)
const querySchema = z.object({
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().int().optional(),
  productModelId: z.coerce.number().int().optional(),
  productionLineId: z.coerce.number().int().optional(),
  problemCategoryId: z.coerce.number().int().optional(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).optional(),
  responsibleDeptId: z.coerce.number().int().optional(),
  severityLevelId: z.coerce.number().int().optional(),
  repeatedIssue: booleanQueryParam
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

export default defineEventHandler(async (event) => {
  try {
    const query = await getQuery(event)
    const params = querySchema.parse(query)

    // Build where clause (same as list)
    const where: any = {}

    if (params.keyword) {
      const keyword = params.keyword
      where.OR = [
        { complaintNo: { contains: keyword } },
        { feedbackContent: { contains: keyword } },
        { customerComplaintText: { contains: keyword } },
        { internalComplaintName: { contains: keyword } },
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
    if (params.problemCategoryId) where.problemCategoryId = params.problemCategoryId
    if (params.closureStatus) where.closureStatus = params.closureStatus
    if (params.responsibleDeptId) where.responsibleDeptId = params.responsibleDeptId
    if (params.severityLevelId) where.severityLevelId = params.severityLevelId
    if (params.repeatedIssue !== undefined) where.repeatedIssue = params.repeatedIssue

    // Get all matching records
    const records = await prisma.complaintRecord.findMany({
      where,
      include: {
        customer: true,
        productModel: true,
        productionLine: true,
        problemCategory: true,
        problemSubcategory: true,
        severityLevel: true,
        customerDemand: true,
        compensationType: true,
        responsibleDept: true,
        responsibleProcess: true
      },
      orderBy: {
        feedbackDate: 'desc'
      }
    })

    // Build CSV content
    const headers = [
      '客诉编号',
      '反馈日期',
      '生产时间',
      '客户编码',
      '客户名称',
      '产品型号',
      '厚度',
      '轴号',
      '涉及数量',
      '用途',
      '产线',
      '班组',
      '机台',
      '批次号',
      '反馈内容',
      '客户投诉描述',
      '内部问题名称',
      '问题大类',
      '问题小类',
      '严重等级',
      '是否重复',
      '客户诉求',
      '处置结果',
      '赔偿方式',
      '闭环状态',
      '责任部门',
      '责任工序',
      '原因分析',
      '改善措施',
      '启示',
      '复盘结论',
      '标准化措施',
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
      escapeCSV(r.complaintNo),
      escapeCSV(r.feedbackDate ? new Date(r.feedbackDate).toLocaleDateString('zh-CN') : ''),
      escapeCSV(r.productionTime ? new Date(r.productionTime).toLocaleDateString('zh-CN') : ''),
      escapeCSV(r.customer?.code),
      escapeCSV(r.customer?.name),
      escapeCSV(r.productModel?.name),
      escapeCSV(r.thickness),
      escapeCSV(r.rollNo),
      escapeCSV(r.quantityInvolved),
      escapeCSV(r.application),
      escapeCSV(r.productionLine?.name),
      escapeCSV(r.shiftTeam),
      escapeCSV(r.machineNo),
      escapeCSV(r.batchNo),
      escapeCSV(r.feedbackContent),
      escapeCSV(r.customerComplaintText),
      escapeCSV(r.internalComplaintName),
      escapeCSV(r.problemCategory?.name),
      escapeCSV(r.problemSubcategory?.name),
      escapeCSV(r.severityLevel?.name),
      escapeCSV(r.repeatedIssue ? '是' : '否'),
      escapeCSV(r.customerDemand?.name),
      escapeCSV(r.disposalResult),
      escapeCSV(r.compensationType?.name),
      escapeCSV(statusMap[r.closureStatus] || r.closureStatus),
      escapeCSV(r.responsibleDept?.name),
      escapeCSV(r.responsibleProcess?.name),
      escapeCSV(r.rootCauseAnalysis),
      escapeCSV(r.correctiveAction),
      escapeCSV(r.lessonsLearned),
      escapeCSV(r.reviewConclusion),
      escapeCSV(r.standardizedAction ? '是' : '否'),
      escapeCSV(r.remark),
      escapeCSV(r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : ''),
      escapeCSV(r.updatedAt ? new Date(r.updatedAt).toLocaleString('zh-CN') : '')
    ])

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')

    // Set response headers for file download
    setResponseHeaders(event, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="complaints_${new Date().toISOString().slice(0, 10)}.csv"`
    })

    return csvContent
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0].message
      })
    }
    throw error
  }
})

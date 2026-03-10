import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth'

// Create complaint schema
const createSchema = z.object({
  // Basic info
  feedbackDate: z.string().transform(v => new Date(v)),
  productionTime: z.string().transform(v => new Date(v)).optional().nullable(),
  productModelId: z.number().int().optional().nullable(),
  thickness: z.string().max(50).optional().nullable(),
  rollNo: z.string().max(100).optional().nullable(),
  customerId: z.number().int().optional().nullable(),
  quantityInvolved: z.number().optional().nullable(),
  application: z.string().max(200).optional().nullable(),
  productionLineId: z.number().int().optional().nullable(),
  shiftTeam: z.string().max(50).optional().nullable(),
  machineNo: z.string().max(50).optional().nullable(),
  batchNo: z.string().max(100).optional().nullable(),
  // Complaint content
  feedbackContent: z.string().optional().nullable(),
  customerComplaintText: z.string().optional().nullable(),
  internalComplaintName: z.string().max(200).optional().nullable(),
  problemCategoryId: z.number().int().optional().nullable(),
  problemSubcategoryId: z.number().int().optional().nullable(),
  severityLevelId: z.number().int().optional().nullable(),
  repeatedIssue: z.boolean().default(false),
  // Disposal
  customerDemandId: z.number().int().optional().nullable(),
  disposalResult: z.string().optional().nullable(),
  compensationTypeId: z.number().int().optional().nullable(),
  closureStatus: z.enum(['pending', 'processing', 'closed']).default('pending'),
  responsibleDeptId: z.number().int().optional().nullable(),
  responsibleProcessId: z.number().int().optional().nullable(),
  // Analysis
  rootCauseAnalysis: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  lessonsLearned: z.string().optional().nullable(),
  reviewConclusion: z.string().optional().nullable(),
  standardizedAction: z.boolean().default(false),
  remark: z.string().optional().nullable()
})

// Generate complaint number
async function generateComplaintNo(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const prefix = `CP-${year}-`

  // Get the count of complaints for this year
  const count = await prisma.complaintRecord.count({
    where: {
      complaintNo: {
        startsWith: prefix
      }
    }
  })

  const seq = (count + 1).toString().padStart(4, '0')
  return `${prefix}${seq}`
}

export default defineEventHandler(async (event) => {
  try {
    // Get current user
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')
    const payload = token ? verifyToken(token) : null

    const body = await readBody(event)
    const data = createSchema.parse(body)

    // Generate complaint number
    const complaintNo = await generateComplaintNo()

    // Create complaint record
    const record = await prisma.complaintRecord.create({
      data: {
        complaintNo,
        ...data,
        createdById: payload?.userId || null,
        updatedById: payload?.userId || null
      },
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
      }
    })

    // Log operation
    if (payload) {
      await prisma.operationLog.create({
        data: {
          userId: payload.userId,
          action: 'create',
          module: 'complaint',
          targetId: record.id,
          targetName: record.complaintNo,
          detail: JSON.stringify({ complaintNo: record.complaintNo })
        }
      })
    }

    return {
      success: true,
      data: record,
      message: '客诉记录创建成功'
    }
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

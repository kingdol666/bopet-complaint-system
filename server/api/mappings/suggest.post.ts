import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const suggestSchema = z.object({
  text: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { text } = suggestSchema.parse(body)

    // Get all enabled mappings
    const mappings = await prisma.complaintProblemMapping.findMany({
      where: { enabled: true },
      include: {
        problemCategory: true,
        problemSubcategory: true
      }
    })

    // Simple keyword matching
    const suggestions: any[] = []
    const textLower = text.toLowerCase()

    for (const mapping of mappings) {
      let score = 0
      const keywords = mapping.keywordPattern?.split(',').map(k => k.trim().toLowerCase()) || []

      // Check if any keyword matches
      for (const keyword of keywords) {
        if (keyword && textLower.includes(keyword)) {
          score += 10
        }
      }

      // Check if customer expression matches
      if (mapping.customerExpression.toLowerCase().includes(textLower)) {
        score += 5
      }

      // Check if internal name matches
      if (mapping.internalComplaintName.toLowerCase().includes(textLower)) {
        score += 3
      }

      if (score > 0) {
        suggestions.push({
          ...mapping,
          score
        })
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score)

    // Return top 5 suggestions
    return {
      success: true,
      data: suggestions.slice(0, 5)
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

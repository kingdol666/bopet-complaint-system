import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { verifyPassword, generateToken, loginSchema } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validated = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: validated.username }
    })

    if (!user || !user.enabled) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户名或密码错误'
      })
    }

    // Verify password
    if (!verifyPassword(validated.password, user.password)) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户名或密码错误'
      })
    }

    // Generate token
    const token = generateToken(user.id, user.username, user.role)

    // Return user info and token
    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      }
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

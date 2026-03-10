import { verifyToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录'
    })
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: '登录已过期，请重新登录'
    })
  }

  return {
    success: true,
    data: {
      id: payload.userId,
      username: payload.username,
      role: payload.role
    }
  }
})

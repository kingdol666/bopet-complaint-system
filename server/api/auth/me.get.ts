import { requireSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  return {
    success: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  }
})

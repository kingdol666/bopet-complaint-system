import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  username: z.string().min(1),
  role: z.string().min(1),
  exp: z.number().int().positive()
})

type TokenPayload = z.infer<typeof tokenPayloadSchema>

export interface SessionUser {
  id: number
  username: string
  name: string
  role: string
}

let devJwtSecret: string | null = null

function getAuthSecret(): string {
  const config = useRuntimeConfig()
  const configuredSecret =
    (typeof config.jwtSecret === 'string' && config.jwtSecret) ||
    (typeof process.env.JWT_SECRET === 'string' && process.env.JWT_SECRET) ||
    ''

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== 'production') {
    if (!devJwtSecret) {
      devJwtSecret = randomBytes(32).toString('base64url')
    }

    return devJwtSecret
  }

  throw new Error('JWT_SECRET is required in production')
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString()
}

function createSignature(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

function extractBearerToken(event: H3Event): string | null {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7).trim()
  return token || null
}

export function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

export function generateToken(userId: number, username: string, role: string): string {
  const payload: TokenPayload = {
    userId,
    username,
    role,
    exp: Date.now() + TOKEN_TTL_MS
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = createSignature(encodedPayload, getAuthSecret())

  return `${encodedPayload}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encodedPayload, providedSignature, ...rest] = token.split('.')

    if (!encodedPayload || !providedSignature || rest.length > 0) {
      return null
    }

    const expectedSignature = createSignature(encodedPayload, getAuthSecret())
    if (!signaturesMatch(expectedSignature, providedSignature)) {
      return null
    }

    const payload = tokenPayloadSchema.parse(JSON.parse(decodeBase64Url(encodedPayload)))
    if (payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空')
})

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin'
}

export async function getOptionalSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = extractBearerToken(event)
  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      enabled: true
    }
  })

  if (!user || !user.enabled) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  }
}

export async function requireSessionUser(event: H3Event): Promise<SessionUser> {
  const user = await getOptionalSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录或登录已失效'
    })
  }

  return user
}

export async function requireAdminUser(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)

  if (!isAdmin(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: '需要管理员权限'
    })
  }

  return user
}

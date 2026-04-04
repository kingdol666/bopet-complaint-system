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
  departmentIds: number[]
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
  // 1. Try Authorization header first
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  // 2. Fallback to cookie (for browser-initiated requests like $fetch, window.open)
  const cookieHeader = getHeader(event, 'cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/)
  if (match?.[1]) {
    return match[1]
  }

  return null
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

// ==================== 权限判断工具 ====================

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === 'superadmin'
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin'
}

export function isNormalUser(user: SessionUser | null): boolean {
  return user?.role === 'normal'
}

/** 是否拥有写权限（superadmin 或 admin） */
export function canWrite(user: SessionUser | null): boolean {
  return user?.role === 'superadmin' || user?.role === 'admin'
}

// ==================== 获取用户（含部门） ====================

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
      enabled: true,
      departments: {
        select: { departmentId: true }
      }
    }
  })

  if (!user || !user.enabled) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    departmentIds: user.departments.map(d => d.departmentId)
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

/** 要求 superadmin 权限 */
export async function requireSuperAdminUser(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)

  if (!isSuperAdmin(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: '需要超级管理员权限'
    })
  }

  return user
}

/** 要求写权限（superadmin 或 admin） */
export async function requireWritePermission(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)

  if (!canWrite(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: '您没有操作权限，仅可查看'
    })
  }

  return user
}

// ==================== 部门过滤工具 ====================

/**
 * 获取用户的可见部门 ID 列表。
 * superadmin 返回 null 表示不做部门过滤（可看全部）。
 */
export function getVisibleDepartmentIds(user: SessionUser): number[] | null {
  if (isSuperAdmin(user)) {
    return null // 不过滤，可看全部
  }
  return user.departmentIds
}

/**
 * 构建部门过滤的 where 条件。
 * superadmin 不加过滤条件，admin/normal 只能看自己部门的数据。
 * 字段名默认为 responsibleDeptId（客诉记录的责任部门）。
 */
export function buildDepartmentFilter(user: SessionUser, fieldName = 'responsibleDeptId'): Record<string, any> {
  const deptIds = getVisibleDepartmentIds(user)
  if (deptIds === null) {
    return {}
  }
  if (deptIds.length === 0) {
    // 没有分配部门的用户看不到任何数据
    return { [fieldName]: { in: [-1] } }
  }
  return { [fieldName]: { in: deptIds } }
}

/**
 * 检查用户是否有权操作指定部门的数据。
 * superadmin 有全部权限。
 */
export function canAccessDepartment(user: SessionUser, departmentId: number | null): boolean {
  if (isSuperAdmin(user)) {
    return true
  }
  if (!departmentId) {
    return false
  }
  return user.departmentIds.includes(departmentId)
}

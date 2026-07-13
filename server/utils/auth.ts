import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto'
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
  /** 跨部门授权可查看的部门ID列表（不含本部门） */
  grantedDepartmentIds: number[]
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

  // 2. Try cookie (for browser-initiated requests like $fetch, window.open)
  const cookieHeader = getHeader(event, 'cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/)
  if (match?.[1]) {
    return match[1]
  }

  // 3. Try query parameter (for window.open / direct URL access)
  const query = getQuery(event)
  if (typeof query.token === 'string' && query.token) {
    return query.token
  }

  return null
}

export function hashPassword(password: string): string {
  // Per-user random salt using Node.js built-in scrypt (memory-hard KDF)
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return salt + ':' + key.toString('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  // Backward compat: old HMAC-SHA256 hashes (no colon separator)
  if (!hash.includes(':')) {
    const oldHash = createHmac('sha256', 'bopet-eda-platform-salt-2024').update(password).digest('hex')
    return oldHash === hash
  }
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return derived.toString('hex') === key
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

// ==================== 角色判断工具 ====================

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === 'superadmin'
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin'
}

export function isNormalUser(user: SessionUser | null): boolean {
  return user?.role === 'normal'
}

/** 是否拥有写权限（superadmin 或 admin）。普通用户只有查看和分析权限。 */
export function canWrite(user: SessionUser | null): boolean {
  return user?.role === 'superadmin' || user?.role === 'admin'
}

// ==================== 获取用户（含部门 + 跨部门授权） ====================

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
      },
      grantedAccess: {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
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
    departmentIds: user.departments.map(d => d.departmentId),
    grantedDepartmentIds: user.grantedAccess.map(g => g.departmentId)
  }
}

export async function requireSessionUser(event: H3Event): Promise<SessionUser> {
  const user = await getOptionalSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '未登录或登录已失效'
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
      message: '需要超级管理员权限'
    })
  }

  return user
}

/** 要求写权限（superadmin 或 admin）。普通用户被拒绝。 */
export async function requireWritePermission(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)

  if (!canWrite(user)) {
    throw createError({
      statusCode: 403,
      message: '您没有操作权限，仅可查看'
    })
  }

  return user
}

// ==================== 部门权限工具（核心） ====================

/**
 * 获取用户【可查看】的部门 ID 列表（本部门 + 跨部门授权）。
 * superadmin 返回 null 表示不做部门过滤（可看全部）。
 */
export function getViewableDepartmentIds(user: SessionUser): number[] | null {
  if (isSuperAdmin(user)) {
    return null // 不过滤，可看全部
  }
  // 合并本部门 + 跨部门授权
  const all = new Set([...user.departmentIds, ...user.grantedDepartmentIds])
  return [...all]
}

/**
 * 获取用户【可修改】的部门 ID 列表（仅本部门）。
 * 普通用户返回空数组（无修改权限）。
 * superadmin 返回 null 表示不做限制。
 */
export function getModifiableDepartmentIds(user: SessionUser): number[] | null {
  if (isSuperAdmin(user)) {
    return null
  }
  if (isNormalUser(user)) {
    return [] // 普通用户无修改权限
  }
  // admin 只能修改本部门数据
  return user.departmentIds
}

/**
 * 构建部门过滤的 where 条件（用于【查看】数据）。
 *
 * 权限规则：
 * - superadmin: 可查看全部数据，不加过滤条件
 * - admin/normal: 可查看
 *   1) 本部门 + 跨部门授权范围内的公开数据（isPublic=true）
 *   2) 自己创建的数据（无论公开/私密）
 *
 * @param fieldName 部门字段名，默认 'responsibleDeptId'
 */
export function buildDepartmentFilter(user: SessionUser, fieldName = 'responsibleDeptId'): Record<string, any> {
  const deptIds = getViewableDepartmentIds(user)
  if (deptIds === null) {
    // superadmin 可看全部
    return {}
  }
  if (deptIds.length === 0) {
    // 没有部门权限，只能看自己创建的
    return { createdById: user.id }
  }
  // 可查看：
  // 1) 部门范围内的公开数据（isPublic=true）
  // 2) 自己创建的所有数据
  // 3) 没有指定部门但公开的数据（isPublic=true 且 responsibleDeptId 为 null）
  return {
    OR: [
      { [fieldName]: { in: deptIds }, isPublic: true },
      { createdById: user.id },
      { [fieldName]: null, isPublic: true }
    ]
  }
}

/**
 * 构建部门过滤的 where 条件（用于【修改/删除】数据）。
 * 仅限本部门，不含跨部门授权。
 */
export function buildModifyDepartmentFilter(user: SessionUser, fieldName = 'responsibleDeptId'): Record<string, any> {
  const deptIds = getModifiableDepartmentIds(user)
  if (deptIds === null) {
    return {}
  }
  if (deptIds.length === 0) {
    return { [fieldName]: { in: [-1] } }
  }
  return { [fieldName]: { in: deptIds } }
}

/**
 * 检查用户是否有权【查看】指定部门的数据。
 * superadmin 有全部权限。其他角色需要是本部门成员或拥有跨部门授权。
 */
export function canViewDepartment(user: SessionUser, departmentId: number | null): boolean {
  if (isSuperAdmin(user)) {
    return true
  }
  if (!departmentId) {
    return false
  }
  return user.departmentIds.includes(departmentId) || user.grantedDepartmentIds.includes(departmentId)
}

/**
 * 检查用户是否有权【修改/删除/创建】指定部门的数据。
 * superadmin 有全部权限。admin 仅限本部门。普通用户无权限。
 * 注意：数据的创建者始终可以修改自己的私密数据，即使不是 admin。
 */
export function canModifyDepartment(user: SessionUser, departmentId: number | null): boolean {
  if (isSuperAdmin(user)) {
    return true
  }
  if (isNormalUser(user)) {
    return false
  }
  // admin 仅限本部门
  if (!departmentId) {
    return false
  }
  return user.departmentIds.includes(departmentId)
}

/**
 * 检查用户是否有权为指定部门【创建】数据。
 * superadmin: 可为任意部门创建。
 * admin: 仅可为本部门创建。
 * normal: 仅可为本部门创建（普通员工可以上传自己部门的数据）。
 */
export function canCreateForDepartment(user: SessionUser, departmentId: number | null): boolean {
  if (isSuperAdmin(user)) {
    return true
  }
  if (!departmentId) {
    return true // 未指定部门时允许创建（后续由 createdById 记录归属）
  }
  return user.departmentIds.includes(departmentId)
}

/**
 * 向后兼容：canAccessDepartment 等同于 canViewDepartment。
 * @deprecated 请使用 canViewDepartment 或 canModifyDepartment 以明确语义。
 */
export function canAccessDepartment(user: SessionUser, departmentId: number | null): boolean {
  return canViewDepartment(user, departmentId)
}

// ==================== Raw SQL 可见性过滤 ====================

/**
 * 构建 SQL 可见性过滤子句，用于 raw SQL 查询（如 $queryRawUnsafe）。
 *
 * 可见性规则与 `buildDepartmentFilter` 完全一致：
 * - superadmin: 不加过滤（返回空子句）
 * - 其他用户：
 *   1) 部门范围内公开数据（isPublic=1）
 *   2) 自己创建的数据（无论公开/私密）
 *   3) 无部门但公开的数据
 *
 * @param user 当前用户
 * @param tableAlias SQL 表别名（如 'cr'），为空时直接使用列名
 * @returns { clause: string; params: any[] } — clause 为空字符串表示不加过滤
 */
export function buildVisibilitySQL(
  user: SessionUser,
  tableAlias: string = ''
): { clause: string; params: any[] } {
  if (isSuperAdmin(user)) {
    return { clause: '', params: [] }
  }

  const deptIds = getViewableDepartmentIds(user)
  const p = tableAlias ? `${tableAlias}.` : ''

  if (!deptIds || deptIds.length === 0) {
    // 没有部门权限，只能看自己创建的
    return {
      clause: `${p}createdById = ?`,
      params: [user.id]
    }
  }

  const placeholders = deptIds.map(() => '?').join(',')
  return {
    clause: `((${p}responsibleDeptId IN (${placeholders}) AND ${p}isPublic = 1) OR ${p}createdById = ? OR (${p}responsibleDeptId IS NULL AND ${p}isPublic = 1))`,
    params: [...deptIds, user.id]
  }
}

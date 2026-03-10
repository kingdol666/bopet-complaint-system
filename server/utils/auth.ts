import type { User } from '@prisma/client'
import { z } from 'zod'

// Simple hash function for demo (in production use bcrypt)
export function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// Generate simple token (in production use JWT)
export function generateToken(userId: number, username: string, role: string): string {
  const payload = JSON.stringify({ userId, username, role, exp: Date.now() + 24 * 60 * 60 * 1000 })
  return Buffer.from(payload).toString('base64')
}

// Verify token
export function verifyToken(token: string): { userId: number; username: string; role: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload.exp < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

// User type for session
export interface SessionUser {
  id: number
  username: string
  name: string
  role: string
}

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空')
})

// Check if user is admin
export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin'
}

/**
 * GET /oss/** — 从本地 OSS 存储中提供文件（图片/文档）
 *
 * 这是 OSS 服务层的 "检索" 端——数据库只存元信息，
 * 真实文件通过此路由按 storagePath 获取。
 */
import { ossRetrieve } from '~/server/utils/oss'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  // 从 URL 中提取 OSS 路径：/oss/2026/05/1712345678-abc.png
  const url = event.path || ''
  const ossPath = url.replace(/^\/oss\//, '')

  if (!ossPath || ossPath.includes('..')) {
    throw createError({ statusCode: 400, message: '无效的文件路径' })
  }

  // 安全检查：禁止目录穿越
  if (ossPath.includes('\\') || ossPath.includes('..') || ossPath.startsWith('/')) {
    throw createError({ statusCode: 403, message: '禁止访问' })
  }

  const result = await ossRetrieve(ossPath)
  if (!result) {
    throw createError({ statusCode: 404, message: '文件不存在' })
  }

  // 设置响应头
  setResponseHeaders(event, {
    'Content-Type': result.mimeType,
    'Content-Length': result.buffer.length.toString(),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'"
  })

  return result.buffer
})

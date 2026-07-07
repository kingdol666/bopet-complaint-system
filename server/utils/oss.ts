/**
 * 本地 OSS (Object Storage Service) 服务层
 *
 * 职责：
 *   - 将文件存储到本地磁盘（按 年/月 组织目录）
 *   - 生成唯一存储路径和访问 URL
 *   - 提供 retrieve / delete 操作
 *   - 所有对外接口通过本服务，禁止直接读写磁盘
 *
 * 数据库只存 OSS 元信息（storagePath, fileUrl, fileSize, contentHash …）
 * 真实文件通过 retrieve() 按元信息获取
 */

import { randomBytes } from 'node:crypto'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, unlink, stat } from 'node:fs/promises'
import { join, extname, dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'

// ==================== 配置 ====================

/** OSS 根目录（文件存储的物理路径，可通过环境变量 OSS_STORAGE_PATH 配置） */
const OSS_ROOT = process.env.OSS_STORAGE_PATH
  ? resolve(process.env.OSS_STORAGE_PATH)
  : join(process.cwd(), 'oss-storage')

/** 公开访问的基础 URL（Nuxt 静态资源代理） */
const PUBLIC_BASE = '/oss'

/** 允许的图片 MIME 类型 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
]

/** 允许的文档 MIME 类型 */
export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

/** 单文件最大 10 MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// ==================== 工具函数 ====================

/** 生成唯一存储文件名：{timestamp}-{random8}.{ext} */
function uniqueName(originalName: string): string {
  const ext = extname(originalName).toLowerCase() || '.bin'
  const ts = Date.now()
  const rnd = randomBytes(4).toString('hex')
  return `${ts}-${rnd}${ext}`
}

/** 按年月生成子目录：2026/05 */
function datePath(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}/${m}`
}

/** 计算文件内容的 SHA-256 */
function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

// ==================== 导出类型 ====================

export interface OssMetadata {
  /** 原始文件名 */
  originalName: string
  /** OSS 内部存储路径（相对 OSS_ROOT） */
  storagePath: string
  /** 对外公开访问 URL */
  fileUrl: string
  /** MIME 类型 */
  mimeType: string
  /** 文件大小（字节） */
  fileSize: number
  /** SHA-256 哈希（用于去重/校验） */
  contentHash: string
  /** 图片宽度（仅图片） */
  width?: number
  /** 图片高度（仅图片） */
  height?: number
}

// ==================== 核心 API ====================

/**
 * 存储文件到 OSS
 * @param buffer 文件内容
 * @param originalName 原始文件名
 * @param mimeType MIME 类型
 * @returns 元信息对象（应存入数据库）
 */
export async function ossStore(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<OssMetadata> {
  const name = uniqueName(originalName)
  const subDir = datePath()
  const storagePath = `${subDir}/${name}`
  const fullPath = join(OSS_ROOT, storagePath)

  // 确保目录存在
  await mkdir(dirname(fullPath), { recursive: true })

  // 写入文件
  await writeFile(fullPath, buffer)

  // 计算元信息
  const fileSize = buffer.length
  const contentHash = sha256(buffer)
  const fileUrl = `${PUBLIC_BASE}/${storagePath}`

  const meta: OssMetadata = {
    originalName,
    storagePath,
    fileUrl,
    mimeType,
    fileSize,
    contentHash
  }

  // 图片：尝试获取尺寸
  if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') {
    try {
      const dims = await getImageDimensions(fullPath)
      if (dims) {
        meta.width = dims.width
        meta.height = dims.height
      }
    } catch { /* 尺寸获取失败不影响存储 */ }
  }

  return meta
}

/**
 * 根据存储路径读取文件内容
 */
export async function ossRetrieve(storagePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const fullPath = join(OSS_ROOT, storagePath)
  if (!existsSync(fullPath)) return null

  const buf = await readFile(fullPath)
  const ext = extname(storagePath).toLowerCase()
  let mimeType = 'application/octet-stream'

  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.pdf': 'application/pdf',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }

  if (mimeMap[ext]) mimeType = mimeMap[ext]

  return { buffer: buf, mimeType }
}

/**
 * 删除 OSS 中的文件
 */
export async function ossDelete(storagePath: string): Promise<boolean> {
  const fullPath = join(OSS_ROOT, storagePath)
  if (!existsSync(fullPath)) return false
  await unlink(fullPath)
  return true
}

/**
 * 检查文件是否存在
 */
export function ossExists(storagePath: string): boolean {
  return existsSync(join(OSS_ROOT, storagePath))
}

/**
 * 获取文件系统路径（仅内部使用）
 */
export function ossFullPath(storagePath: string): string {
  return join(OSS_ROOT, storagePath)
}

// ==================== 辅助 ====================

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  // 纯 JS 读取 PNG/JPEG 头部获取尺寸
  try {
    const fd = await readFile(filePath)
    const buf = fd

    // PNG: 前 8 字节签名，然后 IHDR chunk 的 width/height 在偏移 16
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      const width = buf.readUInt32BE(16)
      const height = buf.readUInt32BE(20)
      return { width, height }
    }

    // JPEG: 查找 SOF0 marker (0xFF 0xC0)
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let pos = 2
      while (pos < buf.length - 9) {
        if (buf[pos] !== 0xFF) { pos++; continue }
        const marker = buf[pos + 1]
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          const height = buf.readUInt16BE(pos + 5)
          const width = buf.readUInt16BE(pos + 7)
          return { width, height }
        }
        const segLen = buf.readUInt16BE(pos + 2)
        pos += 2 + segLen
      }
    }

    // GIF: 逻辑屏幕描述符在偏移 6
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      const width = buf.readUInt16LE(6)
      const height = buf.readUInt16LE(8)
      return { width, height }
    }

    // WebP: RIFF 容器
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      if (buf.toString('ascii', 8, 12) === 'WEBP') {
        if (buf.toString('ascii', 12, 16) === 'VP8 ') {
          // Lossy WebP
          const width = buf.readUInt16LE(26) & 0x3FFF
          const height = buf.readUInt16LE(28) & 0x3FFF
          return { width, height }
        } else if (buf.toString('ascii', 12, 16) === 'VP8L') {
          // Lossless WebP
          const bits = buf.readUInt32LE(21)
          const width = (bits & 0x3FFF) + 1
          const height = ((bits >> 14) & 0x3FFF) + 1
          return { width, height }
        }
      }
    }

    return null
  } catch {
    return null
  }
}

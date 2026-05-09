import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireSessionUser } from '~/server/utils/auth'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireSessionUser(event)

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: '未选择文件' })
    }

    const file = formData[0]
    if (!file.filename) {
      throw createError({ statusCode: 400, message: '无效文件' })
    }

    // Validate file type
    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw createError({ statusCode: 400, message: `不支持的文件格式: ${mimeType}` })
    }

    // Validate file size
    if (file.data.length > MAX_SIZE) {
      throw createError({ statusCode: 400, message: '文件大小不能超过5MB' })
    }

    // Generate unique filename
    const ext = file.filename.split('.').pop() || 'bin'
    const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

    // Ensure upload directory exists
    const { mkdir } = await import('node:fs/promises')
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Write file
    const filePath = join(UPLOAD_DIR, uniqueName)
    await writeFile(filePath, file.data)

    return {
      success: true,
      data: {
        fileName: file.filename,
        fileUrl: `/uploads/${uniqueName}`,
        fileType: mimeType,
        fileSize: file.data.length
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || '文件上传失败' })
  }
})

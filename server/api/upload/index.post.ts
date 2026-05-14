/**
 * POST /api/upload — 通用文件上传（用于表单中的 upload 字段）
 *
 * 上传到 OSS，返回元信息。
 * 表单提交时携带此元信息，由 datas API 创建 DataAttachment 记录。
 */
import { requireSessionUser } from '~/server/utils/auth'
import { ossStore, ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, MAX_FILE_SIZE } from '~/server/utils/oss'

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]

export default defineEventHandler(async (event) => {
  try {
    await requireSessionUser(event)

    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: '未选择文件' })

    const file = formData[0]
    if (!file?.filename) throw createError({ statusCode: 400, message: '无效文件' })

    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw createError({ statusCode: 400, message: `不支持的文件格式: ${mimeType}` })
    }

    if (file.data.length > MAX_FILE_SIZE) {
      throw createError({ statusCode: 400, message: `文件大小超过限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)` })
    }

    // 存储到 OSS
    const meta = await ossStore(file.data, file.filename, mimeType)

    return {
      success: true,
      data: {
        fileName: meta.originalName,
        fileUrl: meta.fileUrl,
        storagePath: meta.storagePath,
        fileType: meta.mimeType,
        fileSize: meta.fileSize,
        contentHash: meta.contentHash,
        width: meta.width,
        height: meta.height
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || '文件上传失败' })
  }
})

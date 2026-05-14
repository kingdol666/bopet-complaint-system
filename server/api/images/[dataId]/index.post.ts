/**
 * POST /api/images/[dataId] — 上传图片到指定记录
 * 支持 multipart/form-data，字段名 "file"（单张）或 "files"（多张）
 */
import { prisma } from '~/server/utils/prisma'
import { requireWritePermission } from '~/server/utils/auth'
import { ossStore, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '~/server/utils/oss'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireWritePermission(event)
    const dataId = Number(getRouterParam(event, 'dataId') || '0')

    // 验证记录存在
    const record = await prisma.dataRecord.findUnique({ where: { id: dataId } })
    if (!record) throw createError({ statusCode: 404, message: '数据记录不存在' })

    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: '未选择文件' })

    const files = formData.filter(p => p.filename && (p.name === 'file' || p.name === 'files' || !p.name))

    if (!files.length) throw createError({ statusCode: 400, message: '未选择文件' })

    const results: any[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // 验证类型
        const mimeType = file.type || 'application/octet-stream'
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
          errors.push(`${file.filename}: 不支持的格式 ${mimeType}`)
          continue
        }

        // 验证大小
        if (file.data.length > MAX_FILE_SIZE) {
          errors.push(`${file.filename}: 超过大小限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)`)
          continue
        }

        // 存储到 OSS
        const meta = await ossStore(file.data, file.filename!, mimeType)

        // 写入数据库元信息
        const attachment = await prisma.dataAttachment.create({
          data: {
            dataId,
            fileName: meta.originalName,
            fileUrl: meta.fileUrl,
            storagePath: meta.storagePath,
            fileType: meta.mimeType,
            fileSize: meta.fileSize,
            contentHash: meta.contentHash,
            width: meta.width,
            height: meta.height,
            uploadedById: currentUser.id
          }
        })

        results.push({
          id: attachment.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          width: attachment.width,
          height: attachment.height
        })
      } catch (e: any) {
        errors.push(`${file.filename}: ${e.message}`)
      }
    }

    return {
      success: results.length > 0,
      data: { uploaded: results, errors },
      message: results.length > 0
        ? `成功上传 ${results.length} 张图片` + (errors.length ? `，${errors.length} 张失败` : '')
        : '上传失败: ' + errors.join('; ')
    }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || '上传失败' })
  }
})

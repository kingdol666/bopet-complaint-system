<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <n-button text @click="navigateTo('/datas')" class="hover:bg-corporate-100 rounded-lg p-2 transition-colors">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </template>
        </n-button>
        <div>
          <h1 class="page-title">{{ record?.dataNo || '记录详情' }}</h1>
          <p class="page-subtitle">查看记录详细信息</p>
        </div>
      </div>
      <div class="flex gap-3 no-print">
        <n-button @click="handlePrint">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </template>
          打印
        </n-button>
        <n-button type="primary" @click="navigateTo(`/datas/edit/${record?.id}`)">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </template>
          编辑
        </n-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <n-spin size="large" />
    </div>

    <template v-else-if="record">
      <!-- Status banner -->
      <div class="card mb-6" :class="statusBannerClass">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <n-tag :type="statusType" size="large" round>
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path v-if="record.closureStatus === 'pending'" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path v-else-if="record.closureStatus === 'processing'" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </template>
              {{ statusLabel }}
            </n-tag>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <n-tag v-for="tpl in associatedTemplates" :key="tpl.id" type="info" size="small" round>
              {{ tpl.name }}
            </n-tag>
            <n-tag v-if="associatedTemplates.length === 0" type="default" size="small" round>
              未关联模板
            </n-tag>
          </div>
        </div>
      </div>

      <!-- Template-driven display sections -->
      <div v-for="section in displaySections" :key="section.title" class="card mb-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">{{ section.title }}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <template v-for="field in section.fields" :key="field.fieldKey">
            <div
              v-if="field.fieldType === 'textarea'"
              class="field md:col-span-2 lg:col-span-4"
            >
              <label class="text-sm text-corporate-500 font-medium">{{ field.fieldLabel }}</label>
              <p class="mt-2 text-corporate-900 whitespace-pre-wrap bg-corporate-50 rounded-lg p-4">{{ field.displayValue }}</p>
            </div>
            <div v-else-if="field.fieldKey === 'closureStatus'" class="field">
              <label class="text-sm text-corporate-500 font-medium">{{ field.fieldLabel }}</label>
              <p class="mt-2">
                <n-tag :type="statusType" size="small" round>{{ statusLabel }}</n-tag>
              </p>
            </div>
            <div v-else-if="field.fieldType === 'switch'" class="field">
              <label class="text-sm text-corporate-500 font-medium">{{ field.fieldLabel }}</label>
              <p class="mt-2">
                <n-tag :type="field.displayValue === '是' ? 'success' : 'default'" size="small" round>
                  {{ field.displayValue }}
                </n-tag>
              </p>
            </div>
            <div v-else class="field">
              <label class="text-sm text-corporate-500 font-medium">{{ field.fieldLabel }}</label>
              <p class="mt-2 text-corporate-900 font-medium">{{ field.displayValue }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Audit info -->
      <div class="card">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-8 h-8 rounded-lg bg-corporate-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-corporate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">审计信息</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">创建时间</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ formatDateTime(record.createdAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">创建人</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ record.createdBy?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">更新时间</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ formatDateTime(record.updatedAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">更新人</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ record.updatedBy?.name || '-' }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(true)
const record = ref<any>(null)
const templateFields = ref<any[]>([])
const allTemplates = ref<any[]>([])

// Computed
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    closed: '已关闭'
  }
  return map[record.value?.closureStatus] || '-'
})

const statusType = computed(() => {
  const map: Record<string, 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    processing: 'info',
    closed: 'success'
  }
  return map[record.value?.closureStatus] || 'default'
})

const statusBannerClass = computed(() => {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 border-amber-200',
    processing: 'bg-blue-50 border-blue-200',
    closed: 'bg-emerald-50 border-emerald-200'
  }
  return map[record.value?.closureStatus] || ''
})

const associatedTemplates = computed(() => {
  const ids = parseTemplateIds()
  if (!ids.length) return []
  return allTemplates.value.filter(t => ids.includes(t.id))
})

// Build display sections from template fields only
const displaySections = computed(() => {
  if (!record.value) return []

  const fields = templateFields.value.length > 0
    ? [...templateFields.value].sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  if (fields.length === 0) return []

  // Group by template, one section per template
  const sectionMap = new Map<string, any[]>()
  for (const field of fields) {
    const tpl = allTemplates.value.find(t => t.id === field.templateId)
    const sectionName = tpl?.name || '其他字段'
    const displayValue = resolveDisplayValue(field, record.value)

    if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, [])
    sectionMap.get(sectionName)!.push({ ...field, displayValue })
  }

  return Array.from(sectionMap.entries()).map(([title, fields]) => ({ title, fields }))
})

function parseTemplateIds(): number[] {
  if (!record.value?.templateIds) return []
  try {
    return typeof record.value.templateIds === 'string'
      ? JSON.parse(record.value.templateIds)
      : record.value.templateIds
  } catch {
    return []
  }
}

function parseTemplateData(): Record<string, any> {
  if (!record.value?.templateData) return {}
  try {
    return typeof record.value.templateData === 'string'
      ? JSON.parse(record.value.templateData)
      : record.value.templateData
  } catch {
    return {}
  }
}

function resolveDisplayValue(field: any, rec: any): string {
  // Get value from record column or templateData
  let value = rec[field.fieldKey]
  if (value === null || value === undefined) {
    const data = parseTemplateData()
    value = data[field.fieldKey]
  }

  if (value === null || value === undefined || value === '') return '-'

  // FK name resolution
  const fkMap: Record<string, any> = {
    customerId: rec.customer?.name,
    productModelId: rec.productModel?.name,
    productionLineId: rec.productionLine?.name,
    responsibleDeptId: rec.responsibleDept?.name,
    responsibleProcessId: rec.responsibleProcess?.name
  }
  if (fkMap[field.fieldKey]) return fkMap[field.fieldKey]

  // Type-based formatting
  if (field.fieldType === 'date') {
    return value ? dayjs(typeof value === 'number' ? value : new Date(value)).format('YYYY-MM-DD') : '-'
  }
  if (field.fieldType === 'switch') {
    return value ? '是' : '否'
  }
  if (field.fieldKey === 'closureStatus') {
    return statusLabel.value
  }
  if (field.fieldType === 'upload' || field.fieldKey === 'attachments') {
    const attachments = rec.attachments || []
    if (attachments.length === 0) return '无附件'
    return attachments.map((a: any) => a.fileName).join(', ')
  }

  return String(value)
}

// Load data
onMounted(async () => {
  const id = route.params.id
  if (!id) {
    message.error('无效的ID')
    router.push('/datas')
    return
  }

  try {
    const [recordResp, templatesResp] = await Promise.all([
      $fetch<any>('/api/datas/' + id),
      $fetch<any>('/api/templates')
    ])

    if (recordResp.success) {
      record.value = recordResp.data
    }

    if (templatesResp.success) {
      allTemplates.value = templatesResp.data
    }

    // Load template field definitions for associated templates
    const ids = parseTemplateIds()
    if (ids.length > 0) {
      const fieldResults = await Promise.all(
        ids.map(tid => $fetch<any>('/api/templates/' + tid))
      )
      const allFields: any[] = []
      const seenKeys = new Set<string>()
      for (const resp of fieldResults) {
        if (resp.success && resp.data.fields) {
          for (const f of resp.data.fields) {
            if (!seenKeys.has(f.fieldKey)) {
              seenKeys.add(f.fieldKey)
              allFields.push(f)
            }
          }
        }
      }
      allFields.sort((a, b) => a.sortOrder - b.sortOrder)
      templateFields.value = allFields
    }
  } catch (e) {
    message.error('加载失败')
    router.push('/datas')
  } finally {
    loading.value = false
  }
})

function formatDateTime(date: string | Date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function formatPrintValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function handlePrint() {
  if (!record.value) {
    message.warning('当前没有可打印的记录信息')
    return
  }

  const current = record.value
  const sections = displaySections.value.map(section => {
    const rows: Array<[string, unknown, string?, unknown?]> = []
    const nonTextareaFields = section.fields.filter(f => f.fieldType !== 'textarea')
    for (let i = 0; i < nonTextareaFields.length; i += 2) {
      rows.push([
        nonTextareaFields[i].fieldLabel,
        nonTextareaFields[i].displayValue,
        nonTextareaFields[i + 1]?.fieldLabel,
        nonTextareaFields[i + 1]?.displayValue
      ])
    }
    const textareaFields = section.fields.filter(f => f.fieldType === 'textarea')
    for (const f of textareaFields) {
      rows.push([f.fieldLabel, f.displayValue])
    }
    return renderPrintTable(section.title, rows)
  }).join('')

  const auditSection = renderPrintTable('审计信息', [
    ['创建时间', formatDateTime(current.createdAt), '创建人', current.createdBy?.name],
    ['更新时间', formatDateTime(current.updatedAt), '更新人', current.updatedBy?.name]
  ])

  const printHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(current.dataNo || '记录详情打印')}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #0f172a; font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 12px; line-height: 1.5; }
          .print-header { margin-bottom: 16px; }
          .print-header h1 { margin: 0 0 4px; font-size: 24px; }
          .print-meta { color: #475569; font-size: 12px; }
          .print-section { margin-bottom: 16px; break-inside: avoid; }
          .print-section h2 { margin: 0 0 8px; padding-left: 8px; border-left: 4px solid #2563eb; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; text-align: left; word-break: break-word; }
          th { width: 15%; background: #f8fafc; font-weight: 600; color: #334155; }
          td { width: 35%; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${escapeHtml(current.dataNo || '记录详情')}</h1>
          <div class="print-meta">打印时间：${escapeHtml(formatDateTime(new Date()))}</div>
        </div>
        ${sections}${auditSection}
      </body>
    </html>
  `

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'

  const cleanup = () => { window.setTimeout(() => { iframe.remove() }, 300) }

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) { message.error('打印内容渲染失败'); cleanup(); return }
    const finish = () => { frameWindow.removeEventListener('afterprint', finish); cleanup() }
    frameWindow.addEventListener('afterprint', finish)
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(finish, 1000)
  }

  document.body.appendChild(iframe)
  iframe.srcdoc = printHtml
}

function renderPrintTable(
  title: string,
  rows: Array<[string, unknown, string?, unknown?]>
) {
  const body = rows.map(([label1, value1, label2, value2]) => `
    <tr>
      <th>${escapeHtml(label1)}</th>
      <td>${escapeHtml(formatPrintValue(value1)).replace(/\n/g, '<br />')}</td>
      ${label2 ? `<th>${escapeHtml(label2)}</th><td>${escapeHtml(formatPrintValue(value2)).replace(/\n/g, '<br />')}</td>` : '<th></th><td></td>'}
    </tr>
  `).join('')

  return `
    <section class="print-section">
      <h2>${escapeHtml(title)}</h2>
      <table><tbody>${body}</tbody></table>
    </section>
  `
}
</script>

<style scoped>
.field label {
  display: block;
}
</style>

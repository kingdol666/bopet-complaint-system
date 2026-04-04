<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <n-button text @click="navigateTo('/complaints')" class="hover:bg-corporate-100 rounded-lg p-2 transition-colors">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </template>
        </n-button>
        <div>
          <h1 class="page-title">{{ complaint?.complaintNo || '客诉详情' }}</h1>
          <p class="page-subtitle">查看客诉详细信息</p>
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
        <n-button type="primary" @click="navigateTo(`/complaints/edit/${complaint?.id}`)">
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

    <template v-else-if="complaint">
      <!-- Status banner -->
      <div class="card mb-6" :class="statusBannerClass">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <n-tag :type="statusType" size="large" round>
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path v-if="complaint.closureStatus === 'pending'" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path v-else-if="complaint.closureStatus === 'processing'" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </template>
              {{ statusLabel }}
            </n-tag>
            <span v-if="complaint.repeatedIssue" class="inline-flex items-center gap-1 text-amber-600 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              重复问题
            </span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <n-tag v-for="tpl in associatedTemplates" :key="tpl.id" :type="tpl.isDefault ? 'default' : 'info'" size="small" round>
              {{ tpl.name }}
            </n-tag>
            <n-tag v-if="complaint.severityLevel" :color="{ color: complaint.severityLevel.color + '20', textColor: complaint.severityLevel.color }" round>
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </template>
              {{ complaint.severityLevel.name }}
            </n-tag>
          </div>
        </div>
      </div>

      <!-- Dynamic template sections -->
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
            <div v-else-if="field.fieldKey === 'severityLevelId' && complaint.severityLevel" class="field">
              <label class="text-sm text-corporate-500 font-medium">{{ field.fieldLabel }}</label>
              <p class="mt-2">
                <n-tag :color="{ color: complaint.severityLevel.color + '20', textColor: complaint.severityLevel.color }" size="small" round>
                  {{ complaint.severityLevel.name }}
                </n-tag>
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
            <p class="mt-2 text-corporate-900 font-medium">{{ formatDateTime(complaint.createdAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">创建人</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ complaint.createdBy?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">更新时间</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ formatDateTime(complaint.updatedAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-corporate-500 font-medium">更新人</label>
            <p class="mt-2 text-corporate-900 font-medium">{{ complaint.updatedBy?.name || '-' }}</p>
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
const complaint = ref<any>(null)
const templateFields = ref<any[]>([])
const allTemplates = ref<any[]>([])

// Section mapping for standard fields
const SECTION_MAP: Record<string, string> = {
  feedbackDate: '基础信息',
  productionTime: '基础信息',
  customerId: '基础信息',
  productModelId: '基础信息',
  thickness: '基础信息',
  rollNo: '基础信息',
  quantityInvolved: '基础信息',
  application: '基础信息',
  productionLineId: '基础信息',
  shiftTeam: '基础信息',
  machineNo: '基础信息',
  batchNo: '基础信息',
  feedbackContent: '客诉内容',
  customerComplaintText: '客诉内容',
  internalComplaintName: '客诉内容',
  problemCategoryId: '客诉内容',
  problemSubcategoryId: '客诉内容',
  severityLevelId: '客诉内容',
  repeatedIssue: '客诉内容',
  customerDemandId: '诉求与处置',
  compensationTypeId: '诉求与处置',
  closureStatus: '诉求与处置',
  responsibleDeptId: '诉求与处置',
  responsibleProcessId: '诉求与处置',
  disposalResult: '诉求与处置',
  rootCauseAnalysis: '原因与改善',
  correctiveAction: '原因与改善',
  lessonsLearned: '原因与改善',
  reviewConclusion: '原因与改善',
  standardizedAction: '原因与改善',
  remark: '原因与改善'
}

// Standard field keys
const STANDARD_FIELD_KEYS = new Set(Object.keys(SECTION_MAP))

// Section display order
const SECTION_ORDER = ['基础信息', '客诉内容', '诉求与处置', '原因与改善', '附加信息']

// Computed properties
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '待分析',
    processing: '处理中',
    closed: '已结案'
  }
  return map[complaint.value?.closureStatus] || '-'
})

const statusType = computed(() => {
  const map: Record<string, 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    processing: 'info',
    closed: 'success'
  }
  return map[complaint.value?.closureStatus] || 'default'
})

const statusBannerClass = computed(() => {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 border-amber-200',
    processing: 'bg-blue-50 border-blue-200',
    closed: 'bg-emerald-50 border-emerald-200'
  }
  return map[complaint.value?.closureStatus] || ''
})

// Associated templates
const associatedTemplates = computed(() => {
  const ids = parseTemplateIds()
  if (!ids.length) return []
  return allTemplates.value.filter(t => ids.includes(t.id))
})

// Build display sections from template fields + complaint data
const displaySections = computed(() => {
  if (!complaint.value) return []

  const fields = templateFields.value.length > 0
    ? templateFields.value
    : buildFallbackFields()

  // Group fields into sections
  const sectionMap = new Map<string, any[]>()

  for (const field of fields) {
    const sectionName = SECTION_MAP[field.fieldKey] || '附加信息'
    const displayValue = resolveDisplayValue(field, complaint.value)

    if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, [])
    sectionMap.get(sectionName)!.push({
      ...field,
      displayValue
    })
  }

  // Sort sections by defined order
  return SECTION_ORDER
    .filter(name => sectionMap.has(name))
    .map(name => ({ title: name, fields: sectionMap.get(name)! }))
})

// Parse template IDs from complaint
function parseTemplateIds(): number[] {
  if (!complaint.value?.templateIds) return []
  try {
    return typeof complaint.value.templateIds === 'string'
      ? JSON.parse(complaint.value.templateIds)
      : complaint.value.templateIds
  } catch {
    return []
  }
}

// Parse templateData from complaint
function parseTemplateData(): Record<string, any> {
  if (!complaint.value?.templateData) return {}
  try {
    return typeof complaint.value.templateData === 'string'
      ? JSON.parse(complaint.value.templateData)
      : complaint.value.templateData
  } catch {
    return {}
  }
}

// Resolve display value for a field
function resolveDisplayValue(field: any, record: any): string {
  // Get value: first try standard column, then templateData
  let value = record[field.fieldKey]
  if ((value === null || value === undefined) && !STANDARD_FIELD_KEYS.has(field.fieldKey)) {
    const data = parseTemplateData()
    value = data[field.fieldKey]
  }

  if (value === null || value === undefined || value === '') return '-'

  // Resolve relation-based fields
  const relationMap: Record<string, any> = {
    customerId: record.customer?.name,
    productModelId: record.productModel?.name,
    productionLineId: record.productionLine?.name,
    problemCategoryId: record.problemCategory?.name,
    problemSubcategoryId: record.problemSubcategory?.name,
    severityLevelId: record.severityLevel?.name,
    customerDemandId: record.customerDemand?.name,
    compensationTypeId: record.compensationType?.name,
    responsibleDeptId: record.responsibleDept?.name,
    responsibleProcessId: record.responsibleProcess?.name
  }

  if (relationMap[field.fieldKey]) return relationMap[field.fieldKey]

  // Type-based formatting
  if (field.fieldType === 'date') {
    return value ? dayjs(typeof value === 'number' ? value : new Date(value)).format('YYYY-MM-DD') : '-'
  }
  if (field.fieldType === 'switch') {
    return value ? '是' : '否'
  }
  if (field.fieldKey === 'closureStatus') {
    const map: Record<string, string> = { pending: '待分析', processing: '处理中', closed: '已结案' }
    return map[value] || value
  }

  return String(value)
}

// Build fallback fields when no template is loaded
function buildFallbackFields() {
  const fields: any[] = []
  const standardFieldLabels: Record<string, string> = {
    feedbackDate: '反馈日期', productionTime: '生产时间', customerId: '客户',
    productModelId: '产品型号', thickness: '厚度', rollNo: '轴号',
    quantityInvolved: '涉及数量', application: '用途', productionLineId: '产线',
    shiftTeam: '班组', machineNo: '机台', batchNo: '批次号',
    feedbackContent: '反馈内容', customerComplaintText: '客户投诉描述',
    internalComplaintName: '内部问题名称', problemCategoryId: '问题大类',
    problemSubcategoryId: '问题小类', severityLevelId: '严重等级',
    repeatedIssue: '是否重复', customerDemandId: '客户诉求',
    compensationTypeId: '赔偿方式', closureStatus: '闭环状态',
    responsibleDeptId: '责任部门', responsibleProcessId: '责任工序',
    disposalResult: '处置结果', rootCauseAnalysis: '问题分析',
    correctiveAction: '改善措施', lessonsLearned: '启示',
    reviewConclusion: '复盘结论', standardizedAction: '标准化措施', remark: '备注'
  }

  for (const [key, label] of Object.entries(standardFieldLabels)) {
    const isTextarea = ['feedbackContent', 'customerComplaintText', 'disposalResult',
      'rootCauseAnalysis', 'correctiveAction', 'lessonsLearned', 'reviewConclusion', 'remark'].includes(key)
    const isSwitch = ['repeatedIssue', 'standardizedAction'].includes(key)
    const isDate = ['feedbackDate', 'productionTime'].includes(key)
    fields.push({
      fieldKey: key,
      fieldLabel: label,
      fieldType: isTextarea ? 'textarea' : isSwitch ? 'switch' : isDate ? 'date' : 'text'
    })
  }
  return fields
}

// Load data
onMounted(async () => {
  const id = route.params.id
  if (!id) {
    message.error('无效的ID')
    router.push('/complaints')
    return
  }

  try {
    // Load complaint and templates in parallel
    const [complaintResp, templatesResp] = await Promise.all([
      $fetch(`/api/complaints/${id}`) as Promise<any>,
      $fetch('/api/templates') as Promise<any>
    ])

    if (complaintResp.success) {
      complaint.value = complaintResp.data
    }

    if (templatesResp.success) {
      allTemplates.value = templatesResp.data
    }

    // Load template field definitions for this complaint's templates
    const ids = parseTemplateIds()
    if (ids.length > 0) {
      const fieldResults = await Promise.all(
        ids.map(tid => $fetch(`/api/templates/${tid}`) as Promise<any>)
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
    router.push('/complaints')
  } finally {
    loading.value = false
  }
})

// Helper functions
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
  if (!complaint.value) {
    message.warning('当前没有可打印的客诉信息')
    return
  }

  const current = complaint.value
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

  // Audit section
  sections + renderPrintTable('审计信息', [
    ['创建时间', formatDateTime(current.createdAt), '创建人', current.createdBy?.name],
    ['更新时间', formatDateTime(current.updatedAt), '更新人', current.updatedBy?.name]
  ])

  const printHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(current.complaintNo || '客诉详情打印')}</title>
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
          <h1>${escapeHtml(current.complaintNo || '客诉详情')}</h1>
          <div class="print-meta">打印时间：${escapeHtml(formatDateTime(new Date()))}</div>
        </div>
        ${sections}
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

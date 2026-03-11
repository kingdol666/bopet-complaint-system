<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center">
        <n-button text @click="navigateTo('/complaints')" class="mr-4">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </template>
        </n-button>
        <h1 class="page-title mb-0">{{ complaint?.complaintNo || '客诉详情' }}</h1>
      </div>
      <div class="flex space-x-3 no-print">
        <n-button @click="handlePrint">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </template>
          打印
        </n-button>
        <n-button type="primary" @click="navigateTo(`/complaints/edit/${complaint?.id}`)">
          编辑
        </n-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <template v-else-if="complaint">
      <!-- Status banner -->
      <div class="card mb-6" :class="statusBannerClass">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <n-tag :type="statusType" size="large">
              {{ statusLabel }}
            </n-tag>
            <span v-if="complaint.repeatedIssue" class="text-orange-600 text-sm">
              ⚠ 重复问题
            </span>
          </div>
          <n-tag v-if="complaint.severityLevel" :color="{ color: complaint.severityLevel.color + '20', textColor: complaint.severityLevel.color }">
            {{ complaint.severityLevel.name }}
          </n-tag>
        </div>
      </div>

      <!-- Basic info -->
      <div class="card mb-6">
        <h2 class="section-title">基础信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="field">
            <label class="text-sm text-industrial-500">反馈日期</label>
            <p class="font-medium">{{ formatDate(complaint.feedbackDate) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">生产时间</label>
            <p class="font-medium">{{ formatDate(complaint.productionTime) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">客户</label>
            <p class="font-medium">{{ complaint.customer?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">产品型号</label>
            <p class="font-medium">{{ complaint.productModel?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">厚度</label>
            <p class="font-medium">{{ complaint.thickness || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">轴号</label>
            <p class="font-medium">{{ complaint.rollNo || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">涉及数量</label>
            <p class="font-medium">{{ complaint.quantityInvolved || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">用途</label>
            <p class="font-medium">{{ complaint.application || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">产线</label>
            <p class="font-medium">{{ complaint.productionLine?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">班组</label>
            <p class="font-medium">{{ complaint.shiftTeam || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">机台</label>
            <p class="font-medium">{{ complaint.machineNo || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">批次号</label>
            <p class="font-medium">{{ complaint.batchNo || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Complaint content -->
      <div class="card mb-6">
        <h2 class="section-title">客诉内容</h2>
        <div class="space-y-4">
          <div class="field">
            <label class="text-sm text-industrial-500">反馈内容</label>
            <p class="mt-1">{{ complaint.feedbackContent || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">客户投诉描述</label>
            <p class="mt-1 bg-yellow-50 p-3 rounded">{{ complaint.customerComplaintText || '-' }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">内部问题名称</label>
              <p class="font-medium">{{ complaint.internalComplaintName || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">问题大类</label>
              <p class="font-medium">{{ complaint.problemCategory?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">问题小类</label>
              <p class="font-medium">{{ complaint.problemSubcategory?.name || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Disposal -->
      <div class="card mb-6">
        <h2 class="section-title">诉求与处置</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">客户诉求</label>
              <p class="font-medium">{{ complaint.customerDemand?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">赔偿方式</label>
              <p class="font-medium">{{ complaint.compensationType?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">闭环状态</label>
              <p class="font-medium">
                <n-tag :type="statusType" size="small">{{ statusLabel }}</n-tag>
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">责任部门</label>
              <p class="font-medium">{{ complaint.responsibleDept?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">责任工序</label>
              <p class="font-medium">{{ complaint.responsibleProcess?.name || '-' }}</p>
            </div>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">处置结果</label>
            <p class="mt-1">{{ complaint.disposalResult || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Analysis -->
      <div class="card mb-6">
        <h2 class="section-title">原因与改善</h2>
        <div class="space-y-4">
          <div class="field">
            <label class="text-sm text-industrial-500">问题分析</label>
            <p class="mt-1">{{ complaint.rootCauseAnalysis || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">改善措施</label>
            <p class="mt-1">{{ complaint.correctiveAction || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">启示</label>
            <p class="mt-1">{{ complaint.lessonsLearned || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">复盘结论</label>
            <p class="mt-1">{{ complaint.reviewConclusion || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">标准化措施</label>
            <p class="mt-1">
              <n-tag :type="complaint.standardizedAction ? 'success' : 'default'" size="small">
                {{ complaint.standardizedAction ? '是' : '否' }}
              </n-tag>
            </p>
          </div>
        </div>
      </div>

      <!-- Audit info -->
      <div class="card">
        <h2 class="section-title">审计信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="field">
            <label class="text-sm text-industrial-500">创建时间</label>
            <p class="font-medium">{{ formatDateTime(complaint.createdAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">创建人</label>
            <p class="font-medium">{{ complaint.createdBy?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">更新时间</label>
            <p class="font-medium">{{ formatDateTime(complaint.updatedAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">更新人</label>
            <p class="font-medium">{{ complaint.updatedBy?.name || '-' }}</p>
          </div>
          <div v-if="complaint.remark" class="field md:col-span-2 lg:col-span-4">
            <label class="text-sm text-industrial-500">备注</label>
            <p class="mt-1">{{ complaint.remark }}</p>
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
    pending: 'bg-yellow-50 border-yellow-200',
    processing: 'bg-blue-50 border-blue-200',
    closed: 'bg-green-50 border-green-200'
  }
  return map[complaint.value?.closureStatus] || ''
})

// Load data
onMounted(async () => {
  const id = route.params.id
  if (!id) {
    message.error('无效的ID')
    router.push('/complaints')
    return
  }

  try {
    const response = await $fetch(`/api/complaints/${id}`)
    if (response.success) {
      complaint.value = response.data
    }
  } catch (e) {
    message.error('加载失败')
    router.push('/complaints')
  } finally {
    loading.value = false
  }
})

// Helper functions
function formatDate(date: string | Date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

function formatDateTime(date: string | Date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function formatPrintValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

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

function renderPrintTable(
  title: string,
  rows: Array<[string, unknown, string?, unknown?]>
) {
  const body = rows.map(([label1, value1, label2, value2]) => `
    <tr>
      <th>${escapeHtml(label1)}</th>
      <td>${escapeHtml(formatPrintValue(value1)).replace(/\n/g, '<br />')}</td>
      ${label2
        ? `<th>${escapeHtml(label2)}</th><td>${escapeHtml(formatPrintValue(value2)).replace(/\n/g, '<br />')}</td>`
        : '<th></th><td></td>'}
    </tr>
  `).join('')

  return `
    <section class="print-section">
      <h2>${escapeHtml(title)}</h2>
      <table>
        <tbody>
          ${body}
        </tbody>
      </table>
    </section>
  `
}

function handlePrint() {
  if (!complaint.value) {
    message.warning('当前没有可打印的客诉信息')
    return
  }

  const current = complaint.value

  const sections = [
    renderPrintTable('基础信息', [
      ['客诉编号', current.complaintNo, '反馈日期', formatDate(current.feedbackDate)],
      ['生产时间', formatDate(current.productionTime), '客户', current.customer?.name],
      ['产品型号', current.productModel?.name, '厚度', current.thickness],
      ['轴号', current.rollNo, '涉及数量', current.quantityInvolved],
      ['用途', current.application, '产线', current.productionLine?.name],
      ['班组', current.shiftTeam, '机台', current.machineNo],
      ['批次号', current.batchNo]
    ]),
    renderPrintTable('客诉内容', [
      ['反馈内容', current.feedbackContent, '客户投诉描述', current.customerComplaintText],
      ['内部问题名称', current.internalComplaintName, '问题大类', current.problemCategory?.name],
      ['问题小类', current.problemSubcategory?.name, '严重等级', current.severityLevel?.name],
      ['重复问题', current.repeatedIssue]
    ]),
    renderPrintTable('诉求与处置', [
      ['客户诉求', current.customerDemand?.name, '赔偿方式', current.compensationType?.name],
      ['闭环状态', statusLabel.value, '责任部门', current.responsibleDept?.name],
      ['责任工序', current.responsibleProcess?.name, '处置结果', current.disposalResult]
    ]),
    renderPrintTable('原因与改善', [
      ['问题分析', current.rootCauseAnalysis, '改善措施', current.correctiveAction],
      ['启示', current.lessonsLearned, '复盘结论', current.reviewConclusion],
      ['标准化措施', current.standardizedAction, '备注', current.remark]
    ]),
    renderPrintTable('审计信息', [
      ['创建时间', formatDateTime(current.createdAt), '创建人', current.createdBy?.name],
      ['更新时间', formatDateTime(current.updatedAt), '更新人', current.updatedBy?.name]
    ])
  ].join('')

  const printHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(current.complaintNo || '客诉详情打印')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #0f172a;
            font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }

          .print-header {
            margin-bottom: 16px;
          }

          .print-header h1 {
            margin: 0 0 4px;
            font-size: 24px;
          }

          .print-meta {
            color: #475569;
            font-size: 12px;
          }

          .print-section {
            margin-bottom: 16px;
            break-inside: avoid;
          }

          .print-section h2 {
            margin: 0 0 8px;
            padding-left: 8px;
            border-left: 4px solid #2563eb;
            font-size: 16px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            text-align: left;
            word-break: break-word;
          }

          th {
            width: 15%;
            background: #f8fafc;
            font-weight: 600;
            color: #334155;
          }

          td {
            width: 35%;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${escapeHtml(current.complaintNo || '客诉详情')}</h1>
          <div class="print-meta">
            打印时间：${escapeHtml(formatDateTime(new Date()))}
          </div>
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

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove()
    }, 300)
  }

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow

    if (!frameWindow) {
      message.error('打印内容渲染失败')
      cleanup()
      return
    }

    const finish = () => {
      frameWindow.removeEventListener('afterprint', finish)
      cleanup()
    }

    frameWindow.addEventListener('afterprint', finish)
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(finish, 1000)
  }

  document.body.appendChild(iframe)
  iframe.srcdoc = printHtml
}
</script>

<style scoped>
.field label {
  display: block;
  margin-bottom: 4px;
}
</style>

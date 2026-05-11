<template>
  <div class="animate-fade-in">
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/datas')" class="hover:bg-corporate-100 rounded-lg p-2">
        <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg></template>
      </n-button>
      <div>
        <h1 class="page-title">批量导入数据</h1>
        <p class="page-subtitle">上传Excel文件，选择目标模板，系统自动识别表头并导入</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Upload + Template -->
      <div class="card">
        <h3 class="section-title">1. 上传文件</h3>
        <div class="border-2 border-dashed border-corporate-200 rounded-lg p-6 text-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-corporate-300 mx-auto mb-2" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <n-upload :multiple="false" accept=".xlsx,.xls" :custom-request="handleFileUpload" :show-file-list="false">
            <n-button type="primary">选择Excel文件</n-button>
          </n-upload>
          <p v-if="fileName" class="text-sm text-primary-600 mt-2">{{ fileName }} ({{ previewRows }}行数据)</p>
        </div>

        <h3 class="section-title">2. 选择模板</h3>
        <n-select v-model:value="selectedTemplateId" :options="templateOptions" placeholder="选择目标模板" filterable />
        <p class="text-sm text-corporate-400 mt-2">系统将使用原始表头作为模板，无需手动映射列</p>
      </div>

      <!-- Right: Data Preview -->
      <div class="card">
        <h3 class="section-title">数据预览（前5行）</h3>
        <div v-if="fileHeaders.length && previewData.length">
          <n-data-table :columns="previewCols" :data="previewData" size="small" :max-height="400" />
        </div>
        <div v-else class="text-center py-8 text-corporate-400">请先上传文件</div>
      </div>
    </div>

    <!-- Import button -->
    <div v-if="fileHeaders.length && selectedTemplateId" class="flex justify-end mt-6">
      <n-button type="primary" size="large" :loading="importing" @click="handleImport">
        确认导入 ({{ previewRows }} 条数据)
      </n-button>
    </div>

    <!-- Result -->
    <div v-if="importResult" class="card mt-6">
      <h3 class="section-title">导入结果</h3>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="bg-green-50 rounded p-3 text-center">
          <p class="text-2xl font-bold text-green-600">{{ importResult.successCount }}</p>
          <p class="text-sm text-green-500">成功</p>
        </div>
        <div class="bg-red-50 rounded p-3 text-center">
          <p class="text-2xl font-bold text-red-600">{{ importResult.errorCount }}</p>
          <p class="text-sm text-red-500">失败</p>
        </div>
        <div class="bg-blue-50 rounded p-3 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ importResult.total }}</p>
          <p class="text-sm text-blue-500">总计</p>
        </div>
      </div>
      <div v-if="importResult.errors?.length" class="mt-4">
        <p class="text-sm font-medium text-red-600 mb-2">错误详情:</p>
        <n-data-table :columns="errorCols" :data="importResult.errors.slice(0, 20)" size="small" />
      </div>
      <div class="flex justify-end mt-4"><n-button type="primary" @click="navigateTo('/datas')">返回数据列表</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import type { UploadCustomRequestOptions } from 'naive-ui'

const authStore = useAuthStore()
const message = useMessage()

const fileName = ref('')
const fileHeaders = ref<string[]>([])
const previewRows = ref(0)
const selectedTemplateId = ref<number | null>(null)
const templates = ref<any[]>([])
const fileData = ref<{ headers: string[]; rows: any[][] } | null>(null)
const importing = ref(false)
const importResult = ref<any>(null)

const templateOptions = computed(() => templates.value.map(t => ({ label: t.name, value: t.id })))
const errorCols = [{ title: '行号', key: 'row', width: 70 }, { title: '错误', key: 'message' }]

const previewCols = computed(() =>
  fileHeaders.value.map(h => ({ title: h, key: h, ellipsis: { tooltip: true }, width: 150 }))
)

const previewData = computed(() => {
  if (!fileData.value) return []
  return fileData.value.rows.slice(0, 5).map(row => {
    const obj: Record<string, any> = {}
    fileHeaders.value.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
})

async function handleFileUpload(opts: UploadCustomRequestOptions) {
  const rawFile: globalThis.File = (opts.file as any).file
  if (!rawFile) { message.error('无法读取文件'); opts.onError(); return }
  try {
    const XLSX = await import('xlsx')
    const buf = await rawFile.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'buffer' })
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }) as any[][]
    if (data.length <= 1) { message.error('文件中没有数据行'); opts.onError(); return }

    const headers = data[0].map((h: any) => String(h || '').trim())
    const rows = data.slice(1)

    fileName.value = rawFile.name
    fileHeaders.value = headers
    previewRows.value = rows.length
    fileData.value = { headers, rows }
    importResult.value = null

    message.success(`解析完成: ${rows.length}行, ${headers.length}列`)
    opts.onFinish()
  } catch (e: any) {
    message.error('解析失败: ' + e.message)
    opts.onError()
  }
}

async function handleImport() {
  if (!fileData.value) { message.error('未选择文件'); return }
  if (!selectedTemplateId.value) { message.error('未选择模板'); return }

  importing.value = true
  try {
    const csvContent = fileData.value.headers.join(',') + '\n' +
      fileData.value.rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })

    const fd = new FormData()
    fd.append('file', blob, fileName.value || 'data.csv')
    fd.append('templateId', String(selectedTemplateId.value))

    const resp = await $fetch('/api/datas/import-to-template', {
      method: 'POST',
      body: fd,
      headers: authStore.getAuthHeaders()
    }) as any

    if (resp.success) {
      importResult.value = resp.data
      message.success(resp.message)
    }
  } catch (e: any) {
    message.error(e.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  try {
    const resp = await $fetch('/api/templates') as any
    if (resp.success) templates.value = resp.data
  } catch (e) { console.error(e) }
})
</script>

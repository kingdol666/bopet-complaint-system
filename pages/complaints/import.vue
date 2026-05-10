<template>
  <div class="animate-fade-in">
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/complaints')" class="hover:bg-corporate-100 rounded-lg p-2">
        <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></template>
      </n-button>
      <div><h1 class="page-title">导入数据到模板</h1><p class="page-subtitle">上传Excel/CSV文件，选择目标模板，系统自动匹配列并导入</p></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Upload + Template -->
      <div class="card">
        <h3 class="section-title">1. 上传文件</h3>
        <div class="border-2 border-dashed border-corporate-200 rounded-lg p-6 text-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-corporate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <n-upload :multiple="false" accept=".xlsx,.xls,.csv" :custom-request="handleFileUpload" :show-file-list="false">
            <n-button type="primary">选择文件</n-button>
          </n-upload>
          <p v-if="fileName" class="text-sm text-primary-600 mt-2">{{ fileName }} ({{ previewRows }}行, {{ previewColCount }}列)</p>
        </div>

        <h3 class="section-title">2. 选择模板</h3>
        <n-select v-model:value="selectedTemplateId" :options="templateOptions" placeholder="选择目标模板" filterable @update:value="handleTemplateSelect" />
        <p v-if="selectedTemplateId && templateFields.length" class="text-sm text-corporate-500 mt-2">{{ templateFields.length }} 个模板字段</p>
      </div>

      <!-- Right: Column mapping -->
      <div class="lg:col-span-2 card">
        <h3 class="section-title">3. 列映射</h3>
        <p class="text-sm text-corporate-400 mb-4">将文件中的列映射到模板字段</p>

        <div v-if="fileHeaders.length && templateFields.length" class="space-y-3 max-h-[500px] overflow-y-auto">
          <div v-for="tf in templateFields" :key="tf.fieldKey" class="flex items-center gap-3 p-2 rounded-lg hover:bg-corporate-50">
            <span class="text-sm font-medium w-32 shrink-0 truncate" :title="tf.fieldLabel">{{ tf.fieldLabel }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-corporate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            <n-select
              v-model:value="columnMap[tf.fieldKey]"
              :options="fileHeaderOptions"
              placeholder="选择文件列"
              clearable
              filterable
              style="flex:1"
            />
            <n-tag v-if="autoMatched[tf.fieldKey]" type="success" size="tiny">自动</n-tag>
          </div>
        </div>
        <div v-else-if="!fileHeaders.length" class="text-center py-8 text-corporate-400">请先上传文件</div>
        <div v-else class="text-center py-8 text-corporate-400">请先选择模板</div>
      </div>
    </div>

    <!-- Data Preview -->
    <div v-if="fileHeaders.length && previewData.length" class="card mt-6">
      <h3 class="section-title">数据预览（前5行）</h3>
      <n-data-table :columns="previewCols" :data="previewData" size="small" :max-height="300" />
    </div>

    <!-- Import button -->
    <div v-if="fileHeaders.length && selectedTemplateId" class="flex justify-end mt-6 gap-2">
      <n-button size="large" @click="handleAutoMap">自动匹配列</n-button>
      <n-button type="primary" size="large" :loading="importing" @click="handleImport">
        确认导入 ({{ previewRows }} 条数据)
      </n-button>
    </div>

    <!-- Result -->
    <div v-if="importResult" class="card mt-6">
      <h3 class="section-title">导入结果</h3>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="bg-green-50 rounded p-3 text-center"><p class="text-2xl font-bold text-green-600">{{ importResult.successCount }}</p><p class="text-sm text-green-500">成功</p></div>
        <div class="bg-red-50 rounded p-3 text-center"><p class="text-2xl font-bold text-red-600">{{ importResult.errorCount }}</p><p class="text-sm text-red-500">失败</p></div>
        <div class="bg-blue-50 rounded p-3 text-center"><p class="text-2xl font-bold text-blue-600">{{ importResult.total }}</p><p class="text-sm text-blue-500">总计</p></div>
      </div>
      <div v-if="importResult.errors?.length" class="mt-4">
        <p class="text-sm font-medium text-red-600 mb-2">错误详情:</p>
        <n-data-table :columns="errorCols" :data="importResult.errors.slice(0, 20)" size="small" />
      </div>
      <div class="flex justify-end mt-4"><n-button type="primary" @click="navigateTo('/complaints')">返回客诉列表</n-button></div>
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
const previewColCount = ref(0)
const selectedTemplateId = ref<number | null>(null)
const templates = ref<any[]>([])
const templateFields = ref<any[]>([])
const columnMap = reactive<Record<string, string | null>>({})
const autoMatched = reactive<Record<string, boolean>>({})
const fileData = ref<{ headers: string[]; rows: any[][] } | null>(null)
const rawFileRef = ref<globalThis.File | null>(null)
const importing = ref(false)
const importResult = ref<any>(null)

const templateOptions = computed(() => templates.value.map(t => ({ label: t.name, value: t.id })))
const fileHeaderOptions = computed(() => fileHeaders.value.map(h => ({ label: h, value: h })))
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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        current += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += ch
        i++
      }
    }
  }
  result.push(current.trim())
  return result
}

async function handleFileUpload(opts: UploadCustomRequestOptions) {
  const rawFile: globalThis.File = (opts.file as any).file
  if (!rawFile) { message.error('无法读取文件'); opts.onError(); return }
  try {
    const XLSX = await import('xlsx')
    let headers: string[] = []
    let rows: any[][] = []

    if (rawFile.name.endsWith('.csv')) {
      const text = await rawFile.text()
      const lines = text.split(/\r?\n/).filter(r => r.trim())
      if (lines.length < 2) { message.error('文件中没有数据行'); opts.onError(); return }
      headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
      rows = lines.slice(1).map(parseCSVLine)
    } else {
      const buf = await rawFile.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'buffer' })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }) as any[][]
      if (data.length <= 1) { message.error('文件中没有数据行'); opts.onError(); return }
      headers = data[0].map((h: any) => String(h || '').trim())
      rows = data.slice(1)
    }

    fileName.value = rawFile.name
    rawFileRef.value = rawFile
    fileHeaders.value = headers
    previewRows.value = rows.length
    previewColCount.value = headers.length
    fileData.value = { headers, rows }

    for (const k of Object.keys(columnMap)) delete columnMap[k]
    for (const k of Object.keys(autoMatched)) delete autoMatched[k]
    importResult.value = null
    message.success(`解析完成: ${rows.length}行, ${headers.length}列`)

    if (selectedTemplateId.value) handleAutoMap()
    opts.onFinish()
  } catch (e: any) {
    message.error('解析失败: ' + e.message)
    opts.onError()
  }
}

async function handleTemplateSelect() {
  if (!selectedTemplateId.value) { templateFields.value = []; return }
  try {
    const resp = await $fetch(`/api/templates/${selectedTemplateId.value}`) as any
    if (resp.success) templateFields.value = resp.data.fields || []
    handleAutoMap()
  } catch (e) { console.error(e) }
}

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

function handleAutoMap() {
  if (!fileHeaders.value.length || !templateFields.value.length) return
  for (const tf of templateFields.value) {
    let matched: string | null = null
    let bestScore = 0
    const tfLabelNorm = normalizeStr(tf.fieldLabel)
    const tfKeyNorm = normalizeStr(tf.fieldKey)

    for (const fh of fileHeaders.value) {
      const fhNorm = normalizeStr(fh)
      let score = 0

      if (fh === tf.fieldLabel) score = 100
      else if (fhNorm === tfLabelNorm) score = 95
      else if (fhNorm === tfKeyNorm) score = 90
      else if (fh.includes(tf.fieldLabel) || tf.fieldLabel.includes(fh)) score = 70
      else if (fhNorm.includes(tfLabelNorm) || tfLabelNorm.includes(fhNorm)) score = 60
      else if (fhNorm.includes(tfKeyNorm) || tfKeyNorm.includes(fhNorm)) score = 50

      if (score > bestScore) {
        bestScore = score
        matched = fh
      }
    }

    columnMap[tf.fieldKey] = bestScore >= 50 ? matched : null
    autoMatched[tf.fieldKey] = bestScore >= 50
  }
}

async function handleImport() {
  if (!rawFileRef.value) { message.error('未选择文件'); return }
  if (!selectedTemplateId.value) { message.error('未选择模板'); return }

  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', rawFileRef.value)
    fd.append('templateId', String(selectedTemplateId.value))
    fd.append('columnMap', JSON.stringify(columnMap))

    const resp = await $fetch('/api/complaints/import-to-template', {
      method: 'POST',
      body: fd,
      headers: authStore.getAuthHeaders()
    }) as any

    if (resp.success) {
      importResult.value = resp.data
      message.success(resp.message)
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '导入失败')
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

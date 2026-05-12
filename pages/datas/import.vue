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
        <p class="page-subtitle">上传Excel或CSV文件，选择目标模板，系统自动匹配表头并导入</p>
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
          <n-upload :multiple="false" accept=".xlsx,.xls,.csv" :custom-request="handleFileUpload" :show-file-list="false">
            <n-button type="primary">选择Excel或CSV文件</n-button>
          </n-upload>
          <p v-if="fileName" class="text-sm text-primary-600 mt-2">
            {{ fileName }} ({{ previewRows }}行, {{ fileHeaders.length }}列)
          </p>
        </div>

        <h3 class="section-title">2. 选择模板</h3>
        <n-select v-model:value="selectedTemplateId" :options="templateOptions" placeholder="选择目标模板" filterable
          @update:value="handleTemplateSelect" />
        <p class="text-sm text-corporate-400 mt-2">系统自动匹配文件表头到模板字段，未匹配的列仍会保存</p>

        <!-- Field Mapping Preview -->
        <div v-if="mappingItems.length > 0" class="mt-4 p-3 bg-blue-50 rounded-lg">
          <p class="text-xs font-medium text-blue-700 mb-2">
            字段匹配预览（{{ matchedCount }}/{{ mappingItems.length }} 已匹配）：
          </p>
          <div class="space-y-1 max-h-64 overflow-y-auto">
            <div v-for="m in mappingItems" :key="m.header"
              class="flex items-center gap-2 text-xs py-1.5 px-2 rounded"
              :class="m.matched ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'">
              <span class="font-medium truncate flex-1">{{ m.header }}</span>
              <span class="text-gray-400 flex-shrink-0">→</span>
              <span class="truncate flex-1" :class="m.matched ? 'font-medium' : 'italic'">
                {{ m.matched ? m.fieldLabel : '(保留原表头)' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Data Preview -->
      <div class="card">
        <h3 class="section-title">数据预览（前5行）</h3>
        <div v-if="fileHeaders.length && previewData.length">
          <n-data-table :columns="previewCols" :data="previewData" size="small" :max-height="400" :scroll-x="600" />
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

      <!-- Detailed error list -->
      <div v-if="importResult.errors?.length" class="mt-4">
        <p class="text-sm font-medium text-red-600 mb-2">
          失败详情（前20条），请修正后重新导入：
        </p>
        <div class="max-h-64 overflow-y-auto">
          <n-data-table :columns="errorCols" :data="importResult.errors" size="small" />
        </div>
      </div>

      <div class="flex justify-end mt-4">
        <n-button type="primary" @click="navigateTo('/datas')">返回数据列表</n-button>
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

// Field mapping state
const mappingItems = ref<Array<{ header: string; fieldLabel: string; matched: boolean }>>([])
const matchedCount = computed(() => mappingItems.value.filter(m => m.matched).length)

const templateOptions = computed(() =>
  templates.value.map(t => ({ label: t.isDefault ? `${t.name}（默认）` : t.name, value: t.id }))
)

const errorCols = [
  { title: '行号', key: 'row', width: 60 },
  { title: '错误原因', key: 'message', ellipsis: { tooltip: true } }
]

const previewCols = computed(() =>
  fileHeaders.value.slice(0, 10).map(h => ({ title: h, key: h, ellipsis: { tooltip: true }, width: 130, minWidth: 100 }))
)

const previewData = computed(() => {
  if (!fileData.value) return []
  return fileData.value.rows.slice(0, 5).map(row => {
    const obj: Record<string, any> = {}
    fileHeaders.value.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
})

// Parse CSV line
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = '', inQuote = false
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

// Parse uploaded file (XLSX or CSV) and store as rows
async function handleFileUpload(opts: UploadCustomRequestOptions) {
  const rawFile: globalThis.File = (opts.file as any).file
  if (!rawFile) { message.error('无法读取文件'); opts.onError(); return }
  const isCSV = rawFile.name.endsWith('.csv')

  try {
    let headers: string[]
    let rows: any[][]

    if (isCSV) {
      const text = await rawFile.text()
      const lines = text.split(/\r?\n/).filter(r => r.trim())
      if (lines.length < 2) { message.error('文件中没有数据行'); opts.onError(); return }
      headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
      rows = lines.slice(1).map(l => parseCSVLine(l))
    } else {
      // Parse XLSX with raw:false to get formatted date strings
      const XLSX = await import('xlsx')
      const buf = await rawFile.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      // raw:false gives formatted strings for dates (e.g., "3/7/26" instead of 46088)
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][]
      if (data.length <= 1) { message.error('文件中没有数据行'); opts.onError(); return }
      headers = data[0].map((h: any) => String(h || '').trim()).filter((h: string) => h !== '')
      // Re-read the data aligned to filtered headers
      const fullHeaders = data[0].map((h: any) => String(h || '').trim())
      const validIndices: number[] = []
      fullHeaders.forEach((h: string, i: number) => { if (h !== '') validIndices.push(i) })
      rows = data.slice(1).map(row => validIndices.map(i => {
        const v = row[i]
        // Filter Excel formula values
        if (typeof v === 'string' && v.startsWith('=')) return ''
        return v ?? ''
      }))
    }

    // Remove completely empty rows
    rows = rows.filter(row => row.some(v => v !== '' && v !== null && v !== undefined))

    fileName.value = rawFile.name
    fileHeaders.value = headers
    previewRows.value = rows.length
    fileData.value = { headers, rows }
    importResult.value = null

    message.success(`解析完成: ${rows.length}行, ${headers.length}列`)
    opts.onFinish()

    // Refresh field mapping if template already selected
    if (selectedTemplateId.value) {
      await handleTemplateSelect(selectedTemplateId.value)
    }
  } catch (e: any) {
    message.error('解析失败: ' + e.message)
    opts.onError()
  }
}

// Match score between file header and template field
function matchScore(header: string, fieldLabel: string, fieldKey: string): number {
  const h = header.toLowerCase().replace(/\s+/g, '')
  const l = fieldLabel.toLowerCase().replace(/\s+/g, '')
  const k = fieldKey.toLowerCase().replace(/\s+/g, '')

  if (h === l) return 100
  if (h === k) return 95
  if (l.includes(h) || h.includes(l)) return 85
  if (k.includes(h) || h.includes(k)) return 80

  // Character Jaccard similarity
  const hSet = new Set([...h])
  const lSet = new Set([...l])
  if (hSet.size === 0 || lSet.size === 0) return 0
  const intersect = new Set([...hSet].filter(c => lSet.has(c)))
  const union = new Set([...hSet, ...lSet])
  const j = intersect.size / union.size
  if (j > 0.7) return Math.round(j * 60)
  if (j > 0.4) return Math.round(j * 40)
  return 0
}

async function handleTemplateSelect(tid: number | null) {
  mappingItems.value = []
  if (!tid || !fileHeaders.value.length) return

  try {
    const resp = await $fetch(`/api/templates/${tid}`) as any
    if (!resp.success || !resp.data?.fields?.length) {
      // No template fields, all headers unmatched
      mappingItems.value = fileHeaders.value.map(h => ({
        header: h, fieldLabel: h, matched: false
      }))
      return
    }

    const templateFields: Array<{ fieldKey: string; fieldLabel: string }> = resp.data.fields

    for (const header of fileHeaders.value) {
      if (!header.trim()) continue
      let bestLabel = ''
      let bestScore = 0

      for (const f of templateFields) {
        const score = matchScore(header, f.fieldLabel, f.fieldKey)
        if (score > bestScore) { bestScore = score; bestLabel = f.fieldLabel }
      }

      mappingItems.value.push({
        header: header.trim(),
        fieldLabel: bestScore >= 30 ? bestLabel : '',
        matched: bestScore >= 30
      })
    }
  } catch (e) {
    console.error('Failed to load template fields for mapping:', e)
  }
}

async function handleImport() {
  if (!fileData.value) { message.error('未选择文件'); return }
  if (!selectedTemplateId.value) { message.error('未选择模板'); return }

  importing.value = true
  try {
    // Convert parsed data to CSV and send to backend
    const csvContent = '﻿' + fileData.value.headers.join(',') + '\n' +
      fileData.value.rows.map(r =>
        r.map(c => {
          const str = String(c ?? '')
          // Quote if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"'
          }
          return str
        }).join(',')
      ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
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
      if (resp.data.errorCount === 0) {
        message.success(resp.message)
      } else {
        message.warning(resp.message)
      }
    } else {
      message.error(resp.message || '导入失败')
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

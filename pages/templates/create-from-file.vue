<template>
  <div class="animate-fade-in">
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/templates')" class="hover:bg-corporate-100 rounded-lg p-2">
        <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></template>
      </n-button>
      <div><h1 class="page-title">智能创建模板</h1><p class="page-subtitle">上传Excel/CSV文件，自动识别列名和类型，一键生成表单模板</p></div>
    </div>

    <!-- Step 1: Upload -->
    <div class="card mb-6">
      <h3 class="section-title">上传数据文件</h3>
      <div class="border-2 border-dashed border-corporate-200 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
        <div class="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <p class="font-medium text-corporate-700 mb-1">点击或拖拽上传</p>
        <p class="text-sm text-corporate-400 mb-4">.xlsx / .xls / .csv</p>
        <n-upload :multiple="false" accept=".xlsx,.xls,.csv" :custom-request="handleUpload" :show-file-list="false">
          <n-button type="primary" size="large">选择文件并解析</n-button>
        </n-upload>
      </div>
    </div>

    <!-- Step 2: Configure + Create -->
    <template v-if="parsed">
      <div class="card mb-6">
        <h3 class="section-title">模板设置</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <n-form-item label="模板名称" required><n-input v-model:value="config.templateName" /></n-form-item>
          <n-form-item label="所属部门"><n-select v-model:value="config.departmentId" :options="deptOptions" clearable placeholder="全局" /></n-form-item>
          <n-form-item label="公开模板"><n-switch v-model:value="config.isPublic" :disabled="!config.departmentId" /></n-form-item>
        </div>
      </div>

      <div class="card mb-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="section-title mb-0">字段配置 ({{ fields.length }} 列)</h3>
          <div class="flex gap-2">
            <n-button size="small" @click="expandAll = !expandAll">{{ expandAll ? '收起' : '展开' }}全部</n-button>
            <n-button size="small" type="primary" :loading="creating" @click="handleCreate">确认创建模板</n-button>
          </div>
        </div>

        <div class="space-y-2">
          <div v-for="(f, i) in fields" :key="f.fieldKey" class="border rounded-lg overflow-hidden" :class="expandIdx === i ? 'border-primary-300 bg-primary-50/20' : 'border-corporate-200'">
            <div class="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-corporate-50" @click="expandIdx = expandIdx === i ? -1 : i">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded bg-primary-100 text-xs font-bold text-primary-600 flex items-center justify-center">{{ i + 1 }}</span>
                <span class="text-sm font-medium">{{ f.fieldLabel }}</span>
                <n-tag :type="tagType(f.fieldType)" size="tiny">{{ typeLabel(f.fieldType) }}</n-tag>
                <span v-if="f.suggestedType !== f.fieldType" class="text-xs text-amber-500">已修改</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-corporate-400 transition-transform" :class="{ 'rotate-180': expandIdx === i }" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div v-if="expandIdx === i" class="px-4 py-3 border-t border-corporate-100 bg-white">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                <n-form-item label="字段标签" :show-feedback="false"><n-input v-model:value="f.fieldLabel" size="small" /></n-form-item>
                <n-form-item label="字段类型" :show-feedback="false">
                  <n-select v-model:value="f.fieldType" :options="typeOptions" size="small" @update:value="() => onTypeChange(f)" />
                </n-form-item>
                <n-form-item label="字段键" :show-feedback="false"><n-input v-model:value="f.fieldKey" size="small" disabled /></n-form-item>
              </div>
              <div v-if="f.fieldType === 'select' && f.detectedOptions?.length" class="bg-amber-50 rounded p-2 text-xs">
                自动提取 {{ f.detectedOptions.length }} 个唯一值作为下拉选项（将创建为部门级可复用配置）
              </div>
              <div class="text-xs text-corporate-400 mt-1">数据示例: {{ f.samples?.slice(0, 3).join(', ') || '(空)' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mb-6">
        <n-button @click="resetAll">重新选择文件</n-button>
        <n-button type="primary" size="large" :loading="creating" @click="handleCreate">创建模板 ({{ fields.length }}字段)</n-button>
      </div>
    </template>

    <!-- Result -->
    <div v-if="result" class="card">
      <h3 class="section-title text-green-600">模板创建成功!</h3>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="bg-green-50 rounded p-3 text-center"><p class="text-2xl font-bold text-green-600">{{ result.template.id }}</p><p class="text-xs text-green-500">模板ID</p></div>
        <div class="bg-blue-50 rounded p-3 text-center"><p class="text-2xl font-bold text-blue-600">{{ fields.length }}</p><p class="text-xs text-blue-500">字段数</p></div>
        <div class="bg-amber-50 rounded p-3 text-center"><p class="text-2xl font-bold text-amber-600">{{ result.createdConfigs?.length || 0 }}</p><p class="text-xs text-amber-500">下拉配置</p></div>
      </div>
      <div class="flex gap-2">
        <n-button type="primary" @click="navigateTo('/templates')">模板管理</n-button>
        <n-button @click="navigateTo('/complaints/import')">导入数据到该模板</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import type { UploadCustomRequestOptions } from 'naive-ui'

const authStore = useAuthStore()
const configStore = useConfigStore()
const message = useMessage()

const parsed = ref(false)
const creating = ref(false)
const expandIdx = ref(-1)
const expandAll = ref(false)
const result = ref<any>(null)
const fields = ref<any[]>([])
const uploadedFile = ref<globalThis.File | null>(null)

const config = reactive({ templateName: '', departmentId: null as number | null, isPublic: false })

const deptOptions = computed(() => {
  const opts = configStore.responsibleDepartmentOptions || []
  if (!authStore.isSuperAdmin) { const ids = authStore.user?.departmentIds || []; return opts.filter((o: any) => ids.includes(o.value)) }
  return opts
})

const typeOptions = [
  { label: '文本', value: 'text' }, { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' }, { label: '下拉选择', value: 'select' },
  { label: '日期', value: 'date' }, { label: '开关', value: 'switch' },
  { label: '自动补全', value: 'auto-complete' }, { label: '文件上传', value: 'upload' }
]

function typeLabel(t: string) { const m: Record<string,string> = {text:'文本',textarea:'多行文本',number:'数字',select:'下拉',date:'日期',switch:'开关','auto-complete':'自动补全',upload:'上传'}; return m[t]||t }
function tagType(t: string) { const m: Record<string,any> = {text:'default',textarea:'info',number:'success',select:'warning',date:'info',switch:'success','auto-complete':'default',upload:'error'}; return m[t]||'default' }

function onTypeChange(f: any) {
  if (f.fieldType === 'select' && !f.detectedOptions?.length) f.detectedOptions = []
}

function resetAll() { parsed.value = false; result.value = null; fields.value = []; uploadedFile.value = null }

async function handleUpload(opts: UploadCustomRequestOptions) {
  const file: globalThis.File = (opts.file as any).file
  if (!file) { message.error('无法读取文件'); opts.onError(); return }

  try {
    uploadedFile.value = file
    const fd = new FormData()
    fd.append('file', file)
    fd.append('action', 'preview')
    const resp = await $fetch('/api/templates/create-from-file', { method: 'POST', body: fd, headers: authStore.getAuthHeaders() }) as any
    if (resp.success) {
      fields.value = resp.data.fields.map((f: any) => ({
        ...f,
        suggestedType: f.fieldType,
        detectedOptions: f.detectedOptions || []
      }))
      if (!config.templateName) config.templateName = file.name.replace(/\.(xlsx|xls|csv)$/i, '')
      parsed.value = true
      message.success(`解析完成: ${resp.data.rowCount}行, ${fields.value.length}列`)
    }
    opts.onFinish()
  } catch (e: any) {
    message.error(e.data?.statusMessage || '解析失败')
    opts.onError()
  }
}

async function handleCreate() {
  if (!config.templateName) { message.error('请输入模板名称'); return }
  creating.value = true
  result.value = null
  try {
    const fd = new FormData()
    if (uploadedFile.value) fd.append('file', uploadedFile.value)
    fd.append('action', 'create')
    fd.append('templateName', config.templateName)
    if (config.departmentId) fd.append('departmentId', String(config.departmentId))
    fd.append('isPublic', String(config.isPublic))
    fd.append('fieldOverrides', JSON.stringify(fields.value.map(f => ({
      fieldKey: f.fieldKey, fieldType: f.fieldType, fieldLabel: f.fieldLabel
    }))))
    const resp = await $fetch('/api/templates/create-from-file', { method: 'POST', body: fd, headers: authStore.getAuthHeaders() }) as any
    if (resp.success) { result.value = resp.data; message.success(resp.message) }
  } catch (e: any) { message.error(e.data?.statusMessage || '创建失败') }
  finally { creating.value = false }
}

onMounted(async () => { await configStore.loadConfig() })
</script>

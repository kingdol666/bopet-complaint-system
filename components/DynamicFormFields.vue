<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <n-spin size="small" />
    </div>

    <div v-else-if="fields.length === 0" class="text-center py-4 text-industrial-400 text-sm">
      该模板暂无字段配置
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-for="field in fields" :key="field.id || field.fieldKey">
        <!-- Text -->
        <n-form-item v-if="field.fieldType === 'text'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined">
          <n-input v-model:value="modelData[field.fieldKey]" :placeholder="field.placeholder || ''" />
        </n-form-item>

        <!-- Textarea -->
        <n-form-item v-else-if="field.fieldType === 'textarea'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined"
          class="lg:col-span-3">
          <n-input v-model:value="modelData[field.fieldKey]" type="textarea" :placeholder="field.placeholder || ''"
            :rows="3" />
        </n-form-item>

        <!-- Number -->
        <n-form-item v-else-if="field.fieldType === 'number'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { type: 'number', required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined">
          <n-input-number v-model:value="modelData[field.fieldKey]" class="w-full"
            :placeholder="field.placeholder || ''" :min="0" :decimal-places="0" />
        </n-form-item>

        <!-- Select with static options -->
        <n-form-item v-else-if="field.fieldType === 'select'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined">
          <n-select v-model:value="modelData[field.fieldKey]" :options="parseSelectOptions(field.options)"
            :placeholder="field.placeholder || '请选择'" clearable />
        </n-form-item>

        <!-- Select with config options -->
        <n-form-item v-else-if="field.fieldType === 'select-config'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined">
          <n-select v-model:value="modelData[field.fieldKey]" :options="getConfigOptions(field.configType)"
            :placeholder="field.placeholder || '请选择'" clearable filterable />
        </n-form-item>

        <!-- Auto-complete (manual input + dropdown) -->
        <n-form-item v-else-if="field.fieldType === 'auto-complete'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined">
          <n-auto-complete v-model:value="modelData[field.fieldKey]" :options="getAutoCompleteOptions(field.configType)"
            :placeholder="field.placeholder || '输入或选择'" :clearable="true" />
        </n-form-item>

        <!-- Date -->
        <n-form-item v-else-if="field.fieldType === 'date'" :label="field.fieldLabel" :path="field.fieldKey"
          :rule="field.required ? { type: 'number', required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined">
          <n-date-picker v-model:value="modelData[field.fieldKey]" type="date" class="w-full" />
        </n-form-item>

        <!-- Switch -->
        <n-form-item v-else-if="field.fieldType === 'switch'" :label="field.fieldLabel" :path="field.fieldKey">
          <n-switch v-model:value="modelData[field.fieldKey]" />
        </n-form-item>

        <!-- Upload -->
        <n-form-item v-else-if="field.fieldType === 'upload'" :label="field.fieldLabel" :path="field.fieldKey">
          <div class="w-full">
            <n-upload :multiple="true" :max="10" accept="image/*,application/pdf,.doc,.docx"
              :custom-request="(opts: any) => handleUpload(opts, field.fieldKey)"
              @remove="(opts: any) => handleRemove(opts, field.fieldKey)" @before-upload="handleBeforeUpload"
              :default-file-list="getUploadFileList(field.fieldKey)">
              <n-button>
                <template #icon>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </template>
                上传文件
              </n-button>
            </n-upload>
            <p class="text-xs text-gray-400 mt-1">支持图片、PDF，单文件不超过 10MB</p>
            <!-- Image previews -->
            <div v-if="getUploadFiles(field.fieldKey).length" class="flex flex-wrap gap-2 mt-2">
              <div v-for="(f, fi) in getUploadFiles(field.fieldKey)" :key="fi"
                class="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img v-if="isImageType(f.fileType)" :src="f.fileUrl" class="w-full h-full object-cover" :alt="f.fileName" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-xs truncate px-1">{{ f.fileName }}</span>
                </div>
              </div>
            </div>
          </div>
        </n-form-item>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { nextTick } from 'vue'
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'

const configStore = useConfigStore()

const props = defineProps<{
  templateIds: number[]
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const loading = ref(false)
const fields = ref<any[]>([])

// Track which template IDs have been loaded to avoid duplicate reloads
const loadedIds = ref<string>('')

// Use reactive object synced with parent via watch instead of computed
// (computed setter doesn't fire on nested property changes with v-model)
const modelData = reactive<Record<string, any>>({ ...props.modelValue })

// Sync parent → local
let syncingFromParent = false
watch(() => props.modelValue, (newVal) => {
  syncingFromParent = true
  for (const key of Object.keys(modelData)) {
    if (!(key in newVal)) delete modelData[key]
  }
  Object.assign(modelData, newVal)
  nextTick(() => { syncingFromParent = false })
}, { deep: true })

// Sync local → parent
watch(modelData, () => {
  if (syncingFromParent) return
  emit('update:modelValue', { ...modelData })
}, { deep: true })

const message = useMessage()

// Config type to store getter mapping — now fully dynamic
// Standard config types are resolved via the config store,
// any unknown configType falls through to the dynamic /api/config/field-options endpoint
const configGetterMap: Record<string, string> = {
  customers: 'customerOptions',
  productModels: 'productModelOptions',
  productionLines: 'productionLineOptions',
  responsibleDepartments: 'responsibleDepartmentOptions',
  responsibleProcesses: 'responsibleProcessOptions'
}

// Stored options for auto-complete from server data
const autoCompleteData = reactive<Record<string, string[]>>({})

function parseSelectOptions(optionsStr: string | null | undefined) {
  if (!optionsStr) return []
  try {
    const arr = JSON.parse(optionsStr)
    if (Array.isArray(arr)) {
      return arr.map((item: any) => {
        if (typeof item === 'object') return item
        return { label: String(item), value: item }
      })
    }
    return []
  } catch {
    // 兼容旧数据：逗号分隔字符串格式
    return String(optionsStr).split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0).map(v => ({ label: v, value: v }))
  }
}

// Cache for dynamically loaded field option configs
const dynamicOptionCache = reactive<Record<string, any[]>>({})

function getConfigOptions(configType: string | null | undefined) {
  if (!configType) return []
  // First check standard config types
  const getter = configGetterMap[configType]
  if (getter) return (configStore as any)[getter] || []
  // Check dynamic cache
  if (dynamicOptionCache[configType]) {
    return dynamicOptionCache[configType]
  }
  // Trigger async load for dynamic configs
  loadDynamicOptions(configType)
  return []
}

async function loadDynamicOptions(configType: string) {
  if (dynamicOptionCache[configType]) return
  try {
    const resp = await $fetch('/api/config/field-options', { params: { configKey: configType } })
    if ((resp as any).success && (resp as any).data.length > 0) {
      const opts = JSON.parse((resp as any).data[0].options)
      dynamicOptionCache[configType] = opts.map((v: string) => ({ label: v, value: v }))
    }
  } catch (e) {
    console.error('Failed to load dynamic options:', e)
  }
}

function getAutoCompleteOptions(configType: string | null | undefined) {
  if (!configType) return []
  // For standard FK config types, use the config store options
  if (configGetterMap[configType]) {
    const getter = configGetterMap[configType]
    const options = (configStore as any)[getter] || []
    return options.map((m: any) => ({ label: m.label, value: m.label }))
  }
  // For dynamic config types, use the dynamic option cache
  if (dynamicOptionCache[configType]) {
    return dynamicOptionCache[configType]
  }
  // Trigger async load for dynamic configs
  loadDynamicOptions(configType)
  return []
}

// Upload handling
const uploadFiles = reactive<Record<string, any[]>>({})

function isImageType(mime: string): boolean {
  return mime?.startsWith('image/') && mime !== 'image/svg+xml'
}

function getUploadFiles(fieldKey: string): any[] {
  return uploadFiles[fieldKey] || []
}

function getUploadFileList(fieldKey: string): any[] {
  return (uploadFiles[fieldKey] || []).map((f: any) => ({
    id: f.fileUrl || f.fileName,
    name: f.fileName,
    status: 'finished' as const,
    url: f.fileUrl
  }))
}

async function handleUpload(options: UploadCustomRequestOptions, fieldKey: string) {
  const file: globalThis.File = (options.file as any).file
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await $fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    const data = response as any
    if (data.success) {
      if (!uploadFiles[fieldKey]) uploadFiles[fieldKey] = []
      uploadFiles[fieldKey].push({
        fileName: data.data.fileName,
        fileUrl: data.data.fileUrl,
        fileType: data.data.fileType,
        fileSize: data.data.fileSize
      })
      modelData[fieldKey] = [...(uploadFiles[fieldKey] || [])]
      options.onFinish()
    } else {
      options.onError()
      message.error(data.message || '上传失败')
    }
  } catch (e) {
    options.onError()
    message.error('上传失败')
  }
}

function handleRemove(options: { file: UploadFileInfo }, fieldKey: string) {
  if (uploadFiles[fieldKey]) {
    uploadFiles[fieldKey] = uploadFiles[fieldKey].filter(
      f => f.fileName !== options.file.name
    )
    modelData[fieldKey] = [...uploadFiles[fieldKey]]
  }
}

function handleBeforeUpload(data: { file: UploadFileInfo }) {
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (data.file.file?.size && data.file.file.size > maxSize) {
    message.error('文件大小不能超过5MB')
    return false
  }
  return true
}

// Load fields from all selected templates and merge
async function loadFields() {
  const ids = props.templateIds
  if (!ids || ids.length === 0) {
    fields.value = []
    loadedIds.value = ''
    return
  }

  const idKey = ids.slice().sort().join(',')
  if (loadedIds.value === idKey) return // already loaded

  loading.value = true
  try {
    // Fetch all templates in parallel
    const results = await Promise.all(
      ids.map(id => $fetch(`/api/templates/${id}`))
    )

    const allFields: any[] = []
    const seenKeys = new Set<string>()

    for (const response of results) {
      if ((response as any).success) {
        const templateFields = (response as any).data.fields || []
        for (const f of templateFields) {
          if (!seenKeys.has(f.fieldKey)) {
            seenKeys.add(f.fieldKey)
            allFields.push(f)
          }
        }
      }
    }

    allFields.sort((a, b) => a.sortOrder - b.sortOrder)
    fields.value = allFields
    loadedIds.value = idKey

    // Check if any auto-complete fields need data loaded
    const autoCompleteConfigTypes = new Set<string>()
    for (const f of allFields) {
      if (f.fieldType === 'auto-complete' && f.configType && !configGetterMap[f.configType]) {
        autoCompleteConfigTypes.add(f.configType)
      }
    }

    for (const configType of autoCompleteConfigTypes) {
      await loadDynamicOptions(configType)
    }

    // Initialize defaults for any missing values
    const defaults: Record<string, any> = {}
    for (const field of fields.value) {
      if (modelData[field.fieldKey] === undefined) {
        if (field.fieldType === 'switch') {
          defaults[field.fieldKey] = field.defaultValue === 'true'
        } else if (field.fieldType === 'number') {
          defaults[field.fieldKey] = field.defaultValue ? Number(field.defaultValue) : null
        } else {
          defaults[field.fieldKey] = field.defaultValue || null
        }
      }
    }
    if (Object.keys(defaults).length > 0) {
      emit('update:modelValue', { ...modelData, ...defaults })
    }
  } catch (e) {
    console.error('Failed to load template fields:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.templateIds, () => {
  loadFields()
}, { deep: true, immediate: true })
</script>

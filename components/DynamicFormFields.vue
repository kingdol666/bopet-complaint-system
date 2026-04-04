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
        <n-form-item
          v-if="field.fieldType === 'text'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined"
        >
          <n-input
            v-model:value="modelData[field.fieldKey]"
            :placeholder="field.placeholder || ''"
          />
        </n-form-item>

        <!-- Textarea -->
        <n-form-item
          v-else-if="field.fieldType === 'textarea'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined"
          class="lg:col-span-3"
        >
          <n-input
            v-model:value="modelData[field.fieldKey]"
            type="textarea"
            :placeholder="field.placeholder || ''"
            :rows="3"
          />
        </n-form-item>

        <!-- Number -->
        <n-form-item
          v-else-if="field.fieldType === 'number'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { type: 'number', required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' } : undefined"
        >
          <n-input-number
            v-model:value="modelData[field.fieldKey]"
            class="w-full"
            :placeholder="field.placeholder || ''"
          />
        </n-form-item>

        <!-- Select with static options -->
        <n-form-item
          v-else-if="field.fieldType === 'select'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined"
        >
          <n-select
            v-model:value="modelData[field.fieldKey]"
            :options="parseSelectOptions(field.options)"
            :placeholder="field.placeholder || '请选择'"
            clearable
          />
        </n-form-item>

        <!-- Select with config options -->
        <n-form-item
          v-else-if="field.fieldType === 'select-config'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined"
        >
          <n-select
            v-model:value="modelData[field.fieldKey]"
            :options="getConfigOptions(field.configType)"
            :placeholder="field.placeholder || '请选择'"
            clearable
            filterable
          />
        </n-form-item>

        <!-- Date -->
        <n-form-item
          v-else-if="field.fieldType === 'date'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
          :rule="field.required ? { type: 'number', required: true, message: `请选择${field.fieldLabel}`, trigger: 'change' } : undefined"
        >
          <n-date-picker
            v-model:value="modelData[field.fieldKey]"
            type="date"
            class="w-full"
          />
        </n-form-item>

        <!-- Switch -->
        <n-form-item
          v-else-if="field.fieldType === 'switch'"
          :label="field.fieldLabel"
          :path="field.fieldKey"
        >
          <n-switch v-model:value="modelData[field.fieldKey]" />
        </n-form-item>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '~/stores/config'

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

const modelData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Config type to store getter mapping
const configGetterMap: Record<string, string> = {
  customers: 'customerOptions',
  productModels: 'productModelOptions',
  productionLines: 'productionLineOptions',
  problemCategories: 'problemCategoryOptions',
  problemSubcategories: 'problemSubcategoryOptions',
  customerDemands: 'customerDemandOptions',
  compensationTypes: 'compensationTypeOptions',
  severityLevels: 'severityLevelOptions',
  responsibleDepartments: 'responsibleDepartmentOptions',
  responsibleProcesses: 'responsibleProcessOptions'
}

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
    return []
  }
}

function getConfigOptions(configType: string | null | undefined) {
  if (!configType) return []
  const getter = configGetterMap[configType]
  if (!getter) return []
  return (configStore as any)[getter] || []
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

    // Initialize defaults for any missing values
    const defaults: Record<string, any> = {}
    for (const field of fields.value) {
      if (modelData.value[field.fieldKey] === undefined) {
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
      emit('update:modelValue', { ...modelData.value, ...defaults })
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

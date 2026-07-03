<template>
  <div>
    <div class="mb-6 flex items-center">
      <n-button text class="mr-4" @click="navigateTo('/datas')">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <h1 class="page-title mb-0">编辑记录{{ dataNo ? ` - ${dataNo}` : '' }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <n-form v-else ref="formRef" :model="templateData" label-placement="left" label-width="120">
      <!-- Template info -->
      <div v-if="selectedTemplateIds.length > 0" class="card mb-6">
        <h2 class="section-title">表单模板</h2>
        <n-form-item label="关联模板">
          <n-select v-model:value="selectedTemplateIds" :options="templateOptions" placeholder="表单模板" multiple
            disabled />
        </n-form-item>
      </div>

      <!-- Dynamic fields from templates -->
      <div v-if="selectedTemplateIds.length > 0" class="card mb-6">
        <h2 class="section-title">记录表单</h2>
        <DynamicFormFields v-model="templateData" :template-ids="selectedTemplateIds" />
      </div>

      <div class="flex justify-end gap-2">
        <n-button type="default" @click="navigateTo(`/datas/${dataId}`)">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </n-button>
      </div>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import type { FormInst } from 'naive-ui'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const configStore = useConfigStore()
const route = useRoute()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(true)
const submitting = ref(false)
const selectedTemplateIds = ref<number[]>([])
const templateData = ref<Record<string, any>>({})
const templates = ref<any[]>([])
const dataNo = ref('')

const templateOptions = computed(() =>
  templates.value.map(t => ({
    label: t.isDefault ? `${t.name}（默认）` : t.name,
    value: t.id
  }))
)

const dataId = computed(() => Number.parseInt(String(route.params.id || '0'), 10))

// Date-type DB columns that need timestamp conversion for the form
const DATE_FIELDS = new Set(['feedbackDate', 'productionTime'])

function buildTemplateDataFromRecord(record: any): Record<string, any> {
  const data: Record<string, any> = {}

  // Start with templateData JSON (the primary source for all field values)
  if (record.templateData) {
    try {
      const custom = typeof record.templateData === 'string'
        ? JSON.parse(record.templateData)
        : record.templateData
      Object.assign(data, custom)
    } catch { }
  }

  // Fill in DB column values directly by fieldKey
  // (works when template fieldKey matches a DB column name)
  for (const key of Object.keys(record)) {
    if (key === 'templateData' || key === 'templateIds') continue
    const val = record[key]
    if (val === null || val === undefined) continue
    // Only set if not already in templateData (templateData takes priority)
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      if (DATE_FIELDS.has(key) && val instanceof Date) {
        data[key] = val.getTime()
      } else if (val instanceof Date) {
        data[key] = val.getTime()
      } else {
        data[key] = val
      }
    }
  }

  return data
}

// Known DB column names on DataRecord
const DB_COLUMNS = new Set([
  'dataNo', 'feedbackDate', 'productionTime', 'customerId', 'productModelId', 'shaftCount',
  'thickness', 'rollNo', 'specification', 'quantityInvolved', 'application',
  'productionLineId', 'shiftTeam', 'machineNo', 'batchNo',
  'feedbackContent', 'category', 'closureStatus',
  'responsibleDeptId', 'responsibleProcessId',
  'rootCauseAnalysis', 'correctiveAction', 'lessonsLearned', 'reviewConclusion',
  'productUsage', 'improvementAction', 'remark'
])

function buildPayload(data: Record<string, any>) {
  const standardPayload: Record<string, any> = {}
  const customData: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (DB_COLUMNS.has(key)) {
      // Write known DB columns directly
      if (DATE_FIELDS.has(key)) {
        standardPayload[key] = value ? dayjs(value).format('YYYY-MM-DD') : null
      } else {
        standardPayload[key] = value ?? null
      }
    } else {
      // Everything else goes to templateData JSON
      customData[key] = value
    }
  }

  return {
    ...standardPayload,
    templateIds: selectedTemplateIds.value.length > 0 ? selectedTemplateIds.value : null,
    templateData: Object.keys(customData).length > 0 ? customData : null
  }
}

onMounted(async () => {
  if (!dataId.value) {
    message.error('无效的记录 ID')
    await navigateTo('/datas')
    return
  }

  try {
    await authStore.checkAuth()
    if (!authStore.isLoggedIn) {
      await navigateTo('/login')
      return
    }

    // Load available templates
    try {
      await configStore.loadConfig()
      const tplResp = await $fetch('/api/templates', { headers: authStore.getAuthHeaders() }) as any
      if (tplResp.success) {
        templates.value = tplResp.data
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
    }

    await loadRecord()
  } catch (error) {
    console.error('Failed to load record for edit:', error)
    message.error('加载记录信息失败')
    await navigateTo('/datas')
  } finally {
    loading.value = false
  }
})

async function loadRecord() {
  const url = '/api/datas/' + dataId.value
  const response = await $fetch<{ success: boolean; data: any }>(url, { headers: authStore.getAuthHeaders() })

  if (!response?.success || !response.data) {
    throw new Error('记录记录不存在')
  }

  const record = response.data
  dataNo.value = record.dataNo || ''

  // Restore template IDs
  if (record.templateIds) {
    try {
      selectedTemplateIds.value = typeof record.templateIds === 'string'
        ? JSON.parse(record.templateIds)
        : record.templateIds
    } catch {
      selectedTemplateIds.value = []
    }
  }

  // Build templateData from standard fields + existing custom templateData
  templateData.value = buildTemplateDataFromRecord(record)
}

async function handleSubmit() {
  if (!dataId.value) {
    message.error('无效的记录 ID')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    message.error('请先填写必填项')
    return
  }

  submitting.value = true

  try {
    const payload = buildPayload(templateData.value)

    const url = '/api/datas/' + dataId.value
    const response = await $fetch<{ success: boolean }>(url, {
      method: 'PUT',
      body: payload,
      headers: authStore.getAuthHeaders()
    })

    if (!response?.success) {
      throw new Error('Update failed')
    }

    message.success('记录信息已更新')
    await navigateTo(`/datas/${dataId.value}`)
  } catch (error: any) {
    message.error(error.data?.message || error.data?.statusMessage || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

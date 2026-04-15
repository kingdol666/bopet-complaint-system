<template>
  <div>
    <div class="mb-6 flex items-center">
      <n-button text class="mr-4" @click="navigateTo('/complaints')">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <h1 class="page-title mb-0">编辑客诉{{ complaintNo ? ` - ${complaintNo}` : '' }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <n-form
      v-else
      ref="formRef"
      :model="templateData"
      label-placement="left"
      label-width="120"
    >
      <!-- Template info -->
      <div v-if="selectedTemplateIds.length > 0" class="card mb-6">
        <h2 class="section-title">表单模板</h2>
        <n-form-item label="关联模板">
          <n-select
            v-model:value="selectedTemplateIds"
            :options="templateOptions"
            placeholder="表单模板"
            multiple
            disabled
          />
        </n-form-item>
      </div>

      <!-- Dynamic fields from templates -->
      <div v-if="selectedTemplateIds.length > 0" class="card mb-6">
        <h2 class="section-title">客诉表单</h2>
        <DynamicFormFields
          v-model="templateData"
          :template-ids="selectedTemplateIds"
        />
      </div>

      <div class="flex justify-end gap-2">
        <n-button type="default" @click="navigateTo(`/complaints/${complaintId}`)">取消</n-button>
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
const complaintNo = ref('')

const templateOptions = computed(() =>
  templates.value.map(t => ({
    label: t.isDefault ? `${t.name}（默认）` : t.name,
    value: t.id
  }))
)

const complaintId = computed(() => Number.parseInt(String(route.params.id || '0'), 10))

// Standard field keys that map directly to ComplaintRecord columns
const STANDARD_FIELD_KEYS = new Set([
  'feedbackDate', 'productionTime', 'customerId', 'productModelId', 'thickness',
  'rollNo', 'quantityInvolved', 'application', 'productionLineId', 'shiftTeam',
  'machineNo', 'batchNo', 'feedbackContent', 'customerComplaintText',
  'internalComplaintName', 'problemCategoryId', 'problemSubcategoryId',
  'severityLevelId', 'repeatedIssue', 'customerDemandId', 'disposalResult',
  'compensationTypeId', 'closureStatus', 'responsibleDeptId',
  'responsibleProcessId', 'rootCauseAnalysis', 'correctiveAction',
  'lessonsLearned', 'reviewConclusion', 'standardizedAction', 'remark'
])

const DATE_FIELDS = new Set(['feedbackDate', 'productionTime'])

function buildTemplateDataFromRecord(record: any): Record<string, any> {
  const data: Record<string, any> = {}

  // Standard fields - convert to DynamicFormFields format
  for (const key of STANDARD_FIELD_KEYS) {
    if (record[key] !== null && record[key] !== undefined) {
      if (DATE_FIELDS.has(key)) {
        data[key] = new Date(record[key]).getTime()
      } else {
        data[key] = record[key]
      }
    }
  }

  // Custom fields from templateData
  if (record.templateData) {
    try {
      const custom = typeof record.templateData === 'string'
        ? JSON.parse(record.templateData)
        : record.templateData
      Object.assign(data, custom)
    } catch {}
  }

  return data
}

function buildPayload(data: Record<string, any>) {
  const standardPayload: Record<string, any> = {}
  const customData: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (STANDARD_FIELD_KEYS.has(key)) {
      if (DATE_FIELDS.has(key)) {
        standardPayload[key] = value ? dayjs(value).format('YYYY-MM-DD') : null
      } else {
        standardPayload[key] = value ?? null
      }
    } else {
      customData[key] = value
    }
  }

  for (const dateField of DATE_FIELDS) {
    if (!standardPayload[dateField]) {
      standardPayload[dateField] = dayjs().format('YYYY-MM-DD')
    }
  }

  return {
    ...standardPayload,
    templateData: Object.keys(customData).length > 0 ? customData : null
  }
}

onMounted(async () => {
  if (!complaintId.value) {
    message.error('无效的客诉 ID')
    await navigateTo('/complaints')
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
      const tplResp = await $fetch('/api/templates')
      if (tplResp.success) {
        templates.value = tplResp.data
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
    }

    await loadComplaint()
  } catch (error) {
    console.error('Failed to load complaint for edit:', error)
    message.error('加载客诉信息失败')
    await navigateTo('/complaints')
  } finally {
    loading.value = false
  }
})

async function loadComplaint() {
  const response = await $fetch(`/api/complaints/${complaintId.value}`) as { success?: boolean; data?: any }

  if (!response?.success || !response.data) {
    throw new Error('Complaint not found')
  }

  const record = response.data
  complaintNo.value = record.complaintNo || ''

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
  if (!complaintId.value) {
    message.error('无效的客诉 ID')
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

    const response = await $fetch(`/api/complaints/${complaintId.value}`, {
      method: 'PUT',
      body: payload,
      headers: authStore.getAuthHeaders()
    }) as { success?: boolean }

    if (!response?.success) {
      throw new Error('Update failed')
    }

    message.success('客诉信息已更新')
    await navigateTo(`/complaints/${complaintId.value}`)
  } catch (error: any) {
    message.error(error.data?.statusMessage || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

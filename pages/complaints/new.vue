<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/complaints')" class="hover:bg-corporate-100 rounded-lg p-2 transition-colors">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <div>
        <h1 class="page-title">新增客诉</h1>
        <p class="page-subtitle">创建新的客诉记录</p>
      </div>
    </div>

    <n-form ref="formRef" :model="templateData" label-placement="left" label-width="120">
      <!-- Template selection -->
      <div class="card mb-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">表单模板</h2>
        </div>
        <n-form-item label="选择模板" class="mb-0">
          <n-select
            v-model:value="selectedTemplateIds"
            :options="templateOptions"
            placeholder="选择一个或多个表单模板"
            multiple
            filterable
          />
        </n-form-item>
      </div>

      <!-- Dynamic fields from templates -->
      <div v-if="selectedTemplateIds.length > 0" class="card mb-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">客诉表单</h2>
        </div>
        <DynamicFormFields
          v-model="templateData"
          :template-ids="selectedTemplateIds"
        />
      </div>

      <!-- No template hint -->
      <div v-else class="card mb-6">
        <div class="text-center py-12">
          <div class="w-16 h-16 rounded-2xl bg-corporate-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-corporate-500">请先选择表单模板</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <n-button type="default" size="large" @click="navigateTo('/complaints')">
          取消
        </n-button>
        <n-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 13l4 4L19 7" />
            </svg>
          </template>
          提交
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
const router = useRouter()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const selectedTemplateIds = ref<number[]>([])
const templateData = ref<Record<string, any>>({})
const templates = ref<any[]>([])
const templateOptions = computed(() =>
  templates.value.map(t => ({
    label: t.isDefault ? `${t.name}（默认）` : t.name,
    value: t.id
  }))
)

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
    templateIds: selectedTemplateIds.value.length > 0 ? selectedTemplateIds.value : null,
    templateData: Object.keys(customData).length > 0 ? customData : null
  }
}

onMounted(async () => {
  try {
    await configStore.loadConfig()
    const response = await $fetch('/api/templates')
    if (response.success) {
      templates.value = response.data
      const defaultTemplate = response.data.find((t: any) => t.isDefault)
      if (defaultTemplate) {
        selectedTemplateIds.value = [defaultTemplate.id]
      }
    }
  } catch (e) {
    console.error('Failed to load templates:', e)
  }
})

async function handleSubmit() {
  if (selectedTemplateIds.value.length === 0) {
    message.error('请选择至少一个表单模板')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    message.error('请填写必填项')
    return
  }

  submitting.value = true

  try {
    const payload = buildPayload(templateData.value)

    const response = await $fetch('/api/complaints', {
      method: 'POST',
      body: payload,
      headers: authStore.getAuthHeaders()
    })

    if (response.success) {
      message.success('客诉记录创建成功')
      router.push('/complaints')
    }
  } catch (error: any) {
    message.error(error.data?.statusMessage || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

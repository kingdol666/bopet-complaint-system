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
      <h1 class="page-title mb-0">编辑客诉{{ formData.complaintNo ? ` - ${formData.complaintNo}` : '' }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <n-form
      v-else
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="120"
    >
      <div class="card mb-6">
        <h2 class="section-title">基础信息</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <n-form-item label="反馈日期" path="feedbackDate">
            <n-date-picker v-model:value="formData.feedbackDate" type="date" class="w-full" />
          </n-form-item>

          <n-form-item label="生产时间" path="productionTime">
            <n-date-picker v-model:value="formData.productionTime" type="date" class="w-full" clearable />
          </n-form-item>

          <n-form-item label="客户" path="customerId">
            <n-select
              v-model:value="formData.customerId"
              :options="customerOptions"
              placeholder="选择客户"
              filterable
              clearable
            />
          </n-form-item>

          <n-form-item label="产品型号" path="productModelId">
            <n-select
              v-model:value="formData.productModelId"
              :options="productModelOptions"
              placeholder="选择产品型号"
              filterable
              clearable
            />
          </n-form-item>

          <n-form-item label="厚度" path="thickness">
            <n-input v-model:value="formData.thickness" placeholder="如：12μm" />
          </n-form-item>

          <n-form-item label="卷号" path="rollNo">
            <n-input v-model:value="formData.rollNo" placeholder="卷号" />
          </n-form-item>

          <n-form-item label="涉及数量" path="quantityInvolved">
            <n-input-number v-model:value="formData.quantityInvolved" class="w-full" :min="0" placeholder="数量" />
          </n-form-item>

          <n-form-item label="用途" path="application">
            <n-input v-model:value="formData.application" placeholder="用途" />
          </n-form-item>

          <n-form-item label="产线" path="productionLineId">
            <n-select
              v-model:value="formData.productionLineId"
              :options="productionLineOptions"
              placeholder="选择产线"
              clearable
            />
          </n-form-item>

          <n-form-item label="班组" path="shiftTeam">
            <n-input v-model:value="formData.shiftTeam" placeholder="班组" />
          </n-form-item>

          <n-form-item label="机台" path="machineNo">
            <n-input v-model:value="formData.machineNo" placeholder="机台" />
          </n-form-item>

          <n-form-item label="批次号" path="batchNo">
            <n-input v-model:value="formData.batchNo" placeholder="批次号" />
          </n-form-item>
        </div>
      </div>

      <div class="card mb-6">
        <h2 class="section-title">客诉内容</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <n-form-item label="反馈内容" path="feedbackContent" class="lg:col-span-3">
            <n-input
              v-model:value="formData.feedbackContent"
              type="textarea"
              :rows="3"
              placeholder="客户反馈内容"
            />
          </n-form-item>

          <n-form-item label="客户投诉描述" path="customerComplaintText" class="lg:col-span-3">
            <n-input
              v-model:value="formData.customerComplaintText"
              type="textarea"
              :rows="2"
              placeholder="客户原始投诉描述"
              @blur="handleComplaintTextBlur"
            />
          </n-form-item>

          <div v-if="mappingSuggestions.length > 0" class="mb-4 lg:col-span-3">
            <p class="mb-2 text-sm text-industrial-600">系统建议映射：</p>
            <div class="flex flex-wrap gap-2">
              <n-tag
                v-for="suggestion in mappingSuggestions"
                :key="suggestion.id"
                :type="suggestion.id === selectedMapping?.id ? 'primary' : 'default'"
                style="cursor: pointer"
                @click="applyMapping(suggestion)"
              >
                {{ suggestion.internalComplaintName }}
                <span class="ml-1 text-industrial-400">({{ suggestion.problemCategory?.name || '未分类' }})</span>
              </n-tag>
            </div>
          </div>

          <n-form-item label="内部问题名称" path="internalComplaintName">
            <n-input v-model:value="formData.internalComplaintName" placeholder="内部标准问题名称" />
          </n-form-item>

          <n-form-item label="问题大类" path="problemCategoryId">
            <n-select
              v-model:value="formData.problemCategoryId"
              :options="problemCategoryOptions"
              placeholder="选择问题大类"
              clearable
              @update:value="handleCategoryChange"
            />
          </n-form-item>

          <n-form-item label="问题小类" path="problemSubcategoryId">
            <n-select
              v-model:value="formData.problemSubcategoryId"
              :options="filteredSubcategoryOptions"
              placeholder="选择问题小类"
              clearable
              :disabled="!formData.problemCategoryId"
            />
          </n-form-item>

          <n-form-item label="严重等级" path="severityLevelId">
            <n-select
              v-model:value="formData.severityLevelId"
              :options="severityLevelOptions"
              placeholder="选择严重等级"
              clearable
            />
          </n-form-item>

          <n-form-item label="是否重复" path="repeatedIssue">
            <n-switch v-model:value="formData.repeatedIssue" />
          </n-form-item>
        </div>
      </div>

      <div class="card mb-6">
        <h2 class="section-title">诉求与处置</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <n-form-item label="客户诉求" path="customerDemandId">
            <n-select
              v-model:value="formData.customerDemandId"
              :options="customerDemandOptions"
              placeholder="选择客户诉求"
              clearable
            />
          </n-form-item>

          <n-form-item label="赔偿方式" path="compensationTypeId">
            <n-select
              v-model:value="formData.compensationTypeId"
              :options="compensationTypeOptions"
              placeholder="选择赔偿方式"
              clearable
            />
          </n-form-item>

          <n-form-item label="闭环状态" path="closureStatus">
            <n-select
              v-model:value="formData.closureStatus"
              :options="statusOptions"
              placeholder="选择状态"
            />
          </n-form-item>

          <n-form-item label="责任部门" path="responsibleDeptId">
            <n-select
              v-model:value="formData.responsibleDeptId"
              :options="responsibleDepartmentOptions"
              placeholder="选择责任部门"
              clearable
              @update:value="handleDeptChange"
            />
          </n-form-item>

          <n-form-item label="责任工序" path="responsibleProcessId">
            <n-select
              v-model:value="formData.responsibleProcessId"
              :options="filteredProcessOptions"
              placeholder="选择责任工序"
              clearable
              :disabled="!formData.responsibleDeptId"
            />
          </n-form-item>

          <n-form-item label="处置结果" path="disposalResult" class="lg:col-span-3">
            <n-input
              v-model:value="formData.disposalResult"
              type="textarea"
              :rows="2"
              placeholder="本例客诉处置结果"
            />
          </n-form-item>
        </div>
      </div>

      <div class="card mb-6">
        <h2 class="section-title">原因与改进</h2>
        <div class="grid grid-cols-1 gap-4">
          <n-form-item label="问题分析" path="rootCauseAnalysis">
            <n-input
              v-model:value="formData.rootCauseAnalysis"
              type="textarea"
              :rows="3"
              placeholder="问题原因分析"
            />
          </n-form-item>

          <n-form-item label="改善措施" path="correctiveAction">
            <n-input
              v-model:value="formData.correctiveAction"
              type="textarea"
              :rows="3"
              placeholder="改善或纠正措施"
            />
          </n-form-item>

          <n-form-item label="启示" path="lessonsLearned">
            <n-input
              v-model:value="formData.lessonsLearned"
              type="textarea"
              :rows="2"
              placeholder="经验教训或启示"
            />
          </n-form-item>

          <n-form-item label="复盘结论" path="reviewConclusion">
            <n-input
              v-model:value="formData.reviewConclusion"
              type="textarea"
              :rows="2"
              placeholder="复盘结论"
            />
          </n-form-item>

          <n-form-item label="标准化措施" path="standardizedAction">
            <n-switch v-model:value="formData.standardizedAction" />
            <span class="ml-2 text-sm text-industrial-500">是否形成标准化措施</span>
          </n-form-item>

          <n-form-item label="备注" path="remark">
            <n-input
              v-model:value="formData.remark"
              type="textarea"
              :rows="2"
              placeholder="备注信息"
            />
          </n-form-item>
        </div>
      </div>

      <div class="flex justify-end space-x-4">
        <n-button @click="navigateTo(`/complaints/${complaintId}`)">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </n-button>
      </div>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { useAuthStore } from '~/stores/auth'
import type { FormInst, FormRules } from 'naive-ui'
import dayjs from 'dayjs'

interface MappingSuggestion {
  id: number
  internalComplaintName: string
  problemCategoryId: number | null
  problemSubcategoryId: number | null
  problemCategory?: {
    name: string
  } | null
}

const configStore = useConfigStore()
const authStore = useAuthStore()
const route = useRoute()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(true)
const submitting = ref(false)
const mappingSuggestions = ref<MappingSuggestion[]>([])
const selectedMapping = ref<MappingSuggestion | null>(null)

const complaintId = computed(() => Number.parseInt(String(route.params.id || '0'), 10))

const formData = reactive({
  id: 0,
  complaintNo: '',
  feedbackDate: null as number | null,
  productionTime: null as number | null,
  customerId: null as number | null,
  productModelId: null as number | null,
  thickness: '',
  rollNo: '',
  quantityInvolved: null as number | null,
  application: '',
  productionLineId: null as number | null,
  shiftTeam: '',
  machineNo: '',
  batchNo: '',
  feedbackContent: '',
  customerComplaintText: '',
  internalComplaintName: '',
  problemCategoryId: null as number | null,
  problemSubcategoryId: null as number | null,
  severityLevelId: null as number | null,
  repeatedIssue: false,
  customerDemandId: null as number | null,
  disposalResult: '',
  compensationTypeId: null as number | null,
  closureStatus: 'pending',
  responsibleDeptId: null as number | null,
  responsibleProcessId: null as number | null,
  rootCauseAnalysis: '',
  correctiveAction: '',
  lessonsLearned: '',
  reviewConclusion: '',
  standardizedAction: false,
  remark: ''
})

const rules: FormRules = {
  feedbackDate: [
    {
      type: 'number',
      required: true,
      message: '请选择反馈日期',
      trigger: ['blur', 'change']
    }
  ]
}

const customerOptions = computed(() => configStore.customerOptions)
const productModelOptions = computed(() => configStore.productModelOptions)
const productionLineOptions = computed(() => configStore.productionLineOptions)
const problemCategoryOptions = computed(() => configStore.problemCategoryOptions)
const severityLevelOptions = computed(() => configStore.severityLevelOptions)
const customerDemandOptions = computed(() => configStore.customerDemandOptions)
const compensationTypeOptions = computed(() => configStore.compensationTypeOptions)
const responsibleDepartmentOptions = computed(() => configStore.responsibleDepartmentOptions)

const statusOptions = [
  { label: '待分析', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已结案', value: 'closed' }
]

const filteredSubcategoryOptions = computed(() => {
  if (!formData.problemCategoryId) {
    return []
  }

  return configStore.problemSubcategoryOptions.filter(
    (item: any) => item.categoryId === formData.problemCategoryId
  )
})

const filteredProcessOptions = computed(() => {
  if (!formData.responsibleDeptId) {
    return []
  }

  return configStore.responsibleProcessOptions.filter(
    (item: any) => item.departmentId === formData.responsibleDeptId
  )
})

onMounted(async () => {
  if (!complaintId.value) {
    message.error('无效的客诉 ID')
    await navigateTo('/complaints')
    return
  }

  try {
    await Promise.all([
      authStore.checkAuth(),
      configStore.loadConfig()
    ])

    if (!authStore.isLoggedIn) {
      await navigateTo('/login')
      return
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

  applyComplaintData(response.data)
}

function applyComplaintData(record: any) {
  formData.id = record.id
  formData.complaintNo = record.complaintNo || ''
  formData.feedbackDate = toTimestamp(record.feedbackDate)
  formData.productionTime = toTimestamp(record.productionTime)
  formData.customerId = toNullableNumber(record.customerId)
  formData.productModelId = toNullableNumber(record.productModelId)
  formData.thickness = record.thickness ?? ''
  formData.rollNo = record.rollNo ?? ''
  formData.quantityInvolved = typeof record.quantityInvolved === 'number' ? record.quantityInvolved : null
  formData.application = record.application ?? ''
  formData.productionLineId = toNullableNumber(record.productionLineId)
  formData.shiftTeam = record.shiftTeam ?? ''
  formData.machineNo = record.machineNo ?? ''
  formData.batchNo = record.batchNo ?? ''
  formData.feedbackContent = record.feedbackContent ?? ''
  formData.customerComplaintText = record.customerComplaintText ?? ''
  formData.internalComplaintName = record.internalComplaintName ?? ''
  formData.problemCategoryId = toNullableNumber(record.problemCategoryId)
  formData.problemSubcategoryId = toNullableNumber(record.problemSubcategoryId)
  formData.severityLevelId = toNullableNumber(record.severityLevelId)
  formData.repeatedIssue = Boolean(record.repeatedIssue)
  formData.customerDemandId = toNullableNumber(record.customerDemandId)
  formData.disposalResult = record.disposalResult ?? ''
  formData.compensationTypeId = toNullableNumber(record.compensationTypeId)
  formData.closureStatus = record.closureStatus || 'pending'
  formData.responsibleDeptId = toNullableNumber(record.responsibleDeptId)
  formData.responsibleProcessId = toNullableNumber(record.responsibleProcessId)
  formData.rootCauseAnalysis = record.rootCauseAnalysis ?? ''
  formData.correctiveAction = record.correctiveAction ?? ''
  formData.lessonsLearned = record.lessonsLearned ?? ''
  formData.reviewConclusion = record.reviewConclusion ?? ''
  formData.standardizedAction = Boolean(record.standardizedAction)
  formData.remark = record.remark ?? ''
}

function toTimestamp(value: string | Date | null | undefined): number | null {
  if (!value) {
    return null
  }

  return new Date(value).getTime()
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

async function handleComplaintTextBlur() {
  if (!formData.customerComplaintText) {
    mappingSuggestions.value = []
    selectedMapping.value = null
    return
  }

  try {
    const response = await $fetch('/api/mappings/suggest', {
      method: 'POST',
      body: { text: formData.customerComplaintText }
    }) as { success?: boolean; data?: MappingSuggestion[] }

    if (response?.success && Array.isArray(response.data)) {
      mappingSuggestions.value = response.data
      selectedMapping.value = response.data.find((item) =>
        item.internalComplaintName === formData.internalComplaintName &&
        item.problemCategoryId === formData.problemCategoryId &&
        item.problemSubcategoryId === formData.problemSubcategoryId
      ) || null
      return
    }
  } catch (error) {
    console.error('Failed to get mapping suggestions:', error)
  }

  mappingSuggestions.value = []
  selectedMapping.value = null
}

function applyMapping(suggestion: MappingSuggestion) {
  selectedMapping.value = suggestion
  formData.internalComplaintName = suggestion.internalComplaintName
  formData.problemCategoryId = suggestion.problemCategoryId
  formData.problemSubcategoryId = suggestion.problemSubcategoryId
}

function handleCategoryChange() {
  formData.problemSubcategoryId = null
}

function handleDeptChange() {
  formData.responsibleProcessId = null
}

function buildPayload() {
  return {
    feedbackDate: formData.feedbackDate ? dayjs(formData.feedbackDate).format('YYYY-MM-DD') : null,
    productionTime: formData.productionTime ? dayjs(formData.productionTime).format('YYYY-MM-DD') : null,
    customerId: formData.customerId,
    productModelId: formData.productModelId,
    thickness: formData.thickness || null,
    rollNo: formData.rollNo || null,
    quantityInvolved: formData.quantityInvolved,
    application: formData.application || null,
    productionLineId: formData.productionLineId,
    shiftTeam: formData.shiftTeam || null,
    machineNo: formData.machineNo || null,
    batchNo: formData.batchNo || null,
    feedbackContent: formData.feedbackContent || null,
    customerComplaintText: formData.customerComplaintText || null,
    internalComplaintName: formData.internalComplaintName || null,
    problemCategoryId: formData.problemCategoryId,
    problemSubcategoryId: formData.problemSubcategoryId,
    severityLevelId: formData.severityLevelId,
    repeatedIssue: formData.repeatedIssue,
    customerDemandId: formData.customerDemandId,
    disposalResult: formData.disposalResult || null,
    compensationTypeId: formData.compensationTypeId,
    closureStatus: formData.closureStatus,
    responsibleDeptId: formData.responsibleDeptId,
    responsibleProcessId: formData.responsibleProcessId,
    rootCauseAnalysis: formData.rootCauseAnalysis || null,
    correctiveAction: formData.correctiveAction || null,
    lessonsLearned: formData.lessonsLearned || null,
    reviewConclusion: formData.reviewConclusion || null,
    standardizedAction: formData.standardizedAction,
    remark: formData.remark || null
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请先填写必填项')
    return
  }

  if (!complaintId.value) {
    message.error('无效的客诉 ID')
    return
  }

  submitting.value = true

  try {
    const response = await $fetch(`/api/complaints/${complaintId.value}`, {
      method: 'PUT',
      body: buildPayload(),
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

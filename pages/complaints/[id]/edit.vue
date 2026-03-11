<template>
  <div>
    <div class="flex items-center mb-6">
      <n-button text @click="navigateTo('/complaints')" class="mr-4">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <h1 class="page-title mb-0">编辑客诉 - {{ formData.complaintNo }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <n-form v-else ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="120">
      <!-- Basic info -->
      <div class="card mb-6">
        <h2 class="section-title">基础信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <n-form-item label="反馈日期" path="feedbackDate">
            <n-date-picker v-model:value="formData.feedbackDateValue" type="date" class="w-full" />
          </n-form-item>

          <n-form-item label="生产时间" path="productionTime">
            <n-date-picker v-model:value="formData.productionTimeValue" type="date" class="w-full" clearable />
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

          <n-form-item label="轴号" path="rollNo">
            <n-input v-model:value="formData.rollNo" placeholder="轴号" />
          </n-form-item>

          <n-form-item label="涉及数量" path="quantityInvolved">
            <n-input-number v-model:value="formData.quantityInvolved" placeholder="数量" class="w-full" :min="0" />
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

      <!-- Complaint content -->
      <div class="card mb-6">
        <h2 class="section-title">客诉内容</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <n-form-item label="反馈内容" path="feedbackContent" class="lg:col-span-3">
            <n-input
              v-model:value="formData.feedbackContent"
              type="textarea"
              placeholder="客户反馈内容"
              :rows="3"
            />
          </n-form-item>

          <n-form-item label="客户投诉描述" path="customerComplaintText" class="lg:col-span-3">
            <n-input
              v-model:value="formData.customerComplaintText"
              type="textarea"
              placeholder="客户原始投诉描述"
              :rows="2"
            />
          </n-form-item>

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

      <!-- Disposal -->
      <div class="card mb-6">
        <h2 class="section-title">诉求与处置</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              placeholder="本例客诉处置结果"
              :rows="2"
            />
          </n-form-item>
        </div>
      </div>

      <!-- Analysis -->
      <div class="card mb-6">
        <h2 class="section-title">原因与改善</h2>
        <div class="grid grid-cols-1 gap-4">
          <n-form-item label="问题分析" path="rootCauseAnalysis">
            <n-input
              v-model:value="formData.rootCauseAnalysis"
              type="textarea"
              placeholder="问题原因分析"
              :rows="3"
            />
          </n-form-item>

          <n-form-item label="改善措施" path="correctiveAction">
            <n-input
              v-model:value="formData.correctiveAction"
              type="textarea"
              placeholder="改善或纠正措施"
              :rows="3"
            />
          </n-form-item>

          <n-form-item label="启示" path="lessonsLearned">
            <n-input
              v-model:value="formData.lessonsLearned"
              type="textarea"
              placeholder="经验教训/启示"
              :rows="2"
            />
          </n-form-item>

          <n-form-item label="复盘结论" path="reviewConclusion">
            <n-input
              v-model:value="formData.reviewConclusion"
              type="textarea"
              placeholder="复盘结论"
              :rows="2"
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
              placeholder="备注信息"
              :rows="2"
            />
          </n-form-item>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-4">
        <n-button @click="navigateTo('/complaints')">取消</n-button>
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

const configStore = useConfigStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(true)
const submitting = ref(false)

// Form data
const formData = reactive({
  id: 0,
  complaintNo: '',
  feedbackDateValue: null as number | null,
  productionTimeValue: null as number | null,
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

// Validation rules
const rules: FormRules = {
  feedbackDateValue: [
    { type: 'number', required: true, message: '请选择反馈日期', trigger: 'blur' }
  ]
}

// Options
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

// Filtered options
const filteredSubcategoryOptions = computed(() => {
  if (!formData.problemCategoryId) return []
  return configStore.problemSubcategoryOptions.filter(
    (s: any) => s.categoryId === formData.problemCategoryId
  )
})

const filteredProcessOptions = computed(() => {
  if (!formData.responsibleDeptId) return []
  return configStore.responsibleProcessOptions.filter(
    (p: any) => p.departmentId === formData.responsibleDeptId
  )
})

// Load data
onMounted(async () => {
  await configStore.loadConfig()

  const id = route.params.id
  if (!id) {
    message.error('无效的ID')
    router.push('/complaints')
    return
  }

  try {
    const response = await $fetch(`/api/complaints/${id}`) as { success: boolean; data: any }
    if (response.success) {
      const data = response.data
      formData.id = data.id
      formData.complaintNo = data.complaintNo
      formData.feedbackDateValue = data.feedbackDate ? new Date(data.feedbackDate).getTime() : null
      formData.productionTimeValue = data.productionTime ? new Date(data.productionTime).getTime() : null
      formData.customerId = data.customerId
      formData.productModelId = data.productModelId
      formData.thickness = data.thickness || ''
      formData.rollNo = data.rollNo || ''
      formData.quantityInvolved = data.quantityInvolved
      formData.application = data.application || ''
      formData.productionLineId = data.productionLineId
      formData.shiftTeam = data.shiftTeam || ''
      formData.machineNo = data.machineNo || ''
      formData.batchNo = data.batchNo || ''
      formData.feedbackContent = data.feedbackContent || ''
      formData.customerComplaintText = data.customerComplaintText || ''
      formData.internalComplaintName = data.internalComplaintName || ''
      formData.problemCategoryId = data.problemCategoryId
      formData.problemSubcategoryId = data.problemSubcategoryId
      formData.severityLevelId = data.severityLevelId
      formData.repeatedIssue = data.repeatedIssue
      formData.customerDemandId = data.customerDemandId
      formData.disposalResult = data.disposalResult || ''
      formData.compensationTypeId = data.compensationTypeId
      formData.closureStatus = data.closureStatus
      formData.responsibleDeptId = data.responsibleDeptId
      formData.responsibleProcessId = data.responsibleProcessId
      formData.rootCauseAnalysis = data.rootCauseAnalysis || ''
      formData.correctiveAction = data.correctiveAction || ''
      formData.lessonsLearned = data.lessonsLearned || ''
      formData.reviewConclusion = data.reviewConclusion || ''
      formData.standardizedAction = data.standardizedAction
      formData.remark = data.remark || ''
    }
  } catch (e) {
    message.error('加载失败')
    router.push('/complaints')
  } finally {
    loading.value = false
  }
})

// Handle category change
function handleCategoryChange() {
  formData.problemSubcategoryId = null
}

// Handle department change
function handleDeptChange() {
  formData.responsibleProcessId = null
}

// Handle submit
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请填写必填项')
    return
  }

  submitting.value = true

  try {
    const payload = {
      id: formData.id,
      feedbackDate: formData.feedbackDateValue ? dayjs(formData.feedbackDateValue).format('YYYY-MM-DD') : null,
      productionTime: formData.productionTimeValue ? dayjs(formData.productionTimeValue).format('YYYY-MM-DD') : null,
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

    const response = await $fetch(`/api/complaints/${formData.id}`, {
      method: 'PUT',
      body: payload,
      headers: authStore.getAuthHeaders()
    })

    if (response.success) {
      message.success('保存成功')
      router.push('/complaints')
    }
  } catch (error: any) {
    message.error(error.data?.statusMessage || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

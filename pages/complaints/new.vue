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
      <h1 class="page-title mb-0">新增客诉</h1>
    </div>

    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="120">
      <!-- Basic info -->
      <div class="card mb-6">
        <h2 class="section-title">基础信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              @blur="handleComplaintTextBlur"
            />
          </n-form-item>

          <!-- Mapping suggestions -->
          <div v-if="mappingSuggestions.length > 0" class="lg:col-span-3 mb-4">
            <p class="text-sm text-industrial-600 mb-2">系统建议映射：</p>
            <div class="flex flex-wrap gap-2">
              <n-tag
                v-for="suggestion in mappingSuggestions"
                :key="suggestion.id"
                :type="suggestion === selectedMapping ? 'primary' : 'default'"
                style="cursor: pointer"
                @click="applyMapping(suggestion)"
              >
                {{ suggestion.internalComplaintName }}
                <span class="text-industrial-400 ml-1">({{ suggestion.problemCategory?.name }})</span>
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
          提交
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
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const mappingSuggestions = ref<any[]>([])
const selectedMapping = ref<any>(null)

// Form data
const formData = reactive({
  feedbackDate: Date.now(),
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

// Validation rules
const rules: FormRules = {
  feedbackDate: [
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

// Filtered options based on selections
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

// Load config
onMounted(async () => {
  await configStore.loadConfig()
})

// Handle complaint text blur - get mapping suggestions
async function handleComplaintTextBlur() {
  if (!formData.customerComplaintText) {
    mappingSuggestions.value = []
    return
  }

  try {
    const response = await $fetch('/api/mappings/suggest', {
      method: 'POST',
      body: { text: formData.customerComplaintText }
    })

    if (response.success) {
      mappingSuggestions.value = response.data
    }
  } catch (e) {
    console.error('Failed to get suggestions:', e)
  }
}

// Apply mapping suggestion
function applyMapping(suggestion: any) {
  selectedMapping.value = suggestion
  formData.internalComplaintName = suggestion.internalComplaintName
  formData.problemCategoryId = suggestion.problemCategoryId
  formData.problemSubcategoryId = suggestion.problemSubcategoryId
}

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
      ...formData,
      feedbackDate: dayjs(formData.feedbackDate).format('YYYY-MM-DD'),
      productionTime: formData.productionTime ? dayjs(formData.productionTime).format('YYYY-MM-DD') : null
    }

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

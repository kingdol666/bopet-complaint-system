<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center">
        <n-button text @click="navigateTo('/complaints')" class="mr-4">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </template>
        </n-button>
        <h1 class="page-title mb-0">{{ complaint?.complaintNo || '客诉详情' }}</h1>
      </div>
      <div class="flex space-x-3 no-print">
        <n-button @click="handlePrint">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </template>
          打印
        </n-button>
        <n-button type="primary" @click="navigateTo(`/complaints/${complaint?.id}/edit`)">
          编辑
        </n-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <n-spin size="large" />
    </div>

    <template v-else-if="complaint">
      <!-- Status banner -->
      <div class="card mb-6" :class="statusBannerClass">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <n-tag :type="statusType" size="large">
              {{ statusLabel }}
            </n-tag>
            <span v-if="complaint.repeatedIssue" class="text-orange-600 text-sm">
              ⚠ 重复问题
            </span>
          </div>
          <n-tag v-if="complaint.severityLevel" :color="{ color: complaint.severityLevel.color + '20', textColor: complaint.severityLevel.color }">
            {{ complaint.severityLevel.name }}
          </n-tag>
        </div>
      </div>

      <!-- Basic info -->
      <div class="card mb-6">
        <h2 class="section-title">基础信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="field">
            <label class="text-sm text-industrial-500">反馈日期</label>
            <p class="font-medium">{{ formatDate(complaint.feedbackDate) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">生产时间</label>
            <p class="font-medium">{{ formatDate(complaint.productionTime) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">客户</label>
            <p class="font-medium">{{ complaint.customer?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">产品型号</label>
            <p class="font-medium">{{ complaint.productModel?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">厚度</label>
            <p class="font-medium">{{ complaint.thickness || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">轴号</label>
            <p class="font-medium">{{ complaint.rollNo || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">涉及数量</label>
            <p class="font-medium">{{ complaint.quantityInvolved || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">用途</label>
            <p class="font-medium">{{ complaint.application || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">产线</label>
            <p class="font-medium">{{ complaint.productionLine?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">班组</label>
            <p class="font-medium">{{ complaint.shiftTeam || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">机台</label>
            <p class="font-medium">{{ complaint.machineNo || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">批次号</label>
            <p class="font-medium">{{ complaint.batchNo || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Complaint content -->
      <div class="card mb-6">
        <h2 class="section-title">客诉内容</h2>
        <div class="space-y-4">
          <div class="field">
            <label class="text-sm text-industrial-500">反馈内容</label>
            <p class="mt-1">{{ complaint.feedbackContent || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">客户投诉描述</label>
            <p class="mt-1 bg-yellow-50 p-3 rounded">{{ complaint.customerComplaintText || '-' }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">内部问题名称</label>
              <p class="font-medium">{{ complaint.internalComplaintName || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">问题大类</label>
              <p class="font-medium">{{ complaint.problemCategory?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">问题小类</label>
              <p class="font-medium">{{ complaint.problemSubcategory?.name || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Disposal -->
      <div class="card mb-6">
        <h2 class="section-title">诉求与处置</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">客户诉求</label>
              <p class="font-medium">{{ complaint.customerDemand?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">赔偿方式</label>
              <p class="font-medium">{{ complaint.compensationType?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">闭环状态</label>
              <p class="font-medium">
                <n-tag :type="statusType" size="small">{{ statusLabel }}</n-tag>
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label class="text-sm text-industrial-500">责任部门</label>
              <p class="font-medium">{{ complaint.responsibleDept?.name || '-' }}</p>
            </div>
            <div class="field">
              <label class="text-sm text-industrial-500">责任工序</label>
              <p class="font-medium">{{ complaint.responsibleProcess?.name || '-' }}</p>
            </div>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">处置结果</label>
            <p class="mt-1">{{ complaint.disposalResult || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Analysis -->
      <div class="card mb-6">
        <h2 class="section-title">原因与改善</h2>
        <div class="space-y-4">
          <div class="field">
            <label class="text-sm text-industrial-500">问题分析</label>
            <p class="mt-1">{{ complaint.rootCauseAnalysis || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">改善措施</label>
            <p class="mt-1">{{ complaint.correctiveAction || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">启示</label>
            <p class="mt-1">{{ complaint.lessonsLearned || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">复盘结论</label>
            <p class="mt-1">{{ complaint.reviewConclusion || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">标准化措施</label>
            <p class="mt-1">
              <n-tag :type="complaint.standardizedAction ? 'success' : 'default'" size="small">
                {{ complaint.standardizedAction ? '是' : '否' }}
              </n-tag>
            </p>
          </div>
        </div>
      </div>

      <!-- Audit info -->
      <div class="card">
        <h2 class="section-title">审计信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="field">
            <label class="text-sm text-industrial-500">创建时间</label>
            <p class="font-medium">{{ formatDateTime(complaint.createdAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">创建人</label>
            <p class="font-medium">{{ complaint.createdBy?.name || '-' }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">更新时间</label>
            <p class="font-medium">{{ formatDateTime(complaint.updatedAt) }}</p>
          </div>
          <div class="field">
            <label class="text-sm text-industrial-500">更新人</label>
            <p class="font-medium">{{ complaint.updatedBy?.name || '-' }}</p>
          </div>
          <div v-if="complaint.remark" class="field md:col-span-2 lg:col-span-4">
            <label class="text-sm text-industrial-500">备注</label>
            <p class="mt-1">{{ complaint.remark }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(true)
const complaint = ref<any>(null)

// Computed properties
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '待分析',
    processing: '处理中',
    closed: '已结案'
  }
  return map[complaint.value?.closureStatus] || '-'
})

const statusType = computed(() => {
  const map: Record<string, 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    processing: 'info',
    closed: 'success'
  }
  return map[complaint.value?.closureStatus] || 'default'
})

const statusBannerClass = computed(() => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 border-yellow-200',
    processing: 'bg-blue-50 border-blue-200',
    closed: 'bg-green-50 border-green-200'
  }
  return map[complaint.value?.closureStatus] || ''
})

// Load data
onMounted(async () => {
  const id = route.params.id
  if (!id) {
    message.error('无效的ID')
    router.push('/complaints')
    return
  }

  try {
    const response = await $fetch(`/api/complaints/${id}`)
    if (response.success) {
      complaint.value = response.data
    }
  } catch (e) {
    message.error('加载失败')
    router.push('/complaints')
  } finally {
    loading.value = false
  }
})

// Helper functions
function formatDate(date: string | Date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

function formatDateTime(date: string | Date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function handlePrint() {
  window.print()
}
</script>

<style scoped>
.field label {
  display: block;
  margin-bottom: 4px;
}
</style>

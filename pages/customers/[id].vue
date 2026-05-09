<template>
  <div class="animate-fade-in">
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/complaints')" class="hover:bg-corporate-100 rounded-lg p-2">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <div>
        <h1 class="page-title">{{ customer?.name || '客户详情' }}</h1>
        <p class="page-subtitle">查看该客户所有投诉记录与统计分析</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <n-spin size="large" />
    </div>

    <template v-else-if="customer">
      <!-- Customer Info Card -->
      <div class="card mb-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span class="text-sm text-corporate-500">客户编码</span>
            <p class="text-lg font-semibold text-corporate-900">{{ customer.code }}</p>
          </div>
          <div>
            <span class="text-sm text-corporate-500">客户名称</span>
            <p class="text-lg font-semibold text-corporate-900">{{ customer.name }}</p>
          </div>
          <div>
            <span class="text-sm text-corporate-500">简称</span>
            <p class="text-lg font-semibold text-corporate-900">{{ customer.shortName || '-' }}</p>
          </div>
          <div>
            <span class="text-sm text-corporate-500">投诉总数</span>
            <p class="text-lg font-semibold text-primary-600">{{ totalComplaints }}</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <n-date-picker v-model:value="dateRange" type="daterange" clearable @update:value="handleDateChange" />
          <n-select v-model:value="filters.complaintCategory" :options="complaintCategoryOptions" placeholder="客诉分类" clearable @update:value="loadData" style="width:160px" />
          <n-select v-model:value="filters.defectSource" :options="defectSourceOptions" placeholder="弊病源" clearable @update:value="loadData" style="width:160px" />
          <n-button @click="loadData" size="small">刷新</n-button>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Complaint category pie chart -->
        <div class="card">
          <h3 class="section-title">投诉分类占比</h3>
          <div class="h-72">
            <ClientOnly>
              <v-chart v-if="categoryStats.length > 0" :option="categoryPieOption" autoresize />
              <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
            </ClientOnly>
          </div>
        </div>

        <!-- Defect source bar chart -->
        <div class="card">
          <h3 class="section-title">弊病源分布</h3>
          <div class="h-72">
            <ClientOnly>
              <v-chart v-if="defectSourceStats.length > 0" :option="defectSourceBarOption" autoresize />
              <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Specific defect TOP10 -->
      <div class="card mb-6">
        <h3 class="section-title">具体不良点TOP10</h3>
        <div class="h-72">
          <ClientOnly>
            <v-chart v-if="specificDefectStats.length > 0" :option="specificDefectBarOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <!-- Complaint list -->
      <div class="card">
        <h3 class="section-title">投诉记录列表 ({{ pagination.total }}条)</h3>
        <n-data-table
          :columns="columns"
          :data="complaints"
          :loading="loadingList"
          :pagination="false"
          :row-key="(row: any) => row.id"
          :scroll-x="1200"
        />
        <div class="flex justify-center mt-4">
          <n-pagination
            v-model:page="pagination.page"
            :page-count="pagination.totalPages"
            @update:page="loadComplaints"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag } from 'naive-ui'
import { use, graphic } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const customer = ref<any>(null)
const totalComplaints = ref(0)

const complaints = ref<any[]>([])
const loadingList = ref(false)
const pagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 0 })

const categoryStats = ref<any[]>([])
const defectSourceStats = ref<any[]>([])
const specificDefectStats = ref<any[]>([])

const dateRange = ref<[number, number] | null>(null)
const filters = reactive({
  startDate: '', endDate: '',
  complaintCategory: null as string | null,
  defectSource: null as string | null
})

const complaintCategoryOptions = [
  { label: '成品外观', value: '成品外观' }, { label: '膜面平整性', value: '膜面平整性' },
  { label: '涂布表观', value: '涂布表观' }, { label: '点弊病', value: '点弊病' },
  { label: '轴身平整性', value: '轴身平整性' }, { label: '划伤', value: '划伤' },
  { label: '管理不良', value: '管理不良' }, { label: '包装运输', value: '包装运输' },
  { label: '物理特性', value: '物理特性' }, { label: '匹配性不良', value: '匹配性不良' },
  { label: '客户匹配性不良', value: '客户匹配性不良' }
]

const defectSourceOptions = [
  { label: '原材料', value: '原材料' }, { label: '配方', value: '配方' },
  { label: '挤出工序', value: '挤出工序' }, { label: '纵拉工序', value: '纵拉工序' },
  { label: '横拉工序', value: '横拉工序' }, { label: '涂布工序', value: '涂布工序' },
  { label: '收卷工序', value: '收卷工序' }, { label: '分切工序', value: '分切工序' },
  { label: '包装运输', value: '包装运输' }, { label: '环境管理', value: '环境管理' },
  { label: '人员管理', value: '人员管理' }, { label: '设备异常', value: '设备异常' }
]

const columns = [
  { title: '编号', key: 'complaintNo', width: 140, render: (row: any) => h('a', { class: 'text-primary-600 hover:text-primary-800 cursor-pointer font-medium', onClick: () => router.push(`/complaints/${row.id}`) }, row.complaintNo) },
  { title: '投诉日期', key: 'feedbackDate', width: 110, render: (row: any) => row.feedbackDate ? new Date(row.feedbackDate).toLocaleDateString('zh-CN') : '-' },
  { title: '型号', key: 'productModel', width: 140, ellipsis: { tooltip: true }, render: (row: any) => row.productModel?.name || '-' },
  { title: '规格', key: 'specification', width: 120, render: (row: any) => row.specification || '-' },
  { title: '弊病源', key: 'defectSource', width: 100, render: (row: any) => row.defectSource || '-' },
  { title: '具体不良点', key: 'specificDefect', width: 120, render: (row: any) => row.specificDefect || '-' },
  { title: '客诉分类', key: 'complaintCategory', width: 100, render: (row: any) => row.complaintCategory || '-' },
  { title: '状态', key: 'closureStatus', width: 90, render: (row: any) => {
    const map: Record<string, any> = { pending: { label: '待分析', type: 'warning' }, processing: { label: '处理中', type: 'info' }, closed: { label: '已结案', type: 'success' } }
    const s = map[row.closureStatus] || { label: row.closureStatus, type: 'default' }
    return h(NTag, { type: s.type, size: 'small' }, () => s.label)
  }}
]

// Chart options
const categoryPieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: categoryStats.value.map(d => ({ name: d.name, value: d.count }))
  }]
}))

const defectSourceBarOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'category', data: defectSourceStats.value.map(d => d.name), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: defectSourceStats.value.map(d => d.count),
    itemStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]), borderRadius: [4, 4, 0, 0] }
  }]
}))

const specificDefectBarOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  yAxis: { type: 'category', data: specificDefectStats.value.map(d => d.name).reverse(), axisLabel: { width: 120, overflow: 'truncate' } },
  xAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: specificDefectStats.value.map(d => d.count).reverse(),
    itemStyle: { color: new graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]), borderRadius: [0, 4, 4, 0] }
  }]
}))

function handleDateChange(value: [number, number] | null) {
  if (value) {
    filters.startDate = new Date(value[0]).toISOString().slice(0, 10)
    filters.endDate = new Date(value[1]).toISOString().slice(0, 10)
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  loadData()
}

async function loadData() {
  const id = route.params.id as string
  loading.value = true
  try {
    const params: any = { customerId: id }
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    if (filters.complaintCategory) params.complaintCategory = filters.complaintCategory
    if (filters.defectSource) params.defectSource = filters.defectSource

    const resp = await $fetch(`/api/stats/customer/${id}`, { params }) as any
    if (resp.success) {
      customer.value = resp.data.customer
      totalComplaints.value = resp.data.total
      categoryStats.value = resp.data.byCategory || []
      defectSourceStats.value = resp.data.byDefectSource || []
      specificDefectStats.value = resp.data.topSpecificDefects || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  loadComplaints()
}

async function loadComplaints() {
  loadingList.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize, customerId: Number(route.params.id) }
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    if (filters.complaintCategory) params.complaintCategory = filters.complaintCategory
    if (filters.defectSource) params.defectSource = filters.defectSource

    const resp = await $fetch('/api/complaints', { params }) as any
    if (resp.success) {
      complaints.value = resp.data.records
      pagination.total = resp.data.pagination.total
      pagination.totalPages = resp.data.pagination.totalPages
    }
  } catch (e) {
    console.error(e)
  } finally {
    loadingList.value = false
  }
}

onMounted(() => loadData())
</script>

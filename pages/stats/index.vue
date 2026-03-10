<template>
  <div>
    <h1 class="page-title">统计分析</h1>

    <!-- Date filter -->
    <div class="card mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <span class="text-sm text-industrial-600">时间范围：</span>
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          @update:value="handleDateChange"
        />
        <n-button @click="loadAllData">刷新数据</n-button>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Category distribution -->
      <div class="card">
        <h2 class="section-title">问题大类分布</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="categoryChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- Production line distribution -->
      <div class="card">
        <h2 class="section-title">产线分布</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="productionLineChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Customer ranking -->
      <div class="card">
        <h2 class="section-title">客户客诉排名 TOP 10</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="customerChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- Product model ranking -->
      <div class="card">
        <h2 class="section-title">产品型号排名 TOP 10</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="productModelChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- Data tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Category stats table -->
      <div class="card">
        <h2 class="section-title">问题大类统计</h2>
        <n-data-table
          :columns="categoryTableColumns"
          :data="categoryTableData"
          :bordered="false"
          size="small"
        />
      </div>

      <!-- Customer stats table -->
      <div class="card">
        <h2 class="section-title">客户统计 TOP 10</h2>
        <n-data-table
          :columns="customerTableColumns"
          :data="customerTableData"
          :bordered="false"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const dateRange = ref<[number, number] | null>(null)
const startDate = ref('')
const endDate = ref('')

// Data
const categoryData = ref<any[]>([])
const productionLineData = ref<any[]>([])
const customerData = ref<any[]>([])
const productModelData = ref<any[]>([])

// Table columns
const categoryTableColumns = [
  { title: '排名', key: 'rank', width: 60 },
  { title: '问题大类', key: 'categoryName' },
  { title: '数量', key: 'count', width: 80 }
]

const customerTableColumns = [
  { title: '排名', key: 'rank', width: 60 },
  { title: '客户', key: 'customerName' },
  { title: '数量', key: 'count', width: 80 }
]

// Table data
const categoryTableData = computed(() =>
  categoryData.value.map((d, i) => ({ ...d, rank: i + 1 }))
)

const customerTableData = computed(() =>
  customerData.value.slice(0, 10).map((d, i) => ({ ...d, rank: i + 1 }))
)

// Chart options
const categoryChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    type: 'scroll'
  },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      labelLine: { show: false },
      data: categoryData.value.map(d => ({
        name: d.categoryName,
        value: d.count
      }))
    }
  ]
}))

const productionLineChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: productionLineData.value.map(d => d.productionLineName)
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      data: productionLineData.value.map(d => d.count),
      itemStyle: {
        color: '#3b82f6',
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
}))

const customerChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '3%',
    containLabel: true
  },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: customerData.value.slice(0, 10).map(d => d.customerName).reverse(),
    axisLabel: {
      width: 100,
      overflow: 'truncate'
    }
  },
  series: [
    {
      type: 'bar',
      data: customerData.value.slice(0, 10).map(d => d.count).reverse(),
      itemStyle: {
        color: '#10b981',
        borderRadius: [0, 4, 4, 0]
      }
    }
  ]
}))

const productModelChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '3%',
    containLabel: true
  },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: productModelData.value.slice(0, 10).map(d => d.productModelName).reverse(),
    axisLabel: {
      width: 100,
      overflow: 'truncate'
    }
  },
  series: [
    {
      type: 'bar',
      data: productModelData.value.slice(0, 10).map(d => d.count).reverse(),
      itemStyle: {
        color: '#f59e0b',
        borderRadius: [0, 4, 4, 0]
      }
    }
  ]
}))

// Load data
onMounted(async () => {
  await loadAllData()
})

function handleDateChange(value: [number, number] | null) {
  if (value) {
    startDate.value = dayjs(value[0]).format('YYYY-MM-DD')
    endDate.value = dayjs(value[1]).format('YYYY-MM-DD')
  } else {
    startDate.value = ''
    endDate.value = ''
  }
  loadAllData()
}

async function loadAllData() {
  try {
    const params: any = {}
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value

    const response = await $fetch('/api/stats/by-category', { params })

    if (response.success) {
      categoryData.value = response.data.byCategory
      productionLineData.value = response.data.byProductionLine
      customerData.value = response.data.byCustomer
      productModelData.value = response.data.byProductModel
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}
</script>

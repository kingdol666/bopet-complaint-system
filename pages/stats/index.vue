<template>
  <div class="animate-fade-in">
    <div class="mb-6">
      <h1 class="page-title">统计分析</h1>
      <p class="page-subtitle">客诉数据多维度统计分析</p>
    </div>

    <div class="card mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2 text-sm text-corporate-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>时间范围：</span>
        </div>
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          @update:value="handleDateChange"
        />
        <n-button @click="loadAllData">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </template>
          刷新数据
        </n-button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">问题大类分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="categoryData.length > 0" :option="categoryChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 class="section-title mb-0">产线分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="productionLineData.length > 0" :option="productionLineChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">客户客诉排名 TOP 10</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="customerData.length > 0" :option="customerChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 class="section-title mb-0">产品型号排名 TOP 10</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="productModelData.length > 0" :option="productModelChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">问题小类分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="subcategoryData.length > 0" :option="subcategoryChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">严重等级分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="severityLevelData.length > 0" :option="severityLevelChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">客户诉求分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="customerDemandData.length > 0" :option="customerDemandChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">赔偿方式分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="compensationTypeData.length > 0" :option="compensationTypeChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 class="section-title mb-0">责任部门分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="departmentData.length > 0" :option="departmentChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 class="section-title mb-0">责任工序分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart v-if="processData.length > 0" :option="processChartOption" autoresize />
            <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">问题大类统计</h2>
        </div>
        <n-data-table
          :columns="categoryTableColumns"
          :data="categoryTableData"
          :bordered="false"
          size="small"
        />
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">客户统计 TOP 10</h2>
        </div>
        <n-data-table
          :columns="customerTableColumns"
          :data="customerTableData"
          :bordered="false"
          size="small"
        />
      </div>
    </div>

    <div v-if="templateStats.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h2 class="section-title mb-0">模板使用分布</h2>
        </div>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="templateChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 class="section-title mb-0">模板使用统计</h2>
        </div>
        <n-data-table
          :columns="templateTableColumns"
          :data="templateStats"
          :bordered="false"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { use, graphic } from 'echarts/core'
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

const categoryData = ref<any[]>([])
const productionLineData = ref<any[]>([])
const customerData = ref<any[]>([])
const productModelData = ref<any[]>([])
const subcategoryData = ref<any[]>([])
const customerDemandData = ref<any[]>([])
const compensationTypeData = ref<any[]>([])
const severityLevelData = ref<any[]>([])
const departmentData = ref<any[]>([])
const processData = ref<any[]>([])
const templateStats = ref<any[]>([])

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

const templateTableColumns = [
  { title: '排名', key: 'rank', width: 60 },
  { title: '模板名称', key: 'templateName' },
  { title: '数量', key: 'count', width: 80 },
  {
    title: '占比',
    key: 'percentage',
    width: 100,
    render: (row: any) => {
      const val = row.percentage || '0%'
      return h('span', { class: 'text-corporate-600 font-medium' }, val)
    }
  }
]

const categoryTableData = computed(() =>
  categoryData.value.map((d, i) => ({ ...d, rank: i + 1 }))
)

const customerTableData = computed(() =>
  customerData.value.slice(0, 10).map((d, i) => ({ ...d, rank: i + 1 }))
)

const categoryChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: categoryData.value.map(d => ({ name: d.categoryName, value: d.count }))
  }]
}))

const productionLineChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'category', data: productionLineData.value.map(d => d.productionLineName) },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: productionLineData.value.map(d => d.count),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#3b82f6' },
        { offset: 1, color: '#1d4ed8' }
      ]),
      borderRadius: [4, 4, 0, 0]
    }
  }]
}))

const customerChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: customerData.value.slice(0, 10).map(d => d.customerName).reverse(),
    axisLabel: { width: 100, overflow: 'truncate' }
  },
  series: [{
    type: 'bar',
    data: customerData.value.slice(0, 10).map(d => d.count).reverse(),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#10b981' },
        { offset: 1, color: '#059669' }
      ]),
      borderRadius: [0, 4, 4, 0]
    }
  }]
}))

const productModelChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: productModelData.value.slice(0, 10).map(d => d.productModelName).reverse(),
    axisLabel: { width: 100, overflow: 'truncate' }
  },
  series: [{
    type: 'bar',
    data: productModelData.value.slice(0, 10).map(d => d.count).reverse(),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#f59e0b' },
        { offset: 1, color: '#d97706' }
      ]),
      borderRadius: [0, 4, 4, 0]
    }
  }]
}))

const subcategoryChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: subcategoryData.value.map(d => ({ name: d.subcategoryName, value: d.count }))
  }]
}))

const severityLevelChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'category', data: severityLevelData.value.map(d => d.severityLevelName) },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: severityLevelData.value.map(d => ({
      value: d.count,
      itemStyle: {
        color: d.color || '#6b7280',
        borderRadius: [4, 4, 0, 0]
      }
    }))
  }]
}))

const customerDemandChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: customerDemandData.value.map(d => ({ name: d.customerDemandName, value: d.count }))
  }]
}))

const compensationTypeChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: compensationTypeData.value.map(d => ({ name: d.compensationTypeName, value: d.count }))
  }]
}))

const departmentChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'category', data: departmentData.value.map(d => d.departmentName) },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: departmentData.value.map(d => d.count),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#6366f1' },
        { offset: 1, color: '#4338ca' }
      ]),
      borderRadius: [4, 4, 0, 0]
    }
  }]
}))

const processChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  xAxis: { type: 'category', data: processData.value.map(d => d.processName) },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: processData.value.map(d => d.count),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#14b8a6' },
        { offset: 1, color: '#0d9488' }
      ]),
      borderRadius: [4, 4, 0, 0]
    }
  }]
}))

const templateChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: templateStats.value.map(d => ({ name: d.templateName, value: d.count }))
  }]
}))

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
      categoryData.value = response.data.byCategory || []
      productionLineData.value = response.data.byProductionLine || []
      customerData.value = response.data.byCustomer || []
      productModelData.value = response.data.byProductModel || []
      subcategoryData.value = response.data.bySubcategory || []
      customerDemandData.value = response.data.byCustomerDemand || []
      compensationTypeData.value = response.data.byCompensationType || []
      severityLevelData.value = response.data.bySeverityLevel || []
      departmentData.value = response.data.byDepartment || []
      processData.value = response.data.byProcess || []
    }

    const overviewResp = await $fetch('/api/stats/overview')
    if (overviewResp.success) {
      const total = overviewResp.data.total || 0
      templateStats.value = (overviewResp.data.byTemplate || []).map((d: any, i: number) => ({
        ...d,
        rank: i + 1,
        percentage: total > 0 ? (d.count / total * 100).toFixed(1) + '%' : '0%'
      }))
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}
</script>

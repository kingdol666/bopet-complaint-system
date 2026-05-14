<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="mb-8">
      <h1 class="page-title">数据概览</h1>
      <p class="page-subtitle">实时监控业务数据，掌握运营动态</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total records -->
      <div class="stat-card primary hover-lift">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-slate-500 font-medium">数据总量</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">{{ stats.total }}</p>
            <p class="text-xs text-slate-400 mt-1">累计全部记录</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
      </div>

      <!-- This month -->
      <div class="stat-card info hover-lift">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-slate-500 font-medium">本月新增</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">{{ stats.thisMonth }}</p>
            <div class="flex items-center gap-1 mt-1">
              <span
                v-if="stats.momChange != null && !isNaN(parseFloat(stats.momChange))"
                class="text-xs font-medium"
                :class="parseFloat(stats.momChange) >= 0 ? 'text-red-500' : 'text-emerald-500'"
              >
                {{ parseFloat(stats.momChange) >= 0 ? '↑' : '↓' }} {{ Math.abs(parseFloat(stats.momChange)) }}%
              </span>
              <span v-else class="text-xs font-medium text-slate-400">--</span>
              <span class="text-xs text-slate-400">环比上月</span>
            </div>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Pending -->
      <div class="stat-card warning hover-lift">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-slate-500 font-medium">待处理</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">{{ (stats.byStatus?.pending || 0) + (stats.byStatus?.processing || 0) }}</p>
            <p class="text-xs text-slate-400 mt-1">待分析 + 处理中</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Closed -->
      <div class="stat-card success hover-lift">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-slate-500 font-medium">已结案</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">{{ stats.byStatus?.closed || 0 }}</p>
            <div class="flex items-center gap-1 mt-1">
              <span class="text-xs font-medium text-emerald-600">{{ closedRate }}%</span>
              <span class="text-xs text-slate-400">闭环率</span>
            </div>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Monthly trend chart -->
      <div class="card lg:col-span-2">
        <h2 class="section-title">月度趋势</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="trendChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- Template distribution -->
      <div class="card">
        <h2 class="section-title">模板分布</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="templateChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- Recent records section -->
    <div class="grid grid-cols-1 gap-6 mb-8">
      <!-- Recent records -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">最近记录</h2>
          <n-button text size="small" @click="navigateTo('/datas')">
            查看全部
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </n-button>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in recentData"
            :key="item.id"
            class="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors group border border-slate-100 hover:border-blue-200"
            @click="navigateTo(`/datas/${item.id}`)"
          >
            <div class="flex items-center gap-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 group-hover:text-blue-600 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-slate-900">{{ item.dataNo }}</p>
                <p class="text-sm text-slate-500">{{ item.customer?.name || '-' }}</p>
              </div>
            </div>
            <n-tag :type="getStatusType(item.closureStatus)" size="small">
              {{ getStatusLabel(item.closureStatus) }}
            </n-tag>
          </div>
          <div v-if="recentData.length === 0" class="empty-state py-8">
            <div class="empty-state-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="empty-state-title">暂无数据</p>
            <p class="empty-state-desc">暂无记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pending records -->
    <div class="card" v-if="pendingData.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="section-title mb-0">待处理记录</h2>
        <n-button text size="small" @click="navigateTo('/datas?closureStatus=pending')">
          查看全部
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </template>
        </n-button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in pendingData"
          :key="item.id"
          class="p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors"
          @click="navigateTo(`/datas/${item.id}`)"
        >
          <div class="flex items-start justify-between mb-2">
            <span class="font-medium text-slate-900">{{ item.dataNo }}</span>
            <n-tag type="warning" size="small">{{ getStatusLabel(item.closureStatus) }}</n-tag>
          </div>
          <p class="text-sm text-slate-600 mb-1">{{ item.customer?.name || '-' }}</p>
          <p class="text-xs text-slate-400">反馈日期: {{ item.feedbackDate ? formatDate(item.feedbackDate) : '-' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useConfigStore } from '~/stores/config'
import dayjs from 'dayjs'

// Page meta
definePageMeta({
  title: '数据概览'
})

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const configStore = useConfigStore()

// Stats data
const stats = ref<any>({
  total: 0,
  thisMonth: 0,
  lastMonth: 0,
  momChange: '0%',
  byStatus: {
    pending: 0,
    processing: 0,
    closed: 0
  }
})

// Recent records
const recentData = ref<any[]>([])
const pendingData = ref<any[]>([])

// Trend data
const trendData = ref<any[]>([])
const templateData = ref<any[]>([])

// Closed rate
const closedRate = computed(() => {
  if (stats.value.total === 0) return 0
  return ((stats.value.byStatus?.closed || 0) / stats.value.total * 100).toFixed(1)
})

// Template chart option
const templateChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    textStyle: { color: '#64748b' }
  },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: templateData.value.map((d: any) => ({
      name: d.templateName,
      value: d.count
    }))
  }]
}))

// Trend chart option
const trendChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#475569' }
  },
  legend: {
    data: ['总数', '已结案', '处理中', '待分析'],
    bottom: 0,
    textStyle: { color: '#64748b' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: trendData.value.map(d => `${d.month}月`),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisLabel: { color: '#64748b' }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
    axisLabel: { color: '#64748b' }
  },
  series: [
    {
      name: '总数',
      type: 'line',
      data: trendData.value.map(d => d.total),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#0ea5e9' },
      itemStyle: { color: '#0ea5e9', borderWidth: 2, borderColor: '#fff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(14, 165, 233, 0.2)' },
            { offset: 1, color: 'rgba(14, 165, 233, 0)' }
          ]
        }
      }
    },
    {
      name: '已结案',
      type: 'bar',
      stack: 'status',
      data: trendData.value.map(d => d.closed),
      itemStyle: { color: '#10b981', borderRadius: [0, 0, 4, 4] }
    },
    {
      name: '处理中',
      type: 'bar',
      stack: 'status',
      data: trendData.value.map(d => d.processing),
      itemStyle: { color: '#f59e0b' }
    },
    {
      name: '待分析',
      type: 'bar',
      stack: 'status',
      data: trendData.value.map(d => d.pending),
      itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }
    }
  ]
}))

// Load data
onMounted(async () => {
  await configStore.loadConfig()
  await loadStats()
  await loadTrend()
  await loadRecentData()
})

async function loadStats() {
  try {
    const response = await $fetch('/api/stats/overview')
    if (response.success) {
      stats.value = response.data
      templateData.value = response.data.byTemplate || []
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function loadTrend() {
  try {
    const response = await $fetch('/api/stats/trend')
    if (response.success) {
      trendData.value = response.data.monthly
    }
  } catch (e) {
    console.error('Failed to load trend:', e)
  }
}

async function loadRecentData() {
  try {
    const response = await $fetch('/api/datas', {
      params: {
        page: 1,
        pageSize: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    })
    if (response.success) {
      recentData.value = response.data.records
    }

    // Load pending records
    const pendingResponse = await $fetch('/api/datas', {
      params: {
        page: 1,
        pageSize: 6,
        closureStatus: 'pending'
      }
    })
    if (pendingResponse.success) {
      pendingData.value = pendingResponse.data.records
    }
  } catch (e) {
    console.error('Failed to load records:', e)
  }
}

// Helper functions
function formatDate(date: string | Date) {
  return dayjs(date).format('YYYY-MM-DD')
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待分析',
    processing: '处理中',
    closed: '已结案'
  }
  return map[status] || status
}

function getStatusType(status: string): 'default' | 'warning' | 'success' | 'info' | 'error' {
  const map: Record<string, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
    pending: 'warning',
    processing: 'info',
    closed: 'success'
  }
  return map[status] || 'default'
}
</script>

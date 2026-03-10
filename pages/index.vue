<template>
  <div>
    <h1 class="page-title">仪表盘</h1>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-industrial-500 mb-1">客诉总数</p>
            <p class="text-3xl font-bold text-industrial-800">{{ stats.total }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-industrial-500 mb-1">本月客诉</p>
            <p class="text-3xl font-bold text-industrial-800">{{ stats.thisMonth }}</p>
            <p class="text-xs mt-1" :class="parseFloat(stats.momChange) >= 0 ? 'text-red-500' : 'text-green-500'">
              环比 {{ parseFloat(stats.momChange) >= 0 ? '+' : '' }}{{ stats.momChange }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-industrial-500 mb-1">待处理</p>
            <p class="text-3xl font-bold text-yellow-600">{{ stats.byStatus?.pending + stats.byStatus?.processing || 0 }}</p>
            <p class="text-xs text-industrial-400 mt-1">待分析 + 处理中</p>
          </div>
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-industrial-500 mb-1">已结案</p>
            <p class="text-3xl font-bold text-green-600">{{ stats.byStatus?.closed || 0 }}</p>
            <p class="text-xs text-industrial-400 mt-1">闭环率 {{ closedRate }}%</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Monthly trend chart -->
      <div class="card">
        <h2 class="section-title">月度趋势</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="trendChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- Category distribution -->
      <div class="card">
        <h2 class="section-title">问题分类分布</h2>
        <div class="h-80">
          <ClientOnly>
            <v-chart :option="categoryChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent complaints -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">最近客诉</h2>
          <n-button text @click="navigateTo('/complaints')">查看全部</n-button>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in recentComplaints"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-industrial-50 rounded-lg hover:bg-industrial-100 cursor-pointer transition-colors"
            @click="navigateTo(`/complaints/${item.id}`)"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-industrial-800 truncate">{{ item.complaintNo }}</p>
              <p class="text-sm text-industrial-500 truncate">{{ item.customer?.name || '-' }} - {{ item.internalComplaintName || '-' }}</p>
            </div>
            <n-tag :type="getStatusType(item.closureStatus)" size="small">
              {{ getStatusLabel(item.closureStatus) }}
            </n-tag>
          </div>
          <div v-if="recentComplaints.length === 0" class="text-center py-8 text-industrial-400">
            暂无数据
          </div>
        </div>
      </div>

      <!-- Pending complaints -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">待处理客诉</h2>
          <n-button text @click="navigateTo('/complaints?closureStatus=pending')">查看全部</n-button>
        </div>
        <div class="space-y-3">
          <div
            v-for="item in pendingComplaints"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 cursor-pointer transition-colors"
            @click="navigateTo(`/complaints/${item.id}`)"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-industrial-800 truncate">{{ item.complaintNo }}</p>
              <p class="text-sm text-industrial-500 truncate">{{ item.customer?.name || '-' }} - {{ item.feedbackDate ? formatDate(item.feedbackDate) : '-' }}</p>
            </div>
            <n-tag type="warning" size="small">
              {{ getStatusLabel(item.closureStatus) }}
            </n-tag>
          </div>
          <div v-if="pendingComplaints.length === 0" class="text-center py-8 text-industrial-400">
            暂无待处理客诉
          </div>
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

// Recent complaints
const recentComplaints = ref<any[]>([])
const pendingComplaints = ref<any[]>([])

// Trend data
const trendData = ref<any[]>([])
const categoryData = ref<any[]>([])

// Closed rate
const closedRate = computed(() => {
  if (stats.value.total === 0) return 0
  return ((stats.value.byStatus?.closed || 0) / stats.value.total * 100).toFixed(1)
})

// Trend chart option
const trendChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['总数', '已结案', '处理中', '待分析'],
    bottom: 0
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
    data: trendData.value.map(d => `${d.month}月`)
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '总数',
      type: 'line',
      data: trendData.value.map(d => d.total),
      smooth: true,
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: '已结案',
      type: 'bar',
      stack: 'status',
      data: trendData.value.map(d => d.closed),
      itemStyle: { color: '#22c55e' }
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
      itemStyle: { color: '#ef4444' }
    }
  ]
}))

// Category chart option
const categoryChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center'
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
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: categoryData.value.map((d: any) => ({
        name: d.categoryName,
        value: d.count
      }))
    }
  ]
}))

// Load data
onMounted(async () => {
  await configStore.loadConfig()
  await loadStats()
  await loadTrend()
  await loadCategoryStats()
  await loadRecentComplaints()
})

async function loadStats() {
  try {
    const response = await $fetch('/api/stats/overview')
    if (response.success) {
      stats.value = response.data
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

async function loadCategoryStats() {
  try {
    const response = await $fetch('/api/stats/by-category')
    if (response.success) {
      categoryData.value = response.data.byCategory
    }
  } catch (e) {
    console.error('Failed to load category stats:', e)
  }
}

async function loadRecentComplaints() {
  try {
    const response = await $fetch('/api/complaints', {
      params: {
        page: 1,
        pageSize: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    })
    if (response.success) {
      recentComplaints.value = response.data.records
    }

    // Load pending complaints
    const pendingResponse = await $fetch('/api/complaints', {
      params: {
        page: 1,
        pageSize: 5,
        closureStatus: 'pending'
      }
    })
    if (pendingResponse.success) {
      pendingComplaints.value = pendingResponse.data.records
    }
  } catch (e) {
    console.error('Failed to load complaints:', e)
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

function getStatusType(status: string) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'info'> = {
    pending: 'warning',
    processing: 'info',
    closed: 'success'
  }
  return map[status] || 'default'
}
</script>

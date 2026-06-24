<template>
  <div class="dashboard-page animate-fade-in">
    <!-- Page header with gradient background -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="flex items-center gap-4">
          <div class="header-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 class="dashboard-title">数据概览</h1>
            <p class="dashboard-subtitle">实时监控业务数据，掌握运营动态</p>
          </div>
        </div>
        <div class="header-time">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ currentTime }}</span>
        </div>
      </div>
    </div>

    <!-- Stats cards with enhanced design -->
    <div class="stats-grid">
      <!-- Total records -->
      <div class="modern-stat-card stat-card-primary hover-lift">
        <div class="stat-card-content">
          <div class="stat-info">
            <p class="stat-label">数据总量</p>
            <p class="stat-value">{{ stats.total }}</p>
            <p class="stat-desc">累计全部记录</p>
          </div>
          <div class="stat-icon-wrapper stat-icon-primary">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
        <div class="stat-card-bg stat-bg-primary"></div>
      </div>

      <!-- This month -->
      <div class="modern-stat-card stat-card-info hover-lift">
        <div class="stat-card-content">
          <div class="stat-info">
            <p class="stat-label">本月新增</p>
            <p class="stat-value">{{ stats.thisMonth }}</p>
            <div class="stat-desc-wrapper">
              <span
                v-if="stats.momChange != null && !isNaN(parseFloat(stats.momChange))"
                class="stat-trend"
                :class="parseFloat(stats.momChange) >= 0 ? 'trend-up' : 'trend-down'"
              >
                {{ parseFloat(stats.momChange) >= 0 ? '↑' : '↓' }} {{ Math.abs(parseFloat(stats.momChange)) }}%
              </span>
              <span v-else class="stat-trend stat-trend-neutral">--</span>
              <span class="stat-desc">环比上月</span>
            </div>
          </div>
          <div class="stat-icon-wrapper stat-icon-info">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="stat-card-bg stat-bg-info"></div>
      </div>

      <!-- Pending -->
      <div class="modern-stat-card stat-card-warning hover-lift">
        <div class="stat-card-content">
          <div class="stat-info">
            <p class="stat-label">待处理</p>
            <p class="stat-value">{{ (stats.byStatus?.pending || 0) + (stats.byStatus?.processing || 0) }}</p>
            <p class="stat-desc">待分析 + 处理中</p>
          </div>
          <div class="stat-icon-wrapper stat-icon-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="stat-card-bg stat-bg-warning"></div>
      </div>

      <!-- Closed -->
      <div class="modern-stat-card stat-card-success hover-lift">
        <div class="stat-card-content">
          <div class="stat-info">
            <p class="stat-label">已结案</p>
            <p class="stat-value">{{ stats.byStatus?.closed || 0 }}</p>
            <div class="stat-desc-wrapper">
              <span class="stat-rate">{{ closedRate }}%</span>
              <span class="stat-desc">闭环率</span>
            </div>
          </div>
          <div class="stat-icon-wrapper stat-icon-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="stat-card-bg stat-bg-success"></div>
      </div>
    </div>

    <!-- Charts section with enhanced containers -->
    <div class="charts-grid">
      <!-- Monthly trend chart -->
      <div class="chart-card chart-card-large">
        <div class="chart-header">
          <div class="flex items-center gap-3">
            <div class="chart-icon chart-icon-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h2 class="chart-title">月度趋势</h2>
          </div>
          <div class="chart-badge">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>近12个月</span>
          </div>
        </div>
        <div class="chart-body">
          <ClientOnly>
            <v-chart :option="trendChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- Template distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="flex items-center gap-3">
            <div class="chart-icon chart-icon-success">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h2 class="chart-title">模板分布</h2>
          </div>
        </div>
        <div class="chart-body">
          <ClientOnly>
            <v-chart :option="templateChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- Recent records section with enhanced design -->
    <div class="content-grid">
      <!-- Recent records -->
      <div class="content-card">
        <div class="content-header">
          <div class="flex items-center gap-3">
            <div class="content-icon content-icon-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="content-title">最近记录</h2>
          </div>
          <n-button class="view-all-btn" @click="navigateTo('/datas')">
            查看全部
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </n-button>
        </div>
        <div class="content-body">
          <div class="record-list">
            <div
              v-for="item in recentData"
              :key="item.id"
              class="record-item hover-lift"
              @click="navigateTo(`/datas/${item.id}`)"
            >
              <div class="record-info">
                <div class="record-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="record-text">
                  <p class="record-title">{{ item.dataNo }}</p>
                  <p class="record-subtitle">{{ item.customer?.name || '-' }}</p>
                </div>
              </div>
              <n-tag :type="getStatusType(item.closureStatus)" size="small" :bordered="false" class="record-tag">
                {{ getStatusLabel(item.closureStatus) }}
              </n-tag>
            </div>
          </div>
          <div v-if="recentData.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="empty-title">暂无数据</p>
            <p class="empty-desc">暂无记录</p>
          </div>
        </div>
      </div>

      <!-- Pending records -->
      <div class="content-card" v-if="pendingData.length > 0">
        <div class="content-header">
          <div class="flex items-center gap-3">
            <div class="content-icon content-icon-warning">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="content-title">待处理记录</h2>
            <span class="pending-count">{{ pendingData.length }}</span>
          </div>
          <n-button class="view-all-btn" @click="navigateTo('/datas?closureStatus=pending')">
            查看全部
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </n-button>
        </div>
        <div class="content-body">
          <div class="pending-grid">
            <div
              v-for="item in pendingData"
              :key="item.id"
              class="pending-item hover-lift"
              @click="navigateTo(`/datas/${item.id}`)"
            >
              <div class="pending-header">
                <span class="pending-title">{{ item.dataNo }}</span>
                <n-tag type="warning" size="small" :bordered="false">{{ getStatusLabel(item.closureStatus) }}</n-tag>
              </div>
              <p class="pending-customer">{{ item.customer?.name || '-' }}</p>
              <div class="pending-footer">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>反馈日期: {{ item.feedbackDate ? formatDate(item.feedbackDate) : '-' }}</span>
              </div>
            </div>
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

// Current time display
const currentTime = computed(() => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
})

// Update time every second
let timer: any = null
onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
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

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-icon-wrapper {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2), 0 2px 4px -1px rgba(14, 165, 233, 0.1);
}

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.dashboard-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.header-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.modern-stat-card {
  position: relative;
  background: #ffffff;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
}

.modern-stat-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04);
  transform: translateY(-4px);
}

.stat-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 0.75rem;
}

.stat-desc-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-trend {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.trend-up {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.trend-down {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-trend-neutral {
  background: rgba(100, 116, 139, 0.1);
  color: #94a3b8;
}

.stat-rate {
  font-size: 0.75rem;
  font-weight: 600;
  color: #10b981;
  padding: 0.125rem 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 9999px;
}

.stat-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.stat-icon-wrapper {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.stat-icon-info {
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
  color: #0891b2;
}

.stat-icon-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}

.stat-icon-success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.stat-card-bg {
  position: absolute;
  bottom: -1rem;
  right: -1rem;
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  opacity: 0.1;
  transition: all 0.3s ease;
}

.stat-bg-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.stat-bg-info {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.stat-bg-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-bg-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.modern-stat-card:hover .stat-card-bg {
  transform: scale(1.2);
  opacity: 0.15;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 1024px) {
  .charts-grid {
    grid-template-columns: 2fr 1fr;
  }
}

.chart-card {
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

.chart-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.chart-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-icon-primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.chart-icon-success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.chart-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.chart-body {
  padding: 1.5rem;
  height: 20rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.content-card {
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
}

.content-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

.content-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.content-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.content-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-icon-primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.content-icon-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}

.pending-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.view-all-btn {
  font-size: 0.875rem;
  color: #0ea5e9;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  color: #0284c7;
}

.content-body {
  padding: 1.25rem 1.5rem;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.record-item:hover {
  background: #f1f5f9;
  border-color: rgba(14, 165, 233, 0.2);
}

.record-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.record-icon-wrapper {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.record-item:hover .record-icon-wrapper {
  color: #0ea5e9;
  box-shadow: 0 2px 4px rgba(14, 165, 233, 0.1);
}

.record-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.record-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}

.record-subtitle {
  font-size: 0.75rem;
  color: #64748b;
}

.record-tag {
  font-weight: 500;
}

.pending-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .pending-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.pending-item {
  padding: 1rem;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(245, 158, 11, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pending-item:hover {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.1);
}

.pending-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.pending-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}

.pending-customer {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.pending-footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  color: #cbd5e1;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.25rem;
}

.empty-desc {
  font-size: 0.875rem;
  color: #94a3b8;
}
</style>

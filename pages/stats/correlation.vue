<template>
  <div class="animate-fade-in">
    <div class="flex items-center gap-4 mb-6">
      <n-button text @click="navigateTo('/stats/custom')" class="hover:bg-corporate-100 rounded-lg p-2">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-corporate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </template>
      </n-button>
      <div>
        <h1 class="page-title">关联分析</h1>
        <p class="page-subtitle">分析弊病源与具体不良点的关联关系</p>
      </div>
    </div>

    <!-- All defect sources overview -->
    <div class="card mb-6">
      <h3 class="section-title">各弊病源投诉数量</h3>
      <div class="h-80">
        <ClientOnly>
          <v-chart v-if="sources.length > 0" :option="sourcesChartOption" autoresize />
          <div v-else class="h-full flex items-center justify-center text-corporate-400">暂无数据</div>
        </ClientOnly>
      </div>
    </div>

    <!-- Interactive correlation -->
    <div class="card mb-6">
      <h3 class="section-title">弊病源 → 具体不良点关联</h3>
      <div class="flex items-center gap-4 mb-4">
        <span class="text-sm text-corporate-600">选择弊病源：</span>
        <n-select
          v-model:value="selectedSource"
          :options="sourceOptions"
          placeholder="选择弊病源查看关联不良点"
          clearable
          filterable
          style="width:300px"
          @update:value="loadCorrelation"
        />
      </div>
      <div v-if="correlation.length > 0" class="h-80">
        <ClientOnly>
          <v-chart :option="correlationChartOption" autoresize />
        </ClientOnly>
      </div>
      <div v-else-if="selectedSource" class="py-8 text-center text-corporate-400">
        该弊病源暂无不良点数据
      </div>
      <div v-else class="py-8 text-center text-corporate-400">
        请选择一个弊病源查看最常见的具体不良点
      </div>
    </div>

    <!-- Cross table -->
    <div v-if="correlation.length > 0" class="card">
      <h3 class="section-title">详细列表：{{ selectedSource }} → 常见不良点</h3>
      <n-data-table
        :columns="correlationColumns"
        :data="correlation"
        :bordered="false"
        size="small"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { use, graphic } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const selectedSource = ref<string | null>(null)
const sources = ref<any[]>([])
const correlation = ref<any[]>([])

const sourceOptions = computed(() =>
  sources.value.map(s => ({ label: `${s.name} (${s.count})`, value: s.name }))
)

// Sources pie chart
const sourcesChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: sources.value.map(s => ({ name: s.name, value: s.count }))
  }]
}))

// Correlation chart
const correlationChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
  title: { text: `${selectedSource.value} → 具体不良点分布`, left: 'center', top: 0, textStyle: { fontSize: 14 } },
  xAxis: { type: 'value' },
  yAxis: { type: 'category', data: correlation.value.map(d => d.specificDefect).reverse(), axisLabel: { width: 120, overflow: 'truncate' } },
  series: [{
    type: 'bar',
    data: correlation.value.map(d => d.count).reverse(),
    itemStyle: {
      color: new graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#8b5cf6' },
        { offset: 1, color: '#6d28d9' }
      ]),
      borderRadius: [0, 4, 4, 0]
    }
  }]
}))

const correlationColumns = [
  { title: '排名', key: 'rank', width: 60 },
  { title: '具体不良点', key: 'specificDefect' },
  { title: '出现次数', key: 'count', width: 100 }
].map((c: any, i) => i === 0 ? c : c)

// Add rank to data
const rankedCorrelation = computed(() =>
  correlation.value.map((d, i) => ({ ...d, rank: i + 1 }))
)

async function loadSources() {
  try {
    const resp = await $fetch('/api/stats/correlation') as any
    if (resp.success) {
      sources.value = resp.data.sources || []
    }
  } catch (e) { console.error(e) }
}

async function loadCorrelation() {
  if (!selectedSource.value) {
    correlation.value = []
    return
  }
  try {
    const resp = await $fetch('/api/stats/correlation', { params: { defectSource: selectedSource.value } }) as any
    if (resp.success) {
      correlation.value = resp.data.correlation || []
    }
  } catch (e) { console.error(e) }
}

onMounted(() => loadSources())
</script>

<template>
  <div class="analysis-panel border rounded-xl bg-white shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-semibold text-gray-700 truncate">{{ title || '新建分析' }}</span>
        <n-tag v-if="result" type="info" size="tiny">{{ total }} 条</n-tag>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <n-button v-if="result" size="tiny" quaternary @click="exportCSV" title="导出CSV">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></template>
        </n-button>
        <n-button size="tiny" quaternary @click="$emit('delete', panelId)" title="移除面板">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
        </n-button>
      </div>
    </div>

    <!-- Controls -->
    <div class="px-4 py-3 space-y-2 bg-white border-b">
      <div class="grid grid-cols-2 gap-2">
        <n-select v-model:value="tid" :options="tplOpts" placeholder="选择模板" size="small" filterable clearable @update:value="onTemplateChange" />
        <n-select v-model:value="gField" :options="fieldOpts" placeholder="选择分析字段" size="small" filterable :disabled="!tid" />
      </div>
      <div class="grid grid-cols-3 gap-2">
        <n-select v-model:value="chartType" :options="chartOpts" size="small" />
        <n-date-picker v-model:value="dr" type="daterange" size="small" clearable placeholder="日期范围" />
        <n-button type="primary" :loading="loading" :disabled="!gField" @click="run" size="small" block>
          开始分析
        </n-button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 py-12 text-center">
      <n-spin size="medium" />
      <p class="text-xs text-gray-400 mt-2">正在分析数据...</p>
    </div>

    <!-- Results -->
    <template v-if="result && !loading">
      <!-- Stats summary -->
      <div class="grid grid-cols-4 gap-2 px-4 py-3 border-b bg-gray-50/50">
        <div class="text-center">
          <p class="text-xs text-gray-400">总计</p>
          <p class="text-lg font-bold text-gray-800">{{ total }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-400">分类数</p>
          <p class="text-lg font-bold text-primary-600">{{ data.length }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-400">最高</p>
          <p class="text-sm font-semibold text-gray-700 truncate" :title="topItem?.name">{{ topItem?.name || '-' }}</p>
          <p class="text-xs text-primary-600">{{ topItem?.count || 0 }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-400">占比</p>
          <p class="text-lg font-bold text-amber-600">{{ topItem?.percentage || '0' }}%</p>
        </div>
      </div>

      <!-- Chart -->
      <div class="px-4 py-3" style="height:280px">
        <ClientOnly>
          <v-chart v-if="data.length" :option="chartOption" autoresize style="height:100%" />
        </ClientOnly>
      </div>

      <!-- Data table -->
      <div class="px-4 pb-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-400">{{ fLabel }} 分布明细</span>
          <n-input v-model:value="tableSearch" size="tiny" placeholder="搜索..." clearable style="width:140px" />
        </div>
        <n-data-table
          :columns="cols"
          :data="filteredData"
          size="small"
          :max-height="240"
          :bordered="false"
          :single-line="false"
          virtual-scroll
        />
      </div>

      <!-- Actions -->
      <div class="px-4 pb-3 flex items-center justify-between">
        <div class="flex flex-wrap gap-1">
          <n-tag v-for="d in data.slice(0, 8)" :key="d.name" size="small" closable type="info" @click="filterBy(d.name)">
            {{ d.name }} ({{ d.count }})
          </n-tag>
        </div>
        <n-button size="tiny" quaternary type="primary" @click="$emit('save', currentConfig)">
          保存此分析
        </n-button>
      </div>
    </template>

    <!-- Empty -->
    <div v-if="!loading && !result && !tid" class="px-4 py-16 text-center text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      <p class="text-sm font-medium">选择模板和字段开始分析</p>
      <p class="text-xs mt-1">支持柱状图、饼图、环形图、横向柱状图</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

use([CanvasRenderer, BarChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

interface PanelConfig {
  templateId: number | null
  groupByField: string | null
  fieldLabel: string
  chartType: 'bar' | 'pie' | 'donut' | 'hbar'
  dateRange: { start: string; end: string } | null
  limit: number
}

const props = defineProps<{
  panelId: number
  title?: string
  savedAnalysisId?: number | null
  initialConfig?: PanelConfig | null
}>()

const emit = defineEmits<{
  delete: [panelId: number]
  save: [config: PanelConfig & { name?: string; savedAnalysisId?: number | null }]
}>()

const router = useRouter()
const message = useMessage()

const templates = ref<any[]>([])
const fields = ref<any[]>([])
const tid = ref<number | null>(props.initialConfig?.templateId || null)
const gField = ref<string | null>(props.initialConfig?.groupByField || null)
const chartType = ref<'bar' | 'pie' | 'donut' | 'hbar'>(props.initialConfig?.chartType || 'bar')
const dr = ref<[number, number] | null>(
  props.initialConfig?.dateRange
    ? [new Date(props.initialConfig.dateRange.start).getTime(), new Date(props.initialConfig.dateRange.end).getTime()]
    : null
)
const loading = ref(false)
const data = ref<any[]>([])
const total = ref(0)
const result = ref(false)
const tableSearch = ref('')

const tplOpts = computed(() => templates.value.map((t: any) => ({ label: t.name, value: t.id })))
const fieldOpts = computed(() => fields.value.map((f: any) => ({
  label: `${f.fieldLabel}`,
  value: f.fieldKey
})))
const chartOpts = [
  { label: '柱状图', value: 'bar' },
  { label: '横向柱状图', value: 'hbar' },
  { label: '饼图', value: 'pie' },
  { label: '环形图', value: 'donut' }
]
const fLabel = computed(() => fields.value.find((f: any) => f.fieldKey === gField.value)?.fieldLabel || gField.value || '')
const topItem = computed(() => data.value[0] || null)

const cols = [
  { title: '#', key: 'rank', width: 40, sorter: (a: any, b: any) => a.rank - b.rank },
  { title: '名称', key: 'name', ellipsis: { tooltip: true }, sorter: (a: any, b: any) => String(a.name).localeCompare(String(b.name)) },
  { title: '数量', key: 'count', width: 70, sorter: (a: any, b: any) => a.count - b.count },
  { title: '占比', key: 'percentage', width: 65, sorter: (a: any, b: any) => parseFloat(a.percentage) - parseFloat(b.percentage) }
]

const filteredData = computed(() => {
  if (!tableSearch.value) return data.value
  const q = tableSearch.value.toLowerCase()
  return data.value.filter(d => String(d.name).toLowerCase().includes(q))
})

const currentConfig = computed<PanelConfig>(() => ({
  templateId: tid.value,
  groupByField: gField.value,
  fieldLabel: fLabel.value,
  chartType: chartType.value,
  dateRange: dr.value
    ? { start: dayjs(dr.value[0]).format('YYYY-MM-DD'), end: dayjs(dr.value[1]).format('YYYY-MM-DD') }
    : null,
  limit: 30
}))

const COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6366f1','#0ea5e9','#10b981','#f43f5e','#a855f7','#d946ef']

const chartOption = computed(() => {
  const d = data.value
  if (!d.length) return {}
  if (chartType.value === 'pie' || chartType.value === 'donut') {
    const innerRadius = chartType.value === 'donut' ? ['40%', '70%'] : ['0%', '65%']
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: innerRadius, center: ['38%', '50%'],
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
        data: d.map((x, i) => ({ name: x.name, value: x.count, itemStyle: { color: COLORS[i % 16] } }))
      }]
    }
  }
  if (chartType.value === 'hbar') {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 3, right: 4, bottom: 3, top: 3, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: d.map(x => x.name).reverse(), axisLabel: { width: 110, overflow: 'truncate', fontSize: 10 } },
      series: [{ type: 'bar', data: d.map((x, i) => ({ value: x.count, itemStyle: { color: COLORS[(d.length - 1 - i) % 16], borderRadius: [0, 3, 3, 0] } })).reverse() }]
    }
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 3, right: 4, bottom: 8, top: 8, containLabel: true },
    xAxis: { type: 'category', data: d.map(x => x.name), axisLabel: { rotate: 35, width: 80, overflow: 'truncate', fontSize: 9 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: d.map((x, i) => ({ value: x.count, itemStyle: { color: COLORS[i % 16], borderRadius: [3, 3, 0, 0] } })) }]
  }
})

async function onTemplateChange(val: number | null) {
  fields.value = []
  gField.value = null
  result.value = false
  data.value = []
  if (!val) return
  try {
    const resp = await $fetch(`/api/templates/${val}/filter-fields`) as any
    if (resp.success) fields.value = resp.data || []
  } catch (e: any) {
    message.error('加载字段失败: ' + (e.data?.statusMessage || e.message))
  }
}

async function run() {
  if (!gField.value) return
  loading.value = true
  result.value = false
  data.value = []
  try {
    const params: any = { groupBy: gField.value, limit: 30 }
    if (tid.value) params.templateId = tid.value
    if (dr.value) {
      params.startDate = dayjs(dr.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dr.value[1]).format('YYYY-MM-DD')
    }
    const resp = await $fetch('/api/stats/custom', { params }) as any
    if (resp.success) {
      data.value = (resp.data.results || []).map((d: any, i: number) => ({ ...d, rank: i + 1 }))
      total.value = resp.data.total
      result.value = true
    }
  } catch (e: any) {
    message.error('分析失败: ' + (e.data?.statusMessage || e.message))
  } finally {
    loading.value = false
  }
}

function exportCSV() {
  if (!data.value.length) return
  const header = '排名,名称,数量,占比(%)\n'
  const rows = data.value.map(d => `${d.rank},"${d.name}",${d.count},${d.percentage}`).join('\n')
  const BOM = '﻿'
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fLabel.value}_分析结果_${dayjs().format('YYYYMMDD')}.csv`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

function filterBy(name: string) {
  router.push(`/complaints?keyword=${encodeURIComponent(name)}`)
}

onMounted(async () => {
  try {
    const r = await $fetch('/api/templates') as any
    if (r.success) templates.value = r.data
  } catch (e) { console.error(e) }

  if (props.initialConfig?.templateId) {
    tid.value = props.initialConfig.templateId
    await onTemplateChange(props.initialConfig.templateId)
    if (props.initialConfig.groupByField) {
      gField.value = props.initialConfig.groupByField
    }
    if (props.initialConfig.chartType) {
      chartType.value = props.initialConfig.chartType
    }
    if (gField.value) {
      await nextTick()
      run()
    }
  }
})
</script>

<template>
  <div class="analysis-panel border rounded-xl bg-white shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-1.5 h-5 rounded-full" :class="result ? 'bg-green-400' : 'bg-gray-300'" />
        <span class="text-sm font-semibold text-gray-700 truncate">{{ displayTitle }}</span>
        <n-tag v-if="result" :type="isTrendMode ? 'success' : 'info'" size="tiny" :bordered="false">
          {{ trendStats ? trendStats.count + '点' : total + '条' }}
        </n-tag>
      </div>
      <div class="flex items-center gap-0.5 shrink-0">
        <n-button v-if="result" size="tiny" quaternary @click="exportCSV" title="导出CSV">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></template>
        </n-button>
        <n-button v-if="result" size="tiny" quaternary type="primary" @click="$emit('save', currentConfig)" title="保存配置">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg></template>
        </n-button>
        <n-button size="tiny" quaternary type="error" @click="$emit('delete', panelId)" title="移除面板">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
        </n-button>
      </div>
    </div>

    <!-- Controls area -->
    <div class="px-4 py-3 space-y-2.5 bg-white border-b">
      <!-- Step 1: Template -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 w-5 shrink-0">1.</span>
        <n-select v-model:value="tid" :options="tplOpts" placeholder="选择数据模板" size="small" filterable clearable @update:value="onTemplateChange" class="flex-1" />
      </div>

      <!-- Step 2: Fields + Chart type -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 w-5 shrink-0">2.</span>
        <n-select v-model:value="gField" :options="fieldOpts" placeholder="选择分析字段（可多选）" size="small" filterable multiple :disabled="!tid" :max-tag-count="3" @update:value="onFieldChange" class="flex-1" />
        <n-select v-model:value="chartType" :options="chartOpts" size="small" style="width:110px" :disabled="!gField.length" />
      </div>

      <!-- Step 3: Filters (date + time) -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 w-5 shrink-0">3.</span>
        <n-date-picker v-model:value="dr" type="daterange" size="small" clearable placeholder="日期范围筛选" class="flex-1" @update:value="onFilterChange" />
        <Transition name="slide-fade">
          <n-select v-if="isNumericField && chartType === 'line'" v-model:value="timeField" :options="timeOpts" size="small" style="width:150px" placeholder="时间列（可选）" clearable @update:value="onFilterChange" />
        </Transition>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 py-16 text-center">
      <n-spin size="medium" />
      <p class="text-xs text-gray-400 mt-3">正在加载数据...</p>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !result && !tid" class="px-4 py-12 text-center text-gray-400">
      <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      </div>
      <p class="text-sm font-medium">选择模板开始分析</p>
      <p class="text-xs mt-1">选择一个数据模板和字段，自动生成可视化图表</p>
    </div>

    <div v-if="!loading && !result && tid && !gField.length" class="px-4 py-12 text-center text-gray-400">
      <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6"/></svg>
      </div>
      <p class="text-sm font-medium">请选择分析字段</p>
      <p class="text-xs mt-1">选中字段后将自动进行分析</p>
    </div>

    <!-- Results -->
    <template v-if="result && !loading">
      <!-- Trend mode summary bar -->
      <div v-if="isTrendMode && trendStats" class="flex items-center divide-x divide-gray-200 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-white border-b">
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">数据点</p>
          <p class="text-sm font-bold text-gray-700">{{ trendStats.count }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">均值</p>
          <p class="text-sm font-bold text-blue-600">{{ trendStats.avg }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">最小</p>
          <p class="text-sm font-bold text-green-600">{{ trendStats.min }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">最大</p>
          <p class="text-sm font-bold text-amber-600">{{ trendStats.max }}</p>
        </div>
      </div>

      <!-- Group mode summary bar -->
      <div v-else class="flex items-center divide-x divide-gray-200 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b">
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">总计</p>
          <p class="text-sm font-bold text-gray-700">{{ total }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">分类</p>
          <p class="text-sm font-bold text-primary-600">{{ data.length }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">最高项</p>
          <p class="text-xs font-semibold text-gray-700 truncate px-1" :title="topItem?.name">{{ topItem?.name || '-' }}</p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-wide">占比</p>
          <p class="text-sm font-bold text-amber-600">{{ topItem?.percentage || '0' }}%</p>
        </div>
      </div>

      <!-- Chart -->
      <div class="px-4 py-3" style="height:290px">
        <ClientOnly>
          <v-chart v-if="data.length" :option="chartOption" autoresize style="height:100%" />
          <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">无数据可显示</div>
        </ClientOnly>
      </div>

      <!-- Table -->
      <div class="px-4 pb-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-400">{{ isTrendMode ? '趋势' : '分布' }}明细</span>
          <n-input v-model:value="tableSearch" size="tiny" placeholder="搜索..." clearable style="width:130px" />
        </div>
        <n-data-table
          :columns="isTrendMode ? trendCols : cols"
          :data="filteredData"
          size="small"
          :max-height="200"
          :bordered="false"
          :single-line="false"
          virtual-scroll
        />
      </div>

      <!-- Tags (group mode only) -->
      <div v-if="!isTrendMode && data.length" class="px-4 pb-3 flex flex-wrap gap-1">
        <n-tag v-for="d in data.slice(0, 10)" :key="d.name" size="small" closable type="info" @click="filterBy(d.name)">
          {{ d.name }} ({{ d.count }})
        </n-tag>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

use([CanvasRenderer, BarChart, PieChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const props = defineProps<{ panelId: number; title?: string; savedAnalysisId?: number | null; initialConfig?: any | null }>()
const emit = defineEmits<{ delete: [panelId: number]; save: [config: any] }>()

const router = useRouter()
const message = useMessage()
const templates = ref<any[]>([])
const fields = ref<any[]>([])
const tid = ref<number | null>(props.initialConfig?.templateId || null)
const gField = ref<string[]>(Array.isArray(props.initialConfig?.groupByField) ? props.initialConfig.groupByField : (props.initialConfig?.groupByField ? [props.initialConfig.groupByField] : []))
const chartType = ref<string>(props.initialConfig?.chartType || 'bar')
const dr = ref<[number, number] | null>(props.initialConfig?.dateRange ? [new Date(props.initialConfig.dateRange.start).getTime(), new Date(props.initialConfig.dateRange.end).getTime()] : null)
const timeFieldInit = props.initialConfig?.timeField || null
const loading = ref(false)
const data = ref<any[]>([])
const total = ref(0)
const result = ref(false)
const tableSearch = ref('')
const trendStats = ref<{ avg: number; min: number; max: number; count: number } | null>(null)
const isTrendMode = ref(false)
const timeField = ref<string | null>(null)

// ── Computed ──

const selectedTemplateName = computed(() => {
  if (!tid.value) return ''
  return templates.value.find((t: any) => t.id === tid.value)?.name || ''
})

const displayTitle = computed(() => {
  if (props.title && result.value) return props.title
  if (selectedTemplateName.value) {
    const prefix = gField.value.length ? '分析' : '选择字段'
    return `${selectedTemplateName.value} · ${prefix}`
  }
  return '新建分析'
})

const tplOpts = computed(() => templates.value.map((t: any) => ({ label: t.name, value: t.id })))
const fieldOpts = computed(() => fields.value.map((f: any) => {
  const isNum = f.fieldType === 'number'
  return {
    label: `${f.fieldLabel}${isNum ? ' 🔢' : ''}`,
    value: f.fieldKey
  }
}))
const isNumericField = computed(() => {
  if (!gField.value.length) return false
  return gField.value.some(k => fields.value.find((f: any) => f.fieldKey === k)?.fieldType === 'number')
})
const chartOpts = computed(() => {
  const opts = [
    { label: '柱状图', value: 'bar' },
    { label: '横向柱状图', value: 'hbar' },
    { label: '饼图', value: 'pie' },
    { label: '环形图', value: 'donut' },
  ]
  if (isNumericField.value) {
    opts.push({ label: '趋势图', value: 'line' })
  }
  return opts
})
const timeOpts = computed(() => {
  const opts: { label: string; value: string }[] = [
    { label: '按数据顺序', value: '' },
    { label: '反馈日期', value: '__feedbackDate' },
    { label: '创建时间', value: '__createdAt' },
  ]
  for (const f of fields.value) {
    if ((f as any).fieldType === 'date') {
      opts.push({ label: f.fieldLabel, value: f.fieldKey })
    }
  }
  return opts
})
const fLabel = computed(() => {
  if (!gField.value.length) return ''
  return gField.value.map(k => fields.value.find((f: any) => f.fieldKey === k)?.fieldLabel || k).join(' / ')
})
const topItem = computed(() => data.value[0] || null)

const cols = [
  { title: '#', key: 'rank', width: 40 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '数量', key: 'count', width: 70 },
  { title: '占比', key: 'percentage', width: 65 }
]
const trendCols = [
  { title: '#', key: 'rank', width: 40 },
  { title: '时间/序号', key: 'name', ellipsis: { tooltip: true } },
  { title: '数值', key: 'value', width: 80 }
]

const filteredData = computed(() => {
  if (!tableSearch.value) return data.value
  const q = tableSearch.value.toLowerCase()
  return data.value.filter((d: any) => String(d.name).toLowerCase().includes(q))
})

const currentConfig = computed(() => ({
  templateId: tid.value, groupByField: gField.value, fieldLabel: fLabel.value, chartType: chartType.value,
  dateRange: dr.value ? { start: dayjs(dr.value[0]).format('YYYY-MM-DD'), end: dayjs(dr.value[1]).format('YYYY-MM-DD') } : null,
  timeField: timeField.value,
  limit: 30
}))

const COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6366f1','#0ea5e9','#10b981','#f43f5e','#a855f7','#d946ef']

// ── Chart config ──

const chartOption = computed(() => {
  const d = data.value; if (!d.length) return {}
  if (chartType.value === 'line') {
    // Determine if X axis values look like dates
    const isDateX = d.length > 0 && /^\d{4}-\d{2}-\d{2}/.test(String(d[0].name))
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params
          return `${p.name}<br/><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-right:6px"></span>${fLabel.value}: <b>${p.value}</b>`
        }
      },
      grid: { left: 8, right: 12, bottom: isDateX ? 24 : 8, top: 12, containLabel: true },
      xAxis: {
        type: 'category',
        data: d.map((x: any) => x.name),
        axisLabel: { rotate: isDateX ? 35 : 0, width: 90, overflow: 'truncate', fontSize: 9, interval: isDateX ? 'auto' : Math.max(1, Math.floor(d.length / 15)) },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', scale: true,
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { fontSize: 10 }
      },
      series: [{
        type: 'line',
        data: d.map((x: any) => x.value),
        smooth: d.length < 50,
        symbol: d.length > 30 ? 'none' : 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.2)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' }
            ]
          }
        },
        markLine: trendStats.value ? {
          silent: true, symbol: 'none',
          lineStyle: { type: 'dashed', color: '#9ca3af', width: 1 },
          data: [{ yAxis: trendStats.value.avg, label: { formatter: `均值 ${trendStats.value.avg}`, fontSize: 10, color: '#6b7280' } }],
        } : undefined
      }]
    }
  }
  if (chartType.value === 'pie' || chartType.value === 'donut') {
    const innerRadius = chartType.value === 'donut' ? ['40%', '70%'] : ['0%', '65%']
    // Only show top 12 in pie, others grouped
    const pieData = d.length > 12
      ? [...d.slice(0, 12).map((x: any, i: number) => ({ name: x.name, value: x.count, itemStyle: { color: COLORS[i % 16] } })), { name: '其他', value: d.slice(12).reduce((s: number, x: any) => s + x.count, 0), itemStyle: { color: '#d1d5db' } }]
      : d.map((x: any, i: number) => ({ name: x.name, value: x.count, itemStyle: { color: COLORS[i % 16] } }))
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 10 } },
      series: [{ type: 'pie', radius: innerRadius, center: ['38%', '50%'], itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1.5 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 11, fontWeight: 'bold' } }, data: pieData }]
    }
  }
  if (chartType.value === 'hbar') {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 3, right: 4, bottom: 3, top: 3, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } } },
      yAxis: { type: 'category', data: d.map((x: any) => x.name).reverse(), axisLabel: { width: 110, overflow: 'truncate', fontSize: 10 }, axisTick: { show: false } },
      series: [{ type: 'bar', data: d.map((x: any, i: number) => ({ value: x.count, itemStyle: { color: COLORS[(d.length - 1 - i) % 16], borderRadius: [0, 3, 3, 0] } })).reverse() }]
    }
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 3, right: 4, bottom: 8, top: 8, containLabel: true },
    xAxis: { type: 'category', data: d.map((x: any) => x.name), axisLabel: { rotate: 35, width: 80, overflow: 'truncate', fontSize: 9 }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [{ type: 'bar', data: d.map((x: any, i: number) => ({ value: x.count, itemStyle: { color: COLORS[i % 16], borderRadius: [3, 3, 0, 0] } })) }]
  }
})

// ── Auto-run timer ──
let autoRunTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRun() {
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (!gField.value.length) return
  autoRunTimer = setTimeout(() => run(), 300)
}

// ── Event handlers ──

async function onTemplateChange(val: number | null) {
  fields.value = []; gField.value = []; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false; timeField.value = null
  if (!val) return
  try {
    const resp = await $fetch(`/api/templates/${val}/filter-fields`) as any
    if (resp.success) fields.value = resp.data || []
  } catch (e: any) { message.error('加载字段失败') }
}

function onFieldChange() {
  // Auto-adapt chart type based on field type
  if (isNumericField.value && chartType.value !== 'line') {
    chartType.value = 'line'
  } else if (!isNumericField.value && chartType.value === 'line') {
    chartType.value = 'bar'
  }
  // Auto-run on field change
  scheduleRun()
}

function onFilterChange() {
  // Auto-run when filters change (if already have results)
  if (result.value || gField.value.length) scheduleRun()
}

async function run() {
  if (!gField.value.length) return; loading.value = true; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false
  try {
    const useTrend = isNumericField.value && chartType.value === 'line'
    const params: any = { groupBy: gField.value.join(','), limit: 50 }
    if (tid.value) params.templateId = tid.value
    if (dr.value) { params.startDate = dayjs(dr.value[0]).format('YYYY-MM-DD'); params.endDate = dayjs(dr.value[1]).format('YYYY-MM-DD') }
    if (useTrend) {
      params.mode = 'trend'
      if (timeField.value) params.timeField = timeField.value
    }
    const resp = await $fetch('/api/stats/custom', { params }) as any
    if (resp.success) {
      data.value = (resp.data.results || []).map((d: any, i: number) => ({ ...d, rank: i + 1 }))
      total.value = resp.data.total
      if (resp.data.mode === 'trend' && resp.data.stats) {
        isTrendMode.value = true
        trendStats.value = resp.data.stats
      }
      result.value = true
    }
  } catch (e: any) {
    message.error('分析失败')
    result.value = false
  } finally { loading.value = false }
}

// ── Export ──

function exportCSV() {
  if (!data.value.length) return
  const BOM = '\uFEFF'
  let header: string, rows: string
  if (isTrendMode.value) {
    header = '序号,时间/序号,数值\n'
    rows = data.value.map((d: any) => `${d.rank},"${d.name}",${d.value}`).join('\n')
  } else {
    header = '排名,名称,数量,占比(%)\n'
    rows = data.value.map((d: any) => `${d.rank},"${d.name}",${d.count},${d.percentage}`).join('\n')
  }
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${fLabel.value}_${isTrendMode.value ? '趋势' : '分析'}_${dayjs().format('YYYYMMDD')}.csv`; a.click()
  URL.revokeObjectURL(url); message.success('导出成功')
}

function filterBy(name: string) { router.push(`/complaints?keyword=${encodeURIComponent(name)}`) }

// ── Init ──

onMounted(async () => {
  try { const r = await $fetch('/api/templates') as any; if (r.success) templates.value = r.data } catch (e) { console.error(e) }
  if (props.initialConfig?.templateId) {
    tid.value = props.initialConfig.templateId
    await onTemplateChange(props.initialConfig.templateId)
    const gbf = props.initialConfig.groupByField
    gField.value = Array.isArray(gbf) ? gbf : (gbf ? [gbf] : [])
    if (timeFieldInit) timeField.value = timeFieldInit
    await nextTick()
    if (gField.value.length) run()
  }
})

onBeforeUnmount(() => {
  if (autoRunTimer) clearTimeout(autoRunTimer)
})
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.15s ease-in;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>

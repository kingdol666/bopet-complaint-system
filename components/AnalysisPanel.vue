<template>
  <div class="analysis-panel">
    <div class="panel-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="panel-status-indicator" :class="result ? 'active' : 'inactive'" />
          <span class="panel-title">{{ displayTitle }}</span>
          <n-tag v-if="result" :type="isTrendMode ? 'success' : 'primary'" size="small" :bordered="false" class="data-count-tag">
            {{ trendStats ? trendStats.count + '点' : total + '条' }}
          </n-tag>
        </div>
        <div class="flex items-center gap-1 shrink-0 panel-actions">
          <n-button v-if="result" size="small" quaternary @click="exportCSV" title="导出CSV" class="action-btn">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></template>
          </n-button>
          <n-button v-if="result" size="small" quaternary type="primary" @click="$emit('save', currentConfig)" title="保存配置" class="action-btn">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-4 4m0 0l-4-4m4 4V4"/></svg></template>
          </n-button>
          <n-button size="small" quaternary type="error" @click="$emit('delete', panelId)" title="移除面板" class="action-btn">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
          </n-button>
        </div>
      </div>
    </div>

    <div class="panel-controls">
      <div class="control-row">
        <div class="control-step-badge">1</div>
        <n-select v-model:value="tid" :options="tplOpts" placeholder="选择数据模板" size="small" filterable clearable @update:value="onTemplateChange" class="control-select" />
      </div>

      <div class="control-row">
        <div class="control-step-badge">2</div>
        <n-select v-model:value="gField" :options="fieldOpts" placeholder="选择分析字段（可多选）" size="small" filterable multiple :disabled="!tid" :max-tag-count="3" @update:value="onFieldChange" class="control-select control-select-flex" />
        <n-select v-model:value="chartType" :options="chartOpts" size="small" class="control-select-chart" :disabled="!gField.length" />
      </div>

      <div class="control-row">
        <div class="control-step-badge">3</div>
        <n-date-picker v-model:value="dr" type="daterange" size="small" clearable placeholder="日期范围筛选" class="control-select" @update:value="onFilterChange" />
        <Transition name="slide-fade">
          <n-select v-if="isNumericField && chartType === 'line'" v-model:value="timeField" :options="timeOpts" size="small" class="control-select-time" placeholder="时间列（可选）" clearable @update:value="onFilterChange" />
        </Transition>
      </div>
    </div>

    <div v-if="loading" class="panel-loading">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">正在加载数据...</p>
    </div>

    <div v-if="!loading && !result && !tid" class="panel-empty">
      <div class="empty-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      </div>
      <p class="empty-title">选择模板开始分析</p>
      <p class="empty-desc">选择一个数据模板和字段，自动生成可视化图表</p>
    </div>

    <div v-if="!loading && !result && tid && !gField.length" class="panel-empty">
      <div class="empty-icon-wrapper blue">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6"/></svg>
      </div>
      <p class="empty-title">请选择分析字段</p>
      <p class="empty-desc">选中字段后将自动进行分析</p>
    </div>

    <template v-if="result && !loading">
      <div v-if="isTrendMode && trendStats" class="stats-bar trend-bar">
        <div class="stat-item">
          <p class="stat-label">数据点</p>
          <p class="stat-value">{{ trendStats.count }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">均值</p>
          <p class="stat-value text-blue-600">{{ trendStats.avg }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">最小</p>
          <p class="stat-value text-green-600">{{ trendStats.min }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">最大</p>
          <p class="stat-value text-amber-600">{{ trendStats.max }}</p>
        </div>
      </div>

      <div v-else-if="isDateGroupMode" class="stats-bar date-group-bar">
        <div class="stat-item">
          <p class="stat-label">总计</p>
          <p class="stat-value">{{ total }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">日期数</p>
          <p class="stat-value text-primary-600">{{ data.length }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item stat-item-wide">
          <p class="stat-label">最高日</p>
          <p class="stat-value stat-value-truncate" :title="topItem?.name">{{ topItem?.name || '-' }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">占比</p>
          <p class="stat-value text-amber-600">{{ topItem?.percentage || '0' }}%</p>
        </div>
      </div>

      <div v-else class="stats-bar">
        <div class="stat-item">
          <p class="stat-label">总计</p>
          <p class="stat-value">{{ total }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">分类</p>
          <p class="stat-value text-primary-600">{{ data.length }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item stat-item-wide">
          <p class="stat-label">最高项</p>
          <p class="stat-value stat-value-truncate" :title="topItem?.name">{{ topItem?.name || '-' }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">占比</p>
          <p class="stat-value text-amber-600">{{ topItem?.percentage || '0' }}%</p>
        </div>
      </div>

      <div class="chart-container">
        <ClientOnly>
          <v-chart v-if="data.length" :option="chartOption" autoresize class="chart" />
          <div v-else class="chart-empty">无数据可显示</div>
        </ClientOnly>
      </div>

      <div class="table-section">
        <div class="table-header">
          <span class="table-title">{{ isTrendMode ? '趋势' : isDateGroupMode ? '日期分布' : '分布' }}明细</span>
          <n-input v-model:value="tableSearch" size="small" placeholder="搜索..." clearable class="table-search" />
        </div>
        <n-data-table
          :columns="isTrendMode ? trendCols : cols"
          :data="filteredData"
          size="small"
          :max-height="220"
          :bordered="false"
          :single-line="false"
          virtual-scroll
          class="modern-table"
        />
      </div>

      <div v-if="!isTrendMode && data.length" class="tags-section">
        <n-tag v-for="d in data.slice(0, 10)" :key="d.name" size="small" closable type="info" @click="filterBy(d.name)" class="data-tag">
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
const isDateGroupMode = ref(false)
const timeField = ref<string | null>(null)

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
  if (isDateField.value) {
    opts.push({ label: '日期分布', value: 'date_group' })
  }
  return opts
})
const isDateField = computed(() => {
  if (!gField.value.length) return false
  return gField.value.some(k => {
    // Built-in date fields
    if (k === 'feedbackDate' || k === 'productionTime' || k === 'createdAt') return true
    // Template date fields
    return fields.value.find((f: any) => f.fieldKey === k)?.fieldType === 'date'
  })
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

const chartOption = computed(() => {
  const d = data.value; if (!d.length) return {}
  if (chartType.value === 'line' || (isDateGroupMode.value && chartType.value === 'date_group')) {
    const isDateX = d.length > 0 && /^\d{4}-\d{2}-\d{2}/.test(String(d[0].name))
    const values = isDateGroupMode.value ? d.map((x: any) => x.count) : d.map((x: any) => x.value)
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
        data: values,
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
        markLine: (isTrendMode.value && trendStats.value) ? {
          silent: true, symbol: 'none',
          lineStyle: { type: 'dashed', color: '#9ca3af', width: 1 },
          data: [{ yAxis: trendStats.value.avg, label: { formatter: `均值 ${trendStats.value.avg}`, fontSize: 10, color: '#6b7280' } }],
        } : undefined
      }]
    }
  }
  if (chartType.value === 'pie' || chartType.value === 'donut') {
    const innerRadius = chartType.value === 'donut' ? ['40%', '70%'] : ['0%', '65%']
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

let autoRunTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRun() {
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (!gField.value.length) return
  autoRunTimer = setTimeout(() => run(), 300)
}

async function onTemplateChange(val: number | null) {
  fields.value = []; gField.value = []; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false; timeField.value = null
  if (!val) return
  try {
    const resp = await $fetch(`/api/templates/${val}/filter-fields`) as any
    if (resp.success) fields.value = resp.data || []
  } catch (e: any) { message.error('加载字段失败') }
}

function onFieldChange() {
  if (isNumericField.value && chartType.value !== 'line' && chartType.value !== 'date_group') {
    chartType.value = 'line'
  } else if (isDateField.value && !isNumericField.value && chartType.value === 'line') {
    chartType.value = 'date_group'
  } else if (!isNumericField.value && !isDateField.value && (chartType.value === 'line' || chartType.value === 'date_group')) {
    chartType.value = 'bar'
  }
  scheduleRun()
}

function onFilterChange() {
  if (result.value || gField.value.length) scheduleRun()
}

async function run() {
  if (!gField.value.length) return; loading.value = true; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false; isDateGroupMode.value = false
  try {
    const useTrend = isNumericField.value && chartType.value === 'line'
    const useDateGroup = isDateField.value && chartType.value === 'date_group'
    const params: any = { groupBy: gField.value.join(','), limit: 50 }
    if (tid.value) params.templateId = tid.value
    if (dr.value) { params.startDate = dayjs(dr.value[0]).format('YYYY-MM-DD'); params.endDate = dayjs(dr.value[1]).format('YYYY-MM-DD') }
    if (useTrend) {
      params.mode = 'trend'
      if (timeField.value) params.timeField = timeField.value
    } else if (useDateGroup) {
      params.mode = 'date_group'
    }
    const resp = await $fetch('/api/stats/custom', { params }) as any
    if (resp.success) {
      data.value = (resp.data.results || []).map((d: any, i: number) => ({ ...d, rank: i + 1 }))
      total.value = resp.data.total
      if (resp.data.mode === 'trend' && resp.data.stats) {
        isTrendMode.value = true
        trendStats.value = resp.data.stats
      }
      if (resp.data.mode === 'date_group') {
        isDateGroupMode.value = true
      }
      result.value = true
    }
  } catch (e: any) {
    message.error('分析失败')
    result.value = false
  } finally { loading.value = false }
}

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
.analysis-panel {
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}

.analysis-panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

.panel-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.panel-status-indicator {
  width: 0.375rem;
  height: 1.25rem;
  border-radius: 9999px;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}

.panel-status-indicator.active {
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.panel-status-indicator.inactive {
  background: #cbd5e1;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-count-tag {
  font-weight: 500;
}

.panel-actions {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.analysis-panel:hover .panel-actions {
  opacity: 1;
}

.action-btn {
  transition: all 0.2s ease;
}

.panel-controls {
  padding: 1rem 1.25rem;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.control-step-badge {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
}

.control-select {
  flex: 1;
}

.control-select-flex {
  flex: 1;
}

.control-select-chart {
  width: 110px;
  flex-shrink: 0;
}

.control-select-time {
  width: 150px;
  flex-shrink: 0;
}

.panel-loading {
  padding: 3rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.loading-spinner {
  position: relative;
  width: 3rem;
  height: 3rem;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #0ea5e9;
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  border-top-color: #6366f1;
  animation-delay: -0.3s;
}

.spinner-ring:nth-child(3) {
  border-top-color: #8b5cf6;
  animation-delay: -0.15s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 500;
}

.panel-empty {
  padding: 2.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-icon-wrapper {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: #94a3b8;
}

.empty-icon-wrapper.blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.empty-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.empty-desc {
  font-size: 0.8125rem;
  color: #94a3b8;
  margin-top: 0.375rem;
  max-width: 20rem;
}

.stats-bar {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.stats-bar.trend-bar {
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.stats-bar.date-group-bar {
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
}

.stat-item {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.stat-item-wide {
  flex: 1.5;
}

.stat-label {
  font-size: 0.625rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.25rem 0;
  font-weight: 500;
}

.stat-value {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.stat-value-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8125rem;
}

.stat-divider {
  width: 1px;
  height: 2rem;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.08) 50%, transparent 100%);
  flex-shrink: 0;
}

.chart-container {
  padding: 1rem 1.25rem;
  height: 290px;
  background: #ffffff;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  font-size: 0.875rem;
}

.table-section {
  padding: 0 1.25rem 1rem 1.25rem;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;
}

.table-title {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 500;
}

.table-search {
  width: 130px;
}

.modern-table {
  border-radius: 0.5rem;
  overflow: hidden;
}

.tags-section {
  padding: 0 1.25rem 1rem 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.data-tag {
  transition: all 0.2s ease;
  cursor: pointer;
}

.data-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

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

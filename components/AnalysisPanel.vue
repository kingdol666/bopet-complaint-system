<template>
  <div class="analysis-panel">
    <div class="panel-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="panel-status-indicator" :class="result ? 'active' : 'inactive'" />
          <span class="panel-title">{{ displayTitle }}</span>
          <n-tag v-if="result" :type="isTrendMode ? 'success' : 'primary'" size="small" :bordered="false" class="data-count-tag">
            {{ headerTagText }}
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

      <!-- Step 3: Numeric aggregation — 按分组聚合数字字段的值（求和/平均/最大/最小） -->
      <div v-if="numericFieldOpts.length" class="control-row">
        <div class="control-step-badge">3</div>
        <n-select v-model:value="valueField" :options="numericFieldOpts" placeholder="数值聚合字段（可选，按其求和等）" size="small" filterable clearable :disabled="!tid" @update:value="onValueFieldChange" class="control-select" />
        <n-select v-if="valueField" v-model:value="aggFunc" :options="aggFuncOpts" size="small" class="control-select-agg" @update:value="scheduleRun" />
      </div>

      <div v-if="isNumericField && chartType === 'line'" class="control-row">
        <div class="control-step-badge">{{ badgeTime }}</div>
        <n-select v-model:value="timeField" :options="timeOpts" size="small" class="control-select-time" placeholder="时间列（可选）" clearable @update:value="onFilterChange" />
      </div>

      <!-- Step 4: Field filters -->
      <div v-if="tid && allFilterFields.length" class="control-row control-row-filter">
        <div class="control-step-badge">{{ badgeFilter }}</div>
        <div class="filter-container">
          <div class="filter-header-row">
            <span class="filter-section-title">字段过滤</span>
            <n-button size="tiny" quaternary type="primary" @click="addFilter">
              <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></template>
              添加条件
            </n-button>
          </div>
          <div v-for="(f, idx) in activeFilters" :key="idx" class="filter-item-row">
            <n-select v-model:value="f.field" :options="filterFieldOpts" size="small" placeholder="选择字段" class="filter-field-select" @update:value="onFilterFieldChange(idx)" />
            <template v-if="f.field">
              <!-- Date range -->
              <n-date-picker v-if="isFilterDateField(f.field)" v-model:value="f.dateRange" type="daterange" size="small" clearable class="filter-value-input" @update:value="onFilterChange" />
              <!-- Multi-select -->
              <n-select v-else-if="isFilterSelectField(f.field)" v-model:value="f.values" :options="getFilterOptions(f.field)" size="small" multiple filterable class="filter-value-input" placeholder="选择值" @update:value="onFilterChange" />
              <!-- Text input -->
              <n-input v-else v-model:value="f.value" size="small" placeholder="输入过滤值" clearable class="filter-value-input" @update:value="onFilterChange" />
            </template>
            <n-button size="tiny" quaternary type="error" @click="removeFilter(idx)">
              <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
            </n-button>
          </div>
        </div>
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
          <p class="stat-label">{{ isAggMode ? '聚合总计' : '总计' }}</p>
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

      <div v-else-if="isAggMode" class="stats-bar agg-bar">
        <div class="stat-item">
          <p class="stat-label">聚合总计</p>
          <p class="stat-value">{{ total }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">分类</p>
          <p class="stat-value text-primary-600">{{ data.length }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <p class="stat-label">记录数</p>
          <p class="stat-value text-blue-600">{{ aggMeta?.recordCount ?? '-' }}</p>
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
          <span class="table-title">{{ isTrendMode ? '趋势' : isAggMode ? '聚合' : isDateGroupMode ? '日期分布' : '分布' }}明细</span>
          <n-input v-model:value="tableSearch" size="small" placeholder="搜索..." clearable class="table-search" />
        </div>
        <n-data-table
          :columns="isTrendMode ? trendCols : isAggMode ? aggregateCols : cols"
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
          {{ d.name }} ({{ isAggMode ? d.value : d.count }})
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
// dr removed — date filtering is now handled entirely through the template field filter system
const timeFieldInit = props.initialConfig?.timeField || null
const loading = ref(false)
const data = ref<any[]>([])
const total = ref(0)
const result = ref(false)
const tableSearch = ref('')
const trendStats = ref<{ avg: number; min: number; max: number; count: number } | null>(null)
const isTrendMode = ref(false)
const isDateGroupMode = ref(false)
const isAggMode = ref(false)
const aggMeta = ref<{ recordCount: number } | null>(null)
const valueField = ref<string | null>(props.initialConfig?.valueField || null)
const aggFunc = ref<string>(props.initialConfig?.aggFunc || 'sum')
const timeField = ref<string | null>(null)
const activeFilters = ref<Array<{ field: string; value: string; values: string[]; dateRange: [number, number] | null }>>([])

const selectedTemplateName = computed(() => {
  if (!tid.value) return ''
  return templates.value.find((t: any) => t.id === tid.value)?.name || ''
})

const displayTitle = computed(() => {
  if (props.title && result.value) return props.title
  if (selectedTemplateName.value) {
    if (valueField.value) {
      const vfLabel = fields.value.find((f: any) => f.fieldKey === valueField.value)?.fieldLabel || valueField.value
      return `${selectedTemplateName.value} · ${aggFuncLabel.value}${vfLabel}`
    }
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
// 模板中所有数字类型字段（可作为数值聚合字段）
const numericFieldOpts = computed(() => fields.value
  .filter((f: any) => f.fieldType === 'number')
  .map((f: any) => ({ label: f.fieldLabel, value: f.fieldKey }))
)
const aggFuncOpts = [
  { label: '求和', value: 'sum' },
  { label: '平均', value: 'avg' },
  { label: '最大', value: 'max' },
  { label: '最小', value: 'min' },
]
const aggFuncLabel = computed(() => aggFuncOpts.find(o => o.value === aggFunc.value)?.label || '求和')
const headerTagText = computed(() => {
  if (trendStats.value) return trendStats.value.count + '点'
  if (isAggMode.value && aggMeta.value) return aggMeta.value.recordCount + '条'
  return total.value + '条'
})
const badgeTime = computed(() => valueField.value ? 4 : 3)
const badgeFilter = computed(() => {
  let n = 3
  if (numericFieldOpts.value.length) n++
  if (isNumericField.value && chartType.value === 'line') n++
  return n
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
  return gField.value.some(k => fields.value.find((f: any) => f.fieldKey === k)?.fieldType === 'date')
})

// ─── 过滤条件辅助（完全基于模板字段，无内置字段） ───
const allFilterFields = computed(() => fields.value)

const filterFieldOpts = computed(() =>
  allFilterFields.value.map((f: any) => ({ label: f.fieldLabel, value: f.fieldKey }))
)

function isFilterDateField(fieldKey: string): boolean {
  const f = allFilterFields.value.find((x: any) => x.fieldKey === fieldKey)
  return f?.fieldType === 'date'
}

function isFilterSelectField(fieldKey: string): boolean {
  const f = allFilterFields.value.find((x: any) => x.fieldKey === fieldKey)
  if (!f) return false
  // select / select-config / auto-complete 类型，且拥有选项数据时，使用多选下拉
  if (f.fieldType === 'select' || f.fieldType === 'select-config' || f.fieldType === 'auto-complete') {
    return f.options && f.options.length > 0
  }
  return false
}

function getFilterOptions(fieldKey: string): { label: string; value: string }[] {
  const f = allFilterFields.value.find((x: any) => x.fieldKey === fieldKey)
  if (f?.options) return f.options
  return []
}

function addFilter() {
  activeFilters.value.push({ field: '', value: '', values: [], dateRange: null })
}

function removeFilter(idx: number) {
  activeFilters.value.splice(idx, 1)
  onFilterChange()
}

function onFilterFieldChange(idx: number) {
  const f = activeFilters.value[idx]
  f.value = ''
  f.values = []
  f.dateRange = null
  onFilterChange()
}

function buildFiltersParam(): any[] | undefined {
  const result: any[] = []
  for (const f of activeFilters.value) {
    if (!f.field) continue
    if (isFilterDateField(f.field)) {
      if (f.dateRange && f.dateRange.length === 2) {
        result.push({
          field: f.field,
          operator: 'date_range',
          value: dayjs(f.dateRange[0]).format('YYYY-MM-DD'),
          valueEnd: dayjs(f.dateRange[1]).format('YYYY-MM-DD')
        })
      }
    } else if (isFilterSelectField(f.field)) {
      if (f.values.length > 0) {
        result.push({ field: f.field, operator: 'in', values: f.values })
      }
    } else {
      if (f.value && f.value.trim()) {
        result.push({ field: f.field, operator: 'contains', value: f.value.trim() })
      }
    }
  }
  return result.length > 0 ? result : undefined
}
const timeOpts = computed(() => {
  const opts: { label: string; value: string }[] = [
    { label: '按数据顺序', value: '' },
  ]
  // 仅显示模板中定义的日期类型字段
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
const valueLabel = computed(() => {
  if (!valueField.value) return ''
  return fields.value.find((f: any) => f.fieldKey === valueField.value)?.fieldLabel || valueField.value
})
const aggTooltipFormatter = (params: any) => {
  const p = Array.isArray(params) ? params[0] : params
  return `${p.name}<br/><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-right:6px"></span>${valueLabel.value}(${aggFuncLabel.value}): <b>${p.value}</b>${p.data?.__pct != null ? ` · 占比 <b>${p.data.__pct}%</b>` : ''}`
}
const topItem = computed(() => data.value[0] || null)

const cols = [
  { title: '#', key: 'rank', width: 40 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '数量', key: 'count', width: 70 },
  { title: '占比', key: 'percentage', width: 65 }
]
const aggregateCols = computed(() => [
  { title: '#', key: 'rank', width: 40 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '记录数', key: 'count', width: 70 },
  { title: `${aggFuncLabel.value}值`, key: 'value', width: 85 },
  { title: '占比', key: 'percentage', width: 65 }
])
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
  valueField: valueField.value, aggFunc: aggFunc.value,
  timeField: timeField.value,
  filters: activeFilters.value.map(f => ({
    field: f.field,
    isDate: isFilterDateField(f.field),
    isSelect: isFilterSelectField(f.field),
    value: f.value,
    values: f.values,
    dateRange: f.dateRange
  })),
  limit: 30
}))

const COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6366f1','#0ea5e9','#10b981','#f43f5e','#a855f7','#d946ef']

const chartOption = computed(() => {
  const d = data.value; if (!d.length) return {}
  if (chartType.value === 'line' || (isDateGroupMode.value && chartType.value === 'date_group')) {
    const isDateX = d.length > 0 && /^\d{4}-\d{2}-\d{2}/.test(String(d[0].name))
    const values = isDateGroupMode.value ? d.map((x: any) => isAggMode.value ? x.value : x.count) : d.map((x: any) => x.value)
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params
          const seriesLabel = isDateGroupMode.value && isAggMode.value ? `${valueLabel.value}(${aggFuncLabel.value})` : fLabel.value
          return `${p.name}<br/><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-right:6px"></span>${seriesLabel}: <b>${p.value}</b>`
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
    const pickVal = (x: any) => isAggMode.value ? x.value : x.count
    const pieData = d.length > 12
      ? [...d.slice(0, 12).map((x: any, i: number) => ({ name: x.name, value: pickVal(x), itemStyle: { color: COLORS[i % 16] } })), { name: '其他', value: d.slice(12).reduce((s: number, x: any) => s + pickVal(x), 0), itemStyle: { color: '#d1d5db' } }]
      : d.map((x: any, i: number) => ({ name: x.name, value: pickVal(x), itemStyle: { color: COLORS[i % 16] } }))
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => isAggMode.value ? `${p.name}<br/>${valueLabel.value}(${aggFuncLabel.value}): <b>${p.value}</b> (${p.percent}%)` : `${p.name}: ${p.value} (${p.percent}%)`
      },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 10 } },
      series: [{ type: 'pie', radius: innerRadius, center: ['38%', '50%'], itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1.5 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 11, fontWeight: 'bold' } }, data: pieData }]
    }
  }
  if (chartType.value === 'hbar') {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: isAggMode.value ? aggTooltipFormatter : undefined },
      grid: { left: 3, right: 4, bottom: 3, top: 3, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } } },
      yAxis: { type: 'category', data: d.map((x: any) => x.name).reverse(), axisLabel: { width: 110, overflow: 'truncate', fontSize: 10 }, axisTick: { show: false } },
      series: [{ type: 'bar', data: d.map((x: any, i: number) => ({ value: isAggMode.value ? x.value : x.count, __pct: x.percentage, itemStyle: { color: COLORS[(d.length - 1 - i) % 16], borderRadius: [0, 3, 3, 0] } })).reverse() }]
    }
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: isAggMode.value ? aggTooltipFormatter : undefined },
    grid: { left: 3, right: 4, bottom: 8, top: 8, containLabel: true },
    xAxis: { type: 'category', data: d.map((x: any) => x.name), axisLabel: { rotate: 35, width: 80, overflow: 'truncate', fontSize: 9 }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [{ type: 'bar', data: d.map((x: any, i: number) => ({ value: isAggMode.value ? x.value : x.count, __pct: x.percentage, itemStyle: { color: COLORS[i % 16], borderRadius: [3, 3, 0, 0] } })) }]
  }
})

let autoRunTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRun() {
  if (autoRunTimer) clearTimeout(autoRunTimer)
  if (!gField.value.length) return
  autoRunTimer = setTimeout(() => run(), 300)
}

async function onTemplateChange(val: number | null) {
  fields.value = []; gField.value = []; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false; isAggMode.value = false; aggMeta.value = null; valueField.value = null; timeField.value = null; activeFilters.value = []
  if (!val) return
  try {
    const resp = await $fetch(`/api/templates/${val}/filter-fields`) as any
    if (resp.success) fields.value = resp.data || []
  } catch (e: any) { message.error('加载字段失败') }
}

function onValueFieldChange(val: string | null) {
  // 选择数值聚合字段后清空趋势/日期等专用模式，统一走聚合统计
  if (val && chartType.value === 'line') chartType.value = 'bar'
  scheduleRun()
}

function onFieldChange() {
  if (valueField.value) {
    // 数值聚合模式下不自动切换图表类型（bar/pie/hbar/line 均按聚合值渲染）
  } else if (isNumericField.value && chartType.value !== 'line' && chartType.value !== 'date_group') {
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
  if (!gField.value.length) return; loading.value = true; result.value = false; data.value = []; trendStats.value = null; isTrendMode.value = false; isDateGroupMode.value = false; isAggMode.value = false; aggMeta.value = null
  try {
    const useTrend = !valueField.value && isNumericField.value && chartType.value === 'line'
    const useDateGroup = isDateField.value && chartType.value === 'date_group'
    const params: any = { groupBy: gField.value.join(','), limit: 50 }
    if (tid.value) params.templateId = tid.value
    const filtersParam = buildFiltersParam()
    if (filtersParam) params.filters = JSON.stringify(filtersParam)
    if (useTrend) {
      params.mode = 'trend'
      if (timeField.value) params.timeField = timeField.value
    } else if (useDateGroup) {
      params.mode = 'date_group'
      // 日期分组上聚合数字字段（后端 date_group 分支支持 valueField）
      if (valueField.value) {
        params.valueField = valueField.value
        params.aggFunc = aggFunc.value
      }
    } else if (valueField.value) {
      // 数值聚合模式：按分组字段聚合数字字段（sum/avg/max/min）
      params.valueField = valueField.value
      params.aggFunc = aggFunc.value
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
      if (resp.data.valueField) {
        isAggMode.value = true
        aggMeta.value = { recordCount: resp.data.recordCount ?? 0 }
      }
      result.value = true
    }
  } catch (e: any) {
    message.error(e?.message?.includes('数字类型') ? '数值聚合字段必须是数字类型字段' : '分析失败')
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
  } else if (isAggMode.value) {
    header = `排名,名称,记录数,${valueLabel.value}(${aggFuncLabel.value}),占比(%)\n`
    rows = data.value.map((d: any) => `${d.rank},"${d.name}",${d.count},${d.value},${d.percentage}`).join('\n')
  } else {
    header = '排名,名称,数量,占比(%)\n'
    rows = data.value.map((d: any) => `${d.rank},"${d.name}",${d.count},${d.percentage}`).join('\n')
  }
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${fLabel.value}_${isTrendMode.value ? '趋势' : isAggMode.value ? `按${aggFuncLabel.value}${valueLabel.value}` : '分析'}_${dayjs().format('YYYYMMDD')}.csv`; a.click()
  URL.revokeObjectURL(url); message.success('导出成功')
}

function filterBy(name: string) { router.push(`/datas?keyword=${encodeURIComponent(name)}`) }

onMounted(async () => {
  try { const r = await $fetch('/api/templates') as any; if (r.success) templates.value = r.data } catch (e) { console.error(e) }
  if (props.initialConfig?.templateId) {
    tid.value = props.initialConfig.templateId
    await onTemplateChange(props.initialConfig.templateId)
    const gbf = props.initialConfig.groupByField
    gField.value = Array.isArray(gbf) ? gbf : (gbf ? [gbf] : [])
    if (timeFieldInit) timeField.value = timeFieldInit
    if (props.initialConfig.valueField) {
      valueField.value = props.initialConfig.valueField
      aggFunc.value = props.initialConfig.aggFunc || 'sum'
    }
    // Restore filters
    if (props.initialConfig.filters && Array.isArray(props.initialConfig.filters)) {
      activeFilters.value = props.initialConfig.filters.map((f: any) => ({
        field: f.field || '',
        value: f.value || '',
        values: f.values || [],
        dateRange: f.dateRange || null
      }))
    }
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

.control-select-agg {
  width: 90px;
  flex-shrink: 0;
}

/* Filter section */
.control-row-filter {
  align-items: flex-start;
}

.filter-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-section-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}

.filter-item-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-field-select {
  width: 140px;
  flex-shrink: 0;
}

.filter-value-input {
  flex: 1;
  min-width: 0;
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

.stats-bar.agg-bar {
  background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
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

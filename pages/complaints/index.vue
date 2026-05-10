<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="page-title">数据管理</h1>
        <p class="page-subtitle">管理和追踪所有业务数据记录</p>
      </div>
      <div class="flex items-center gap-2">
        <n-button type="default" @click="handleExport" :loading="exporting">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </template>
          导出CSV
        </n-button>
        <n-button type="default" @click="navigateTo('/complaints/import')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </template>
          批量导入
        </n-button>
        <n-button type="primary" @click="navigateTo('/complaints/new')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          新增记录
        </n-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-corporate-400" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span class="text-sm font-medium text-corporate-700">筛选条件（AND：所有条件同时满足）</span>
        <span v-if="activeFilterCount > 0" class="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{{
          activeFilterCount }} 个条件</span>
      </div>

      <!-- Row 1: Always visible - Date + Template + Keyword -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-corporate-100">
        <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="选择日期范围"
          @update:value="handleDateChange" />

        <n-select v-model:value="selectedTemplateId" :options="templateFilterOptions" placeholder="选择表单模板（加载自定义字段）"
          clearable filterable @update:value="handleTemplateChange" />

        <n-input v-model:value="filters.keyword" placeholder="全局搜索：编号/内容/不良点..." clearable @clear="handleSearch"
          @keyup.enter="handleSearch">
          <template #prefix>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-corporate-400" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </n-input>
      </div>

      <!-- Row 2+: Dynamic filter rows -->
      <div v-if="selectedTemplateId" class="space-y-3 mb-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-corporate-500">
            自定义字段筛选（基于"{{ selectedTemplateName }}"模板的字段）
          </span>
        </div>

        <div v-for="(row, idx) in dynamicFilters" :key="idx"
          class="flex flex-wrap items-center gap-2 p-3 bg-corporate-50 rounded-lg">
          <!-- Field selector -->
          <n-select v-model:value="row.field" :options="filterFieldOptions" placeholder="选择字段" clearable
            style="min-width:160px;max-width:200px" @update:value="(v: any) => onDynamicFieldChange(idx, v)" />

          <!-- Operator selector -->
          <n-select v-model:value="row.operator" :options="getOperators(row)" placeholder="操作符"
            style="min-width:100px;max-width:130px" />

          <!-- Value input - varies by field type -->
          <n-date-picker v-if="getFieldConfig(row.field)?.fieldType === 'date'" v-model:value="row._dateValue"
            type="date" clearable style="min-width:160px;max-width:200px"
            @update:value="(v: any) => row.value = v ? new Date(v).toISOString().slice(0, 10) : ''" />

          <n-input-number v-else-if="getFieldConfig(row.field)?.fieldType === 'number'" v-model:value="row.value"
            :min="0" placeholder="输入数值" style="min-width:140px;max-width:180px" />

          <n-select v-else-if="hasOptions(row.field)" v-model:value="row.value" :options="getFieldOptions(row.field)"
            placeholder="选择值" clearable filterable style="min-width:160px;max-width:280px" />

          <n-input v-else v-model:value="row.value" placeholder="输入筛选值" clearable
            style="min-width:160px;max-width:280px" />

          <!-- Remove button -->
          <n-button type="error" text size="small" @click="removeDynamicFilter(idx)">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </template>
          </n-button>
        </div>

        <n-button dashed size="small" @click="addDynamicFilter">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          添加筛选条件
        </n-button>
      </div>

      <!-- No template hint -->
      <div v-else class="text-center py-6 text-sm text-corporate-400 bg-corporate-50 rounded-lg mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 text-corporate-300" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        选择表单模板后，可使用模板的自定义字段进行精确筛选
      </div>

      <div class="flex justify-end pt-4 border-t border-corporate-100 gap-2">
        <n-button type="default" @click="handleReset">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </template>
          重置全部
        </n-button>
        <n-button type="primary" @click="handleSearch">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
          查询
        </n-button>
      </div>
    </div>

    <!-- Batch actions bar -->
    <div v-if="checkedRowKeys.length > 0" class="card mb-4 bg-primary-50 border-primary-200">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-primary-700">
          已选择 <span class="font-bold">{{ checkedRowKeys.length }}</span> 条记录
        </span>
        <div class="flex items-center gap-2">
          <n-button type="primary" size="small" :loading="batchProcessing" @click="batchMarkProcessed">
            批量标记已处理
          </n-button>
          <n-button type="error" size="small" :loading="batchProcessing" @click="batchDelete">
            批量删除
          </n-button>
          <n-button size="small" @click="checkedRowKeys = []">取消选择</n-button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <n-data-table :columns="columns" :data="tableData" :loading="loading" :pagination="false"
          :row-key="(row: any) => row.id" :checked-row-keys="checkedRowKeys" :scroll-x="900" @update:sorter="handleSort"
          @update:checked-row-keys="(keys: any) => checkedRowKeys = keys" />
      </div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-corporate-100">
        <p class="text-sm text-corporate-500">
          共 <span class="font-medium text-corporate-900">{{ pagination.total }}</span> 条记录
        </p>
        <n-pagination v-model:page="pagination.page" :page-count="pagination.totalPages"
          :page-size="pagination.pageSize" show-size-picker :page-sizes="[10, 20, 50, 100]" @update:page="loadData"
          @update:page-size="handlePageSizeChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NSpace, NSwitch } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
import { useConfigStore } from '~/stores/config'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

definePageMeta({
  title: '数据管理'
})

const configStore = useConfigStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

// Loading state
const loading = ref(false)
const exporting = ref(false)
const batchProcessing = ref(false)
const checkedRowKeys = ref<any[]>([])

// Table data
const tableData = ref<any[]>([])

// Templates for display
const templates = ref<any[]>([])
const templateFilterOptions = computed(() =>
  templates.value.map(t => ({
    label: t.isDefault ? `${t.name}（默认）` : t.name,
    value: t.id
  }))
)

// Dynamic filter system
const selectedTemplateId = ref<number | null>(null)
const selectedTemplateName = computed(() => {
  const t = templates.value.find(t => t.id === selectedTemplateId.value)
  return t?.name || ''
})
const filterFieldConfigs = ref<any[]>([]) // Loaded filter fields from template
const dynamicFilters = reactive<Array<{ field: string | null; operator: string; value: any; _dateValue: any }>>([])
const activeFilterCount = computed(() => dynamicFilters.filter(r => r.field && r.value).length)

const filterFieldOptions = computed(() =>
  filterFieldConfigs.value.map((f: any) => ({
    label: f.fieldLabel,
    value: f.fieldKey
  }))
)

function getFieldConfig(fieldKey: string | null) {
  if (!fieldKey) return null
  return filterFieldConfigs.value.find((f: any) => f.fieldKey === fieldKey) || null
}

function hasOptions(fieldKey: string | null) {
  const cfg = getFieldConfig(fieldKey)
  return cfg?.options && cfg.options.length > 0
}

function getFieldOptions(fieldKey: string | null) {
  return getFieldConfig(fieldKey)?.options || []
}

function getOperators(row: any) {
  const cfg = getFieldConfig(row.field)
  if (!cfg) return [{ label: '包含(contains)', value: 'contains' }]

  switch (cfg.fieldType) {
    case 'number':
      return [
        { label: '等于(=)', value: 'eq' },
        { label: '大于(>)', value: 'gt' },
        { label: '小于(<)', value: 'lt' },
        { label: '大于等于(>=)', value: 'gte' },
        { label: '小于等于(<=)', value: 'lte' }
      ]
    case 'date':
      return [
        { label: '等于', value: 'date_eq' },
        { label: '之后(>=)', value: 'date_gte' },
        { label: '之前(<=)', value: 'date_lte' }
      ]
    case 'select':
    case 'select-config':
    case 'ref':
      return [{ label: '等于', value: 'eq' }]
    default:
      return [
        { label: '包含(contains)', value: 'contains' },
        { label: '等于(eq)', value: 'eq' }
      ]
  }
}

function onDynamicFieldChange(idx: number, newField: string) {
  const df = dynamicFilters[idx]
  if (!df) return
  // Reset operator and value when field changes
  const cfg = getFieldConfig(newField)
  if (cfg?.fieldType === 'number') {
    df.operator = 'eq'
  } else if (cfg?.fieldType === 'date') {
    df.operator = 'date_eq'
  } else if (cfg?.fieldType === 'select' || cfg?.fieldType === 'select-config' || cfg?.fieldType === 'ref') {
    df.operator = 'eq'
  } else {
    df.operator = 'contains'
  }
  df.value = null
  df._dateValue = null
}

function addDynamicFilter() {
  dynamicFilters.push({ field: null, operator: 'contains', value: null, _dateValue: null })
}

function removeDynamicFilter(idx: number) {
  dynamicFilters.splice(idx, 1)
  handleSearch()
}

async function handleTemplateChange(tid: number | null) {
  dynamicFilters.length = 0
  filterFieldConfigs.value = []
  if (!tid) {
    handleSearch()
    return
  }
  // Load filter fields for this template
  try {
    const resp = await $fetch(`/api/templates/${tid}/filter-fields`) as any
    if (resp.success) {
      filterFieldConfigs.value = resp.data || []
    }
  } catch (e) {
    console.error('Failed to load filter fields:', e)
  }
  handleSearch()
}

// Pagination
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

// Sorting
const sorting = reactive({
  sortBy: 'feedbackDate',
  sortOrder: 'desc' as 'asc' | 'desc'
})

// Filters
const filters = reactive({
  keyword: '',
  startDate: '',
  endDate: '',
  customerId: null as number | null,
  productionLineId: null as number | null,
  productModelId: null as number | null,
  problemCategoryId: null as number | null,
  complaintCategory: null as string | null,
  defectSource: null as string | null,
  closureStatus: null as string | null,
  templateId: null as number | null
})

const dateRange = ref<[number, number] | null>(null)

// Resolve template names from templateIds JSON string
function resolveTemplateNames(templateIds: string | null): string {
  if (!templateIds) return '-'
  try {
    const ids: number[] = typeof templateIds === 'string' ? JSON.parse(templateIds) : templateIds
    if (!ids || ids.length === 0) return '-'
    const names = ids
      .map(id => templates.value.find(t => t.id === id)?.name)
      .filter(Boolean)
    return names.length > 0 ? names.join('、') : '-'
  } catch {
    return '-'
  }
}

// Table columns
const columns: DataTableColumn<any>[] = [
  {
    type: 'selection',
    width: 40,
    fixed: 'left'
  },
  {
    title: '客诉编号',
    key: 'complaintNo',
    width: 140,
    fixed: 'left',
    render: (row) => h('a', {
      class: 'text-primary-600 hover:text-primary-800 cursor-pointer font-medium',
      onClick: () => router.push(`/complaints/${row.id}`)
    }, row.complaintNo)
  },
  {
    title: '反馈日期',
    key: 'feedbackDate',
    width: 120,
    sorter: true,
    render: (row) => row.feedbackDate ? dayjs(row.feedbackDate).format('YYYY-MM-DD') : '-'
  },
  {
    title: '表单模板',
    key: 'template',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => resolveTemplateNames(row.templateIds)
  },
  {
    title: '是否已处理',
    key: 'isProcessed',
    width: 100,
    render: (row) => h(NSwitch, {
      checkedValue: 'closed',
      uncheckedValue: 'pending',
      value: row.closureStatus,
      size: 'small' as const,
      onUpdateValue: (val: string) => handleProcessedChange(row, val)
    })
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 'small' }, () => {
      const buttons = [
        h(NButton, {
          size: 'small',
          type: 'default',
          onClick: () => router.push(`/complaints/${row.id}`)
        }, () => '查看')
      ]
      if (authStore.canWrite) {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'default',
            onClick: () => router.push(`/complaints/edit/${row.id}`)
          }, () => '编辑'),
          h(NButton, {
            size: 'small',
            type: 'default',
            danger: true,
            onClick: () => handleDelete(row)
          }, () => '删除')
        )
      }
      return buttons
    })
  }
]

// Load data
onMounted(async () => {
  await configStore.loadConfig()

  // Load templates for filter options and display
  try {
    const tplResp = await $fetch('/api/templates')
    if (tplResp.success) {
      templates.value = tplResp.data
    }
  } catch (e) {
    console.error('Failed to load templates:', e)
  }

  // Parse query params
  if (route.query.closureStatus) {
    filters.closureStatus = route.query.closureStatus as string
  }

  await loadData()
})

async function loadData() {
  loading.value = true

  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      sortBy: sorting.sortBy,
      sortOrder: sorting.sortOrder,
      ...filters
    }

    // Add template ID filter
    if (selectedTemplateId.value) {
      params.templateId = selectedTemplateId.value
    }

    // Add dynamic filters as JSON
    const activeDynamicFilters = dynamicFilters.filter(r => r.field && (r.value || r._dateValue))
    if (activeDynamicFilters.length > 0) {
      const cleaned = activeDynamicFilters.map(r => ({
        field: r.field,
        operator: r.operator,
        value: r.field && getFieldConfig(r.field)?.fieldType === 'date' && r._dateValue
          ? new Date(r._dateValue).toISOString().slice(0, 10)
          : r.value
      }))
      params.filters = JSON.stringify(cleaned)
    }

    // Remove empty filters
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await $fetch('/api/complaints', { params })

    if (response.success) {
      tableData.value = response.data.records
      pagination.total = response.data.pagination.total
      pagination.totalPages = response.data.pagination.totalPages
    }
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleDateChange(value: [number, number] | null) {
  if (value) {
    filters.startDate = dayjs(value[0]).format('YYYY-MM-DD')
    filters.endDate = dayjs(value[1]).format('YYYY-MM-DD')
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  handleSearch()
}

function handleReset() {
  filters.keyword = ''
  filters.startDate = ''
  filters.endDate = ''
  filters.customerId = null
  filters.productionLineId = null
  filters.productModelId = null
  filters.problemCategoryId = null
  filters.complaintCategory = null
  filters.defectSource = null
  filters.closureStatus = null
  filters.templateId = null
  dateRange.value = null
  selectedTemplateId.value = null
  dynamicFilters.length = 0
  filterFieldConfigs.value = []
  handleSearch()
}

function handleSort(options: any) {
  if (options.order) {
    sorting.sortBy = options.columnKey
    sorting.sortOrder = options.order === 'ascend' ? 'asc' : 'desc'
  }
  loadData()
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadData()
}

function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除客诉记录 "${row.complaintNo}" 吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/complaints/${row.id}`, {
          method: 'DELETE',
          headers: authStore.getAuthHeaders()
        })
        message.success('删除成功')
        await loadData()
      } catch (e) {
        message.error('删除失败')
      }
    }
  })
}

async function handleProcessedChange(row: any, value: string) {
  try {
    await $fetch(`/api/complaints/${row.id}`, {
      method: 'PUT',
      headers: authStore.getAuthHeaders(),
      body: { closureStatus: value }
    })
    row.closureStatus = value
    message.success(value === 'closed' ? '已标记为已处理' : '已标记为待分析')
  } catch (e) {
    message.error('更新失败')
    // Revert in UI
    row.closureStatus = value === 'closed' ? 'pending' : 'closed'
  }
}

async function batchMarkProcessed() {
  if (checkedRowKeys.value.length === 0) return
  batchProcessing.value = true
  let successCount = 0
  try {
    for (const id of checkedRowKeys.value) {
      try {
        await $fetch(`/api/complaints/${id}`, {
          method: 'PUT',
          headers: authStore.getAuthHeaders(),
          body: { closureStatus: 'closed' }
        })
        // Update local data
        const row = tableData.value.find((r: any) => r.id === id)
        if (row) row.closureStatus = 'closed'
        successCount++
      } catch { /* skip failed */ }
    }
    message.success(`成功标记 ${successCount} 条为已处理`)
    checkedRowKeys.value = []
  } catch {
    message.error('批量操作失败')
  } finally {
    batchProcessing.value = false
  }
}

function batchDelete() {
  if (checkedRowKeys.value.length === 0) return
  dialog.warning({
    title: '确认批量删除',
    content: `确定要删除选中的 ${checkedRowKeys.value.length} 条客诉记录吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      batchProcessing.value = true
      let successCount = 0
      try {
        for (const id of checkedRowKeys.value) {
          try {
            await $fetch(`/api/complaints/${id}`, {
              method: 'DELETE',
              headers: authStore.getAuthHeaders()
            })
            successCount++
          } catch { /* skip failed */ }
        }
        message.success(`成功删除 ${successCount} 条记录`)
        checkedRowKeys.value = []
        await loadData()
      } catch {
        message.error('批量删除失败')
      } finally {
        batchProcessing.value = false
      }
    }
  })
}

async function handleExport() {
  exporting.value = true
  try {
    const params: any = { ...filters }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    const queryString = new URLSearchParams(params).toString()
    // Use fetch + blob to avoid exposing token in URL
    const resp = await fetch(`/api/complaints/export?${queryString}`, {
      headers: authStore.getAuthHeaders()
    })
    if (!resp.ok) throw new Error('Export failed')
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `客诉数据_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch (e) {
    message.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

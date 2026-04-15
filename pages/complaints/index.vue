<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="page-title">客诉列表</h1>
        <p class="page-subtitle">管理和追踪所有客诉记录</p>
      </div>
      <div class="flex items-center gap-2">
        <n-button type="default" @click="handleExport" :loading="exporting">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </template>
          导出CSV
        </n-button>
        <n-button type="primary" @click="navigateTo('/complaints/new')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          新增客诉
        </n-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span class="text-sm font-medium text-corporate-700">筛选条件</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索客诉编号/内容..."
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </n-input>

        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择日期范围"
          @update:value="handleDateChange"
        />

        <n-select
          v-model:value="filters.customerId"
          :options="customerOptions"
          placeholder="选择客户"
          clearable
          @update:value="handleSearch"
        />

        <n-select
          v-model:value="filters.productionLineId"
          :options="productionLineOptions"
          placeholder="选择产线"
          clearable
          @update:value="handleSearch"
        />

        <n-select
          v-model:value="filters.problemCategoryId"
          :options="problemCategoryOptions"
          placeholder="选择问题大类"
          clearable
          @update:value="handleSearch"
        />

        <n-select
          v-model:value="filters.closureStatus"
          :options="statusOptions"
          placeholder="选择状态"
          clearable
          @update:value="handleSearch"
        />
      </div>

      <div class="flex justify-end mt-4 pt-4 border-t border-corporate-100">
        <n-button type="default" @click="handleReset">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </template>
          重置筛选
        </n-button>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <n-data-table
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="false"
          :row-key="(row: any) => row.id"
          :scroll-x="1500"
          @update:sorter="handleSort"
        />
      </div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-corporate-100">
        <p class="text-sm text-corporate-500">
          共 <span class="font-medium text-corporate-900">{{ pagination.total }}</span> 条记录
        </p>
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          :page-size="pagination.pageSize"
          show-size-picker
          :page-sizes="[10, 20, 50, 100]"
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag, NButton, NSpace } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
import { useConfigStore } from '~/stores/config'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

definePageMeta({
  title: '客诉列表'
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
  closureStatus: null as string | null,
  templateId: null as number | null
})

const dateRange = ref<[number, number] | null>(null)

// Options for selects
const customerOptions = computed(() => configStore.customerOptions)
const productionLineOptions = computed(() => configStore.productionLineOptions)
const problemCategoryOptions = computed(() => configStore.problemCategoryOptions)

const statusOptions = [
  { label: '待分析', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已结案', value: 'closed' }
]

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
    width: 110,
    sorter: true,
    render: (row) => row.feedbackDate ? dayjs(row.feedbackDate).format('YYYY-MM-DD') : '-'
  },
  {
    title: '客户',
    key: 'customer',
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.customer?.name || '-'
  },
  {
    title: '产品型号',
    key: 'productModel',
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.productModel?.name || '-'
  },
  {
    title: '表单模板',
    key: 'template',
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => resolveTemplateNames(row.templateIds)
  },
  {
    title: '问题大类',
    key: 'problemCategory',
    width: 100,
    render: (row) => row.problemCategory?.name || '-'
  },
  {
    title: '严重等级',
    key: 'severityLevel',
    width: 90,
    render: (row) => {
      if (!row.severityLevel) return '-'
      return h(NTag, {
        size: 'small',
        color: { color: row.severityLevel.color + '20', textColor: row.severityLevel.color }
      }, () => row.severityLevel.name)
    }
  },
  {
    title: '状态',
    key: 'closureStatus',
    width: 90,
    render: (row) => {
      const statusMap: Record<string, { label: string; type: 'warning' | 'info' | 'success' }> = {
        pending: { label: '待分析', type: 'warning' },
        processing: { label: '处理中', type: 'info' },
        closed: { label: '已结案', type: 'success' }
      }
      const status = statusMap[row.closureStatus] || { label: row.closureStatus, type: 'default' as const }
      return h(NTag, { type: status.type, size: 'small' }, () => status.label)
    }
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
          type: 'link',
          onClick: () => router.push(`/complaints/${row.id}`)
        }, () => '查看')
      ]
      if (authStore.canWrite) {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'link',
            onClick: () => router.push(`/complaints/edit/${row.id}`)
          }, () => '编辑'),
          h(NButton, {
            size: 'small',
            type: 'link',
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
  filters.closureStatus = null
  filters.templateId = null
  dateRange.value = null
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
        const authStore = useAuthStore()
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

async function handleExport() {
  exporting.value = true

  try {
    const params: any = { ...filters }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    // Add token to query string for window.open (can't set headers)
    params.token = authStore.token
    const queryString = new URLSearchParams(params).toString()
    window.open(`/api/complaints/export?${queryString}`, '_blank')
  } catch (e) {
    message.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

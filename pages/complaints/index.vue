<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="page-title mb-0">客诉列表</h1>
      <div class="flex space-x-3">
        <n-button @click="handleExport" :loading="exporting">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </template>
          导出CSV
        </n-button>
        <n-button type="primary" @click="navigateTo('/complaints/new')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          新增客诉
        </n-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索客诉编号/内容..."
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-industrial-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </n-input>

        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
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

      <div class="flex justify-end mt-4">
        <n-button @click="handleReset">重置筛选</n-button>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <n-data-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="false"
        :row-key="(row: any) => row.id"
        @update:sorter="handleSort"
      />

      <div class="flex justify-end mt-4">
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
import type { DataTableColumns } from 'naive-ui'
import { useConfigStore } from '~/stores/config'
import dayjs from 'dayjs'

const configStore = useConfigStore()
const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

// Loading state
const loading = ref(false)
const exporting = ref(false)

// Table data
const tableData = ref<any[]>([])

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
  closureStatus: null as string | null
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

// Table columns
const columns: DataTableColumns<any> = [
  {
    title: '客诉编号',
    key: 'complaintNo',
    width: 130,
    fixed: 'left',
    render: (row) => h('a', {
      class: 'text-primary-600 hover:text-primary-800 cursor-pointer',
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
    title: '产线',
    key: 'productionLine',
    width: 80,
    render: (row) => row.productionLine?.name || '-'
  },
  {
    title: '问题大类',
    key: 'problemCategory',
    width: 100,
    render: (row) => row.problemCategory?.name || '-'
  },
  {
    title: '内部问题名称',
    key: 'internalComplaintName',
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.internalComplaintName || '-'
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
      const status = statusMap[row.closureStatus] || { label: row.closureStatus, type: 'default' }
      return h(NTag, { type: status.type, size: 'small' }, () => status.label)
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, {
        size: 'small',
        text: true,
        type: 'primary',
        onClick: () => router.push(`/complaints/${row.id}`)
      }, () => '查看'),
      h(NButton, {
        size: 'small',
        text: true,
        type: 'primary',
        onClick: () => router.push(`/complaints/${row.id}/edit`)
      }, () => '编辑'),
      h(NButton, {
        size: 'small',
        text: true,
        type: 'error',
        onClick: () => handleDelete(row)
      }, () => '删除')
    ])
  }
]

// Load data
onMounted(async () => {
  await configStore.loadConfig()

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

    const queryString = new URLSearchParams(params).toString()
    window.open(`/api/complaints/export?${queryString}`, '_blank')
  } catch (e) {
    message.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

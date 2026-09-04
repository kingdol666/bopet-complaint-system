<template>
  <n-modal v-model:show="show" preset="card" title="我创建的数据" class="my-data-modal" :style="{ width: '960px', maxWidth: '95vw' }">
    <template #header-extra>
      <n-tag size="small" type="primary" :bordered="false">{{ pagination.total }} 条</n-tag>
    </template>

    <!-- 说明 -->
    <n-alert type="info" :bordered="false" style="margin-bottom: 12px;">
      这里展示您创建的所有数据（无论公开或私密）。私密数据仅您自己可见，您可以为这些数据设置公开/私密状态。
    </n-alert>

    <!-- 查询条件 -->
    <div class="my-data-filters">
      <n-input v-model:value="filters.keyword" placeholder="搜索：编号/内容/分类..." clearable style="width: 200px" @clear="handleSearch" @keyup.enter="handleSearch">
        <template #prefix>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </template>
      </n-input>
      <n-date-picker v-model:value="dateRange" type="daterange" clearable style="width: 260px" @update:value="handleDateChange" />
      <n-select v-model:value="filters.templateId" :options="templateOptions" placeholder="按模板筛选" clearable filterable style="width: 220px" @update:value="handleSearch" />
      <n-select v-model:value="filters.visibility" :options="visibilityOptions" placeholder="可见性" style="width: 130px" @update:value="handleSearch" />
      <n-button type="primary" @click="handleSearch">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </template>
        查询
      </n-button>
    </div>

    <!-- 表格 -->
    <n-data-table
      :columns="columns"
      :data="records"
      :loading="loading"
      :row-key="(row: any) => row.id"
      size="small"
      :scroll-x="860"
      :max-height="420"
    />

    <div class="my-data-footer">
      <span class="footer-total">共 {{ pagination.total }} 条记录</span>
      <n-pagination
        v-model:page="pagination.page"
        :page-count="pagination.totalPages"
        :page-size="pagination.pageSize"
        @update:page="loadData"
      />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NSpace, NSwitch, NTag, NTooltip } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()

const show = computed({
  get: () => props.show,
  set: (val: boolean) => emit('update:show', val)
})

const loading = ref(false)
const records = ref<any[]>([])
const templates = ref<any[]>([])
const dateRange = ref<[number, number] | null>(null)

const filters = reactive({
  keyword: '',
  templateId: null as number | null,
  visibility: 'all' as 'all' | 'public' | 'private'
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const visibilityOptions = [
  { label: '全部', value: 'all' },
  { label: '公开', value: 'public' },
  { label: '私密', value: 'private' }
]

const templateOptions = computed(() =>
  templates.value.map(t => ({ label: t.name, value: t.id }))
)

const columns: DataTableColumn<any>[] = [
  {
    title: '记录编号',
    key: 'dataNo',
    width: 140,
    fixed: 'left',
    render: (row) => h('a', {
      class: 'text-primary-600 hover:text-primary-800 cursor-pointer font-medium',
      onClick: () => { show.value = false; router.push(`/datas/${row.id}`) }
    }, row.dataNo)
  },
  {
    title: '反馈日期',
    key: 'feedbackDate',
    width: 110,
    render: (row) => row.feedbackDate ? dayjs(row.feedbackDate).format('YYYY-MM-DD') : '-'
  },
  {
    title: '内容',
    key: 'feedbackContent',
    ellipsis: { tooltip: true },
    render: (row) => row.feedbackContent || '-'
  },
  {
    title: '状态',
    key: 'closureStatus',
    width: 90,
    render: (row) => h(NTag, {
      size: 'small',
      type: row.closureStatus === 'closed' ? 'success' : row.closureStatus === 'processing' ? 'info' : 'default',
      bordered: false
    }, () => row.closureStatus === 'closed' ? '已处理' : row.closureStatus === 'processing' ? '处理中' : '待分析')
  },
  {
    title: '公开/私密',
    key: 'isPublic',
    width: 140,
    render: (row) => h(NSpace, { size: 'small', align: 'center' }, () => [
      h(NSwitch, {
        checkedValue: true,
        uncheckedValue: false,
        value: row.isPublic,
        size: 'small',
        onUpdateValue: (val: boolean) => handleTogglePublic(row, val)
      }),
      h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h('span', {
          style: 'font-size:12px;color:' + (row.isPublic ? '#16a34a' : '#d97706')
        }, row.isPublic ? '公开' : '私密'),
        default: () => row.isPublic ? '同部门可见，点击设为私密（仅自己可见）' : '仅自己可见，点击设为公开（同部门可见）'
      })
    ])
  }
]

async function loadData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      visibility: filters.visibility,
      ...filters
    }
    if (dateRange.value) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
    })
    const resp = await $fetch('/api/datas/mine', { params, headers: authStore.getAuthHeaders() }) as any
    if (resp.success) {
      records.value = resp.data.records
      pagination.total = resp.data.pagination.total
      pagination.totalPages = resp.data.pagination.totalPages
    }
  } catch (e: any) {
    message.error(e?.data?.message || '加载我创建的数据失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleDateChange(value: [number, number] | null) {
  dateRange.value = value
  handleSearch()
}

async function handleTogglePublic(row: any, val: boolean) {
  try {
    await $fetch(`/api/datas/${row.id}`, {
      method: 'PATCH',
      headers: authStore.getAuthHeaders(),
      body: { isPublic: val }
    })
    row.isPublic = val
    message.success(val ? '已设为公开（同部门可见）' : '已设为私密（仅自己可见）')
  } catch (e: any) {
    message.error(e?.data?.message || '切换失败')
  }
}

// 打开时加载数据
watch(() => props.show, (val) => {
  if (val) {
    pagination.page = 1
    loadData()
    if (templates.value.length === 0) {
      $fetch('/api/templates', { headers: authStore.getAuthHeaders() }).then((r: any) => {
        if (r.success) templates.value = r.data
      }).catch(() => {})
    }
  }
})
</script>

<style scoped>
.my-data-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  align-items: center;
  margin-bottom: 0.875rem;
}

.my-data-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.875rem;
}

.footer-total {
  font-size: 0.8125rem;
  color: #64748b;
}
</style>

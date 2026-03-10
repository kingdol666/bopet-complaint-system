<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="page-title mb-0">问题映射字典</h1>
      <n-button type="primary" @click="handleAdd">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </template>
        新增映射
      </n-button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索客户表述/关键词/内部名称..."
          clearable
          class="w-64"
          @keyup.enter="handleSearch"
        />

        <n-select
          v-model:value="filters.problemCategoryId"
          :options="problemCategoryOptionsWithAll"
          placeholder="问题大类"
          clearable
          class="w-48"
          @update:value="handleSearch"
        />

        <n-select
          v-model:value="filters.enabled"
          :options="enabledOptions"
          placeholder="状态"
          clearable
          class="w-32"
          @update:value="handleSearch"
        />

        <n-button @click="handleSearch">搜索</n-button>
        <n-button @click="handleReset">重置</n-button>
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
      />

      <div class="flex justify-end mt-4">
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          :page-size="pagination.pageSize"
          @update:page="loadData"
        />
      </div>
    </div>

    <!-- Edit Modal -->
    <n-modal v-model:show="modalVisible" preset="card" :title="editingId ? '编辑映射' : '新增映射'" style="width: 600px;">
      <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="120">
        <n-form-item label="客户表述" path="customerExpression">
          <n-input v-model:value="formData.customerExpression" placeholder="客户的原始表述" />
        </n-form-item>

        <n-form-item label="关键词" path="keywordPattern">
          <n-input v-model:value="formData.keywordPattern" placeholder="多个关键词用逗号分隔" />
        </n-form-item>

        <n-form-item label="内部名称" path="internalComplaintName">
          <n-input v-model:value="formData.internalComplaintName" placeholder="内部标准问题名称" />
        </n-form-item>

        <n-form-item label="问题大类" path="problemCategoryId">
          <n-select
            v-model:value="formData.problemCategoryId"
            :options="problemCategoryOptions"
            placeholder="选择问题大类"
            clearable
          />
        </n-form-item>

        <n-form-item label="问题小类" path="problemSubcategoryId">
          <n-select
            v-model:value="formData.problemSubcategoryId"
            :options="filteredSubcategoryOptions"
            placeholder="选择问题小类"
            clearable
            :disabled="!formData.problemCategoryId"
          />
        </n-form-item>

        <n-form-item label="是否启用" path="enabled">
          <n-switch v-model:value="formData.enabled" />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            保存
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag, NButton, NSpace, NSwitch } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useConfigStore } from '~/stores/config'
import type { FormInst, FormRules } from 'naive-ui'

const configStore = useConfigStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

const filters = reactive({
  keyword: '',
  problemCategoryId: null as number | null,
  enabled: null as boolean | null
})

// Modal
const modalVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

const formData = reactive({
  customerExpression: '',
  keywordPattern: '',
  internalComplaintName: '',
  problemCategoryId: null as number | null,
  problemSubcategoryId: null as number | null,
  enabled: true
})

const rules: FormRules = {
  customerExpression: [
    { required: true, message: '请输入客户表述', trigger: 'blur' }
  ],
  internalComplaintName: [
    { required: true, message: '请输入内部名称', trigger: 'blur' }
  ]
}

// Options
const problemCategoryOptions = computed(() => configStore.problemCategoryOptions)
const problemCategoryOptionsWithAll = computed(() => configStore.problemCategoryOptions)
const enabledOptions = [
  { label: '启用', value: true },
  { label: '禁用', value: false }
]

const filteredSubcategoryOptions = computed(() => {
  if (!formData.problemCategoryId) return []
  return configStore.problemSubcategoryOptions.filter(
    (s: any) => s.categoryId === formData.problemCategoryId
  )
})

// Table columns
const columns: DataTableColumns<any> = [
  {
    title: '客户表述',
    key: 'customerExpression',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: '关键词',
    key: 'keywordPattern',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: '内部名称',
    key: 'internalComplaintName',
    width: 150
  },
  {
    title: '问题大类',
    key: 'problemCategory',
    width: 120,
    render: (row) => row.problemCategory?.name || '-'
  },
  {
    title: '问题小类',
    key: 'problemSubcategory',
    width: 120,
    render: (row) => row.problemSubcategory?.name || '-'
  },
  {
    title: '状态',
    key: 'enabled',
    width: 100,
    render: (row) => h(NSwitch, {
      value: row.enabled,
      onUpdateValue: (val: boolean) => handleToggleEnabled(row, val)
    })
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, {
        size: 'small',
        text: true,
        type: 'primary',
        onClick: () => handleEdit(row)
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

// Load config and data
onMounted(async () => {
  await configStore.loadConfig()
  await loadData()
})

async function loadData() {
  loading.value = true

  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }

    // Remove empty filters
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await $fetch('/api/mappings', { params })

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

function handleReset() {
  filters.keyword = ''
  filters.problemCategoryId = null
  filters.enabled = null
  handleSearch()
}

function handleAdd() {
  editingId.value = null
  formData.customerExpression = ''
  formData.keywordPattern = ''
  formData.internalComplaintName = ''
  formData.problemCategoryId = null
  formData.problemSubcategoryId = null
  formData.enabled = true
  modalVisible.value = true
}

function handleEdit(row: any) {
  editingId.value = row.id
  formData.customerExpression = row.customerExpression
  formData.keywordPattern = row.keywordPattern || ''
  formData.internalComplaintName = row.internalComplaintName
  formData.problemCategoryId = row.problemCategoryId
  formData.problemSubcategoryId = row.problemSubcategoryId
  formData.enabled = row.enabled
  modalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    if (editingId.value) {
      // Update
      await $fetch(`/api/mappings/${editingId.value}`, {
        method: 'PUT',
        body: formData
      })
      message.success('更新成功')
    } else {
      // Create
      await $fetch('/api/mappings', {
        method: 'POST',
        body: formData
      })
      message.success('创建成功')
    }

    modalVisible.value = false
    await loadData()
  } catch (error: any) {
    message.error(error.data?.statusMessage || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleToggleEnabled(row: any, enabled: boolean) {
  try {
    await $fetch(`/api/mappings/${row.id}`, {
      method: 'PUT',
      body: { enabled }
    })
    message.success(enabled ? '已启用' : '已禁用')
    await loadData()
  } catch (e) {
    message.error('操作失败')
  }
}

function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除该映射记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/mappings/${row.id}`, {
          method: 'DELETE'
        })
        message.success('删除成功')
        await loadData()
      } catch (e) {
        message.error('删除失败')
      }
    }
  })
}
</script>

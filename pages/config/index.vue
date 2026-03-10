<template>
  <div>
    <h1 class="page-title">系统配置</h1>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane v-for="item in configTabs" :key="item.key" :name="item.key" :tab="item.label">
        <div class="mt-4">
          <!-- Toolbar -->
          <div class="flex justify-end mb-4">
            <n-button type="primary" @click="handleAdd(item.key)">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </template>
              新增
            </n-button>
          </div>

          <!-- Table -->
          <n-data-table
            :columns="getTableColumns(item.key)"
            :data="getTableData(item.key)"
            :loading="loading"
            :row-key="(row: any) => row.id"
          />
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- Edit Modal -->
    <n-modal v-model:show="modalVisible" preset="card" :title="editingId ? '编辑' : '新增'" style="width: 600px;">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="100">
        <n-form-item label="编码" path="code">
          <n-input v-model:value="formData.code" placeholder="编码" />
        </n-form-item>

        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="名称" />
        </n-form-item>

        <!-- Additional fields based on type -->
        <template v-if="currentType === 'customers'">
          <n-form-item label="简称">
            <n-input v-model:value="formData.shortName" placeholder="客户简称" />
          </n-form-item>
        </template>

        <template v-if="currentType === 'product-models'">
          <n-form-item label="厚度">
            <n-input v-model:value="formData.thickness" placeholder="如：12μm" />
          </n-form-item>
          <n-form-item label="用途">
            <n-input v-model:value="formData.application" placeholder="用途" />
          </n-form-item>
        </template>

        <template v-if="currentType === 'problem-subcategories'">
          <n-form-item label="所属大类" path="categoryId">
            <n-select
              v-model:value="formData.categoryId"
              :options="problemCategoryOptions"
              placeholder="选择问题大类"
            />
          </n-form-item>
        </template>

        <template v-if="currentType === 'severity-levels'">
          <n-form-item label="等级" path="level">
            <n-input-number v-model:value="formData.level" :min="1" :max="5" class="w-full" />
          </n-form-item>
          <n-form-item label="颜色">
            <n-color-picker v-model:value="formData.color" :modes="['hex']" />
          </n-form-item>
        </template>

        <template v-if="currentType === 'responsible-processes'">
          <n-form-item label="所属部门" path="departmentId">
            <n-select
              v-model:value="formData.departmentId"
              :options="responsibleDepartmentOptions"
              placeholder="选择责任部门"
            />
          </n-form-item>
        </template>

        <n-form-item label="排序">
          <n-input-number v-model:value="formData.sortOrder" :min="0" class="w-full" />
        </n-form-item>

        <n-form-item label="是否启用">
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
import { NTag, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns, FormRules } from 'naive-ui'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()

// Check admin access
if (!authStore.isAdmin) {
  throw createError({
    statusCode: 403,
    statusMessage: '需要管理员权限'
  })
}

const activeTab = ref('production-lines')
const loading = ref(false)
const modalVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const currentType = ref('')

// Config tabs
const configTabs = [
  { key: 'production-lines', label: '产线' },
  { key: 'customers', label: '客户' },
  { key: 'product-models', label: '产品型号' },
  { key: 'problem-categories', label: '问题大类' },
  { key: 'problem-subcategories', label: '问题小类' },
  { key: 'customer-demands', label: '客户诉求' },
  { key: 'compensation-types', label: '赔偿方式' },
  { key: 'severity-levels', label: '严重等级' },
  { key: 'responsible-departments', label: '责任部门' },
  { key: 'responsible-processes', label: '责任工序' }
]

// Data storage
const configData: Record<string, any[]> = {
  'production-lines': [],
  'customers': [],
  'product-models': [],
  'problem-categories': [],
  'problem-subcategories': [],
  'customer-demands': [],
  'compensation-types': [],
  'severity-levels': [],
  'responsible-departments': [],
  'responsible-processes': []
}

// Form data
const formData = reactive({
  code: '',
  name: '',
  shortName: '',
  thickness: '',
  application: '',
  categoryId: null as number | null,
  departmentId: null as number | null,
  level: 1,
  color: '#6b7280',
  sortOrder: 0,
  enabled: true
})

const formRef = ref()

// Options
const problemCategoryOptions = computed(() =>
  configData['problem-categories'].map(c => ({ label: c.name, value: c.id }))
)
const responsibleDepartmentOptions = computed(() =>
  configData['responsible-departments'].map(d => ({ label: d.name, value: d.id }))
)

// Form rules
const formRules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  categoryId: [{ type: 'number', required: true, message: '请选择所属大类', trigger: 'blur' }],
  departmentId: [{ type: 'number', required: true, message: '请选择所属部门', trigger: 'blur' }]
}

// Get table columns
function getTableColumns(type: string): DataTableColumns<any> {
  const baseColumns: DataTableColumns<any> = [
    { title: '编码', key: 'code', width: 100 },
    { title: '名称', key: 'name', width: 200 }
  ]

  // Add extra columns based on type
  if (type === 'problem-subcategories') {
    baseColumns.push({
      title: '所属大类',
      key: 'category',
      width: 120,
      render: (row) => row.category?.name || '-'
    })
  }

  if (type === 'responsible-processes') {
    baseColumns.push({
      title: '所属部门',
      key: 'department',
      width: 120,
      render: (row) => row.department?.name || '-'
    })
  }

  if (type === 'severity-levels') {
    baseColumns.push(
      { title: '等级', key: 'level', width: 80 },
      {
        title: '颜色',
        key: 'color',
        width: 80,
        render: (row) => h('div', {
          class: 'w-6 h-6 rounded',
          style: { backgroundColor: row.color }
        })
      }
    )
  }

  baseColumns.push(
    { title: '排序', key: 'sortOrder', width: 80 },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      render: (row) => h(NTag, {
        type: row.enabled ? 'success' : 'default',
        size: 'small'
      }, () => row.enabled ? '启用' : '禁用')
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
          onClick: () => handleEdit(type, row)
        }, () => '编辑'),
        h(NButton, {
          size: 'small',
          text: true,
          type: 'error',
          onClick: () => handleDelete(type, row)
        }, () => '删除')
      ])
    }
  )

  return baseColumns
}

// Get table data
function getTableData(type: string) {
  return configData[type] || []
}

// Load all config data
onMounted(async () => {
  await loadAllConfig()
})

async function loadAllConfig() {
  loading.value = true

  try {
    // Load each config type
    for (const tab of configTabs) {
      const response = await $fetch(`/api/config/items?type=${tab.key}`)
      if (response.success) {
        configData[tab.key] = response.data
      }
    }
  } catch (e) {
    message.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// Handle add
function handleAdd(type: string) {
  currentType.value = type
  editingId.value = null
  formData.code = ''
  formData.name = ''
  formData.shortName = ''
  formData.thickness = ''
  formData.application = ''
  formData.categoryId = null
  formData.departmentId = null
  formData.level = 1
  formData.color = '#6b7280'
  formData.sortOrder = 0
  formData.enabled = true
  modalVisible.value = true
}

// Handle edit
function handleEdit(type: string, row: any) {
  currentType.value = type
  editingId.value = row.id
  formData.code = row.code
  formData.name = row.name
  formData.shortName = row.shortName || ''
  formData.thickness = row.thickness || ''
  formData.application = row.application || ''
  formData.categoryId = row.categoryId || row.category?.id || null
  formData.departmentId = row.departmentId || row.department?.id || null
  formData.level = row.level || 1
  formData.color = row.color || '#6b7280'
  formData.sortOrder = row.sortOrder || 0
  formData.enabled = row.enabled
  modalVisible.value = true
}

// Handle submit
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    const payload: any = {
      code: formData.code,
      name: formData.name,
      sortOrder: formData.sortOrder,
      enabled: formData.enabled
    }

    // Add type-specific fields
    if (currentType.value === 'customers') {
      payload.shortName = formData.shortName || null
    }
    if (currentType.value === 'product-models') {
      payload.thickness = formData.thickness || null
      payload.application = formData.application || null
    }
    if (currentType.value === 'problem-subcategories') {
      payload.categoryId = formData.categoryId
    }
    if (currentType.value === 'severity-levels') {
      payload.level = formData.level
      payload.color = formData.color
    }
    if (currentType.value === 'responsible-processes') {
      payload.departmentId = formData.departmentId
    }

    if (editingId.value) {
      payload.id = editingId.value
      await $fetch(`/api/config/${currentType.value}`, {
        method: 'PUT',
        body: payload,
        headers: authStore.getAuthHeaders()
      })
      message.success('更新成功')
    } else {
      await $fetch(`/api/config/${currentType.value}`, {
        method: 'POST',
        body: payload,
        headers: authStore.getAuthHeaders()
      })
      message.success('创建成功')
    }

    modalVisible.value = false
    await loadAllConfig()
  } catch (error: any) {
    message.error(error.data?.statusMessage || '操作失败')
  } finally {
    submitting.value = false
  }
}

// Handle delete
function handleDelete(type: string, row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除 "${row.name}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/config/${type}?id=${row.id}`, {
          method: 'DELETE',
          headers: authStore.getAuthHeaders()
        })
        message.success('删除成功')
        await loadAllConfig()
      } catch (e) {
        message.error('删除失败')
      }
    }
  })
}
</script>

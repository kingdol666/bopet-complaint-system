<template>
  <div class="animate-fade-in">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="page-title">表单模板管理</h1>
        <p class="page-subtitle">配置客诉表单模板和字段</p>
      </div>
      <n-button v-if="authStore.canWrite" type="primary" @click="handleAdd">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
          </svg>
        </template>
        新增模板
      </n-button>
    </div>

    <div class="card">
      <n-data-table
        :columns="columns"
        :data="templates"
        :loading="loading"
        :row-key="(row: any) => row.id"
      />
    </div>

    <!-- Template Edit Modal -->
    <n-modal v-model:show="modalVisible" preset="card" :title="editingId ? '编辑模板' : '新增模板'" style="width: 900px; max-height: 85vh; overflow-y: auto;">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="100">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <n-form-item label="模板名称" path="name">
            <n-input v-model:value="formData.name" placeholder="如：包装客诉表单" />
          </n-form-item>

          <n-form-item label="所属部门" path="departmentId">
            <n-select
              v-model:value="formData.departmentId"
              :options="departmentOptions"
              placeholder="留空则为全局模板"
              clearable
            />
          </n-form-item>
        </div>

        <n-form-item label="描述">
          <n-input v-model:value="formData.description" type="textarea" placeholder="模板描述（可选）" :rows="2" />
        </n-form-item>

        <div class="flex items-center gap-4">
          <n-form-item label="排序">
            <n-input-number v-model:value="formData.sortOrder" :min="0" class="w-32" />
          </n-form-item>
          <n-form-item label="启用">
            <n-switch v-model:value="formData.enabled" />
          </n-form-item>
        </div>

        <!-- Fields Section -->
        <div class="border-t border-corporate-200 pt-4 mt-4">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-corporate-900">字段配置</h3>
            </div>
            <n-button size="small" type="primary" @click="handleAddField">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
                </svg>
              </template>
              添加字段
            </n-button>
          </div>

          <div v-if="formData.fields.length === 0" class="text-center py-12">
            <div class="w-16 h-16 rounded-2xl bg-corporate-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-corporate-500">暂无字段，请点击"添加字段"</p>
          </div>

          <div v-for="(field, index) in formData.fields" :key="index" class="mb-4 p-4 border border-corporate-200 rounded-xl bg-corporate-50/50">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">
                  {{ index + 1 }}
                </div>
                <span class="text-sm font-medium text-corporate-700">字段 #{{ index + 1 }}</span>
              </div>
              <n-button size="tiny" type="error" quaternary @click="handleRemoveField(index)">
                <template #icon>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </template>
                删除
              </n-button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <n-form-item label="字段键名" :show-feedback="false">
                <n-input v-model:value="field.fieldKey" placeholder="如: customerId 或 custom_remark" />
              </n-form-item>

              <n-form-item label="显示标签" :show-feedback="false">
                <n-input v-model:value="field.fieldLabel" placeholder="如: 客户名称" />
              </n-form-item>

              <n-form-item label="字段类型" :show-feedback="false">
                <n-select v-model:value="field.fieldType" :options="fieldTypeOptions" />
              </n-form-item>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <n-form-item label="占位提示" :show-feedback="false">
                <n-input v-model:value="field.placeholder" placeholder="输入提示文字" />
              </n-form-item>

              <n-form-item v-if="field.fieldType === 'select-config'" label="配置源" :show-feedback="false">
                <n-select v-model:value="field.configType" :options="configTypeOptions" placeholder="选择配置源" />
              </n-form-item>

              <n-form-item v-if="field.fieldType === 'select'" label="选项(JSON)" :show-feedback="false">
                <n-input v-model:value="field.options" placeholder='["选项1","选项2"]' />
              </n-form-item>

              <div class="flex items-end gap-4 pb-1">
                <n-form-item label="排序" :show-feedback="false">
                  <n-input-number v-model:value="field.sortOrder" :min="0" class="w-24" />
                </n-form-item>
                <n-form-item label="必填" :show-feedback="false">
                  <n-switch v-model:checked="field.required" />
                </n-form-item>
              </div>
            </div>
          </div>
        </div>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 13l4 4L19 7" />
              </svg>
            </template>
            保存
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NSpace, NTag } from 'naive-ui'
import { useConfigStore } from '~/stores/config'
import { useAuthStore } from '~/stores/auth'
import type { FormInst, FormRules } from 'naive-ui'

const configStore = useConfigStore()
const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const templates = ref<any[]>([])
const modalVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

interface FieldForm {
  id?: number
  fieldKey: string
  fieldLabel: string
  fieldType: string
  required: boolean
  sortOrder: number
  options: string | null
  configType: string | null
  defaultValue: string | null
  placeholder: string | null
}

const formData = reactive({
  name: '',
  description: null as string | null,
  departmentId: null as number | null,
  enabled: true,
  sortOrder: 0,
  fields: [] as FieldForm[]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '配置选择', value: 'select-config' },
  { label: '日期', value: 'date' },
  { label: '开关', value: 'switch' }
]

const configTypeOptions = [
  { label: '客户', value: 'customers' },
  { label: '产品型号', value: 'productModels' },
  { label: '产线', value: 'productionLines' },
  { label: '问题大类', value: 'problemCategories' },
  { label: '问题小类', value: 'problemSubcategories' },
  { label: '客户诉求', value: 'customerDemands' },
  { label: '赔偿方式', value: 'compensationTypes' },
  { label: '严重等级', value: 'severityLevels' },
  { label: '责任部门', value: 'responsibleDepartments' },
  { label: '责任工序', value: 'responsibleProcesses' }
]

const departmentOptions = computed(() => configStore.responsibleDepartmentOptions)

// Table columns
const columns = computed(() => {
  const baseColumns: any[] = [
    {
      title: '模板名称',
      key: 'name',
      width: 200,
      render: (row: any) => {
        const nameSpan = h('span', { class: 'font-medium text-corporate-900' }, row.name)
        if (row.isDefault) {
          return h('div', { class: 'flex items-center gap-2' }, [
            nameSpan,
            h(NTag, { type: 'primary', size: 'small', round: true }, () => '默认')
          ])
        }
        return nameSpan
      }
    },
    {
      title: '所属部门',
      key: 'department',
      width: 120,
      render: (row: any) => row.department?.name
        ? h(NTag, { type: 'info', size: 'small', round: true }, () => row.department.name)
        : h('span', { class: 'text-corporate-500' }, '全局')
    },
    {
      title: '字段数',
      key: 'fields',
      width: 80,
      render: (row: any) => h('span', { class: 'text-corporate-600 font-medium' }, row.fields?.length || 0)
    },
    {
      title: '使用次数',
      key: 'complaints',
      width: 90,
      render: (row: any) => h('span', { class: 'text-corporate-600 font-medium' }, row._count?.complaints || 0)
    },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      render: (row: any) => h(NTag, { type: row.enabled ? 'success' : 'default', size: 'small', round: true }, () => row.enabled ? '启用' : '禁用')
    },
    {
      title: '创建人',
      key: 'createdBy',
      width: 100,
      render: (row: any) => h('span', { class: 'text-corporate-600' }, row.createdBy?.name || '-')
    }
  ]

  if (authStore.canWrite) {
    baseColumns.push({
      title: '操作',
      key: 'actions',
      width: 160,
      render: (row: any) => {
        const userDeptIds = authStore.departmentIds
        const isGlobalTemplate = !row.departmentId
        const isInUserDept = row.departmentId && userDeptIds.includes(row.departmentId)
        const canOperate = authStore.isSuperAdmin || (authStore.isAdmin && isInUserDept)

        if (!canOperate) {
          return h('span', { class: 'text-warning', style: { fontSize: '12px' } }, '-')
        }

        return h(NSpace, { size: 'small' }, () => [
          h(NButton, { size: 'small', onClick: () => handleEdit(row) }, () => '编辑'),
          h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, () => '删除')
        ])
      }
    })
  }

  return baseColumns
})

// Load data
onMounted(async () => {
  await configStore.loadConfig()
  await loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    const response = await $fetch('/api/templates')
    if (response.success) {
      templates.value = response.data
    }
  } catch (e) {
    message.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  formData.name = ''
  formData.description = null
  formData.departmentId = null
  formData.enabled = true
  formData.sortOrder = 0
  formData.fields = []
  editingId.value = null
}

function handleAdd() {
  resetForm()
  modalVisible.value = true
}

function handleEdit(row: any) {
  editingId.value = row.id
  formData.name = row.name
  formData.description = row.description
  formData.departmentId = row.departmentId
  formData.enabled = row.enabled
  formData.sortOrder = row.sortOrder
  formData.fields = (row.fields || []).map((f: any) => ({
    id: f.id,
    fieldKey: f.fieldKey,
    fieldLabel: f.fieldLabel,
    fieldType: f.fieldType,
    required: f.required,
    sortOrder: f.sortOrder,
    options: f.options,
    configType: f.configType,
    defaultValue: f.defaultValue,
    placeholder: f.placeholder
  }))
  modalVisible.value = true
}

function handleDelete(row: any) {
  if (row.isDefault) {
    message.warning('系统默认模板不可删除')
    return
  }
  dialog.warning({
    title: '确认删除',
    content: `确定要删除模板"${row.name}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/templates/${row.id}`, {
          method: 'DELETE',
          headers: authStore.getAuthHeaders()
        })
        message.success('删除成功')
        await loadTemplates()
      } catch (e: any) {
        message.error(e.data?.statusMessage || '删除失败')
      }
    }
  })
}

function handleAddField() {
  formData.fields.push({
    fieldKey: '',
    fieldLabel: '',
    fieldType: 'text',
    required: false,
    sortOrder: formData.fields.length,
    options: null,
    configType: null,
    defaultValue: null,
    placeholder: null
  })
}

function handleRemoveField(index: number) {
  formData.fields.splice(index, 1)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请填写必填项')
    return
  }

  // Validate fields
  for (const field of formData.fields) {
    if (!field.fieldKey.trim()) {
      message.error('所有字段的"键名"不能为空')
      return
    }
    if (!field.fieldLabel.trim()) {
      message.error('所有字段的"标签"不能为空')
      return
    }
  }

  submitting.value = true

  try {
    const payload = {
      name: formData.name,
      description: formData.description,
      departmentId: formData.departmentId,
      enabled: formData.enabled,
      sortOrder: formData.sortOrder,
      fields: formData.fields
    }

    if (editingId.value) {
      await $fetch(`/api/templates/${editingId.value}`, {
        method: 'PUT',
        body: payload,
        headers: authStore.getAuthHeaders()
      })
      message.success('模板更新成功')
    } else {
      await $fetch('/api/templates', {
        method: 'POST',
        body: payload,
        headers: authStore.getAuthHeaders()
      })
      message.success('模板创建成功')
    }

    modalVisible.value = false
    await loadTemplates()
  } catch (error: any) {
    message.error(error.data?.statusMessage || '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

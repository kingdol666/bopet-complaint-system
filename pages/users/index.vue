<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="page-title mb-0">用户管理</h1>
      <n-button type="primary" @click="openCreateModal">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </template>
        新增用户
      </n-button>
    </div>

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
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <n-modal
      v-model:show="showModal"
      :title="editingUser ? '编辑用户' : '新增用户'"
      preset="dialog"
      :show-icon="false"
      style="width: 560px"
    >
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="80" class="mt-4">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="formData.username" placeholder="请输入用户名" :disabled="!!editingUser" />
        </n-form-item>
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入姓名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="formData.password" type="password" show-password-on="click" :placeholder="editingUser ? '不修改请留空' : '请输入密码'" />
        </n-form-item>
        <n-form-item label="角色" path="role">
          <n-select v-model:value="formData.role" :options="roleOptions" placeholder="请选择角色" />
        </n-form-item>
        <n-form-item label="所属部门" path="departmentIds">
          <n-select
            v-model:value="formData.departmentIds"
            :options="departmentOptions"
            multiple
            placeholder="请选择所属部门（可多选）"
          />
        </n-form-item>
        <n-form-item v-if="editingUser" label="启用状态" path="enabled">
          <n-switch v-model:value="formData.enabled" />
        </n-form-item>
      </n-form>

      <template #action>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingUser ? '保存' : '创建' }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag, NButton, NSpace, NSwitch } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
import { useConfigStore } from '~/stores/config'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const configStore = useConfigStore()

// If not superadmin, redirect
if (!authStore.isSuperAdmin) {
  navigateTo('/')
}

const loading = ref(false)
const submitting = ref(false)
const showModal = ref(false)
const editingUser = ref<any>(null)
const tableData = ref<any[]>([])
const formRef = ref()

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

const formData = reactive({
  username: '',
  name: '',
  password: '',
  role: 'normal' as string,
  enabled: true,
  departmentIds: [] as number[]
})

const formRules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  name: { required: true, message: '请输入姓名', trigger: 'blur' },
  role: { required: true, message: '请选择角色', trigger: 'change' }
}

const roleOptions = [
  { label: '超级管理员', value: 'superadmin' },
  { label: '部门管理员', value: 'admin' },
  { label: '普通用户', value: 'normal' }
]

const departmentOptions = computed(() => configStore.responsibleDepartmentOptions || [])

const columns: DataTableColumn<any>[] = [
  {
    title: '用户名',
    key: 'username',
    width: 120
  },
  {
    title: '姓名',
    key: 'name',
    width: 120
  },
  {
    title: '角色',
    key: 'role',
    width: 120,
    render: (row) => {
      const map: Record<string, { label: string; type: 'error' | 'warning' | 'info' }> = {
        superadmin: { label: '超级管理员', type: 'error' },
        admin: { label: '部门管理员', type: 'warning' },
        normal: { label: '普通用户', type: 'info' }
      }
      const role = map[row.role] || { label: row.role, type: 'default' }
      return h(NTag, { type: role.type, size: 'small' }, () => role.label)
    }
  },
  {
    title: '所属部门',
    key: 'departments',
    render: (row) => {
      if (!row.departments?.length) return h('span', { class: 'text-gray-400' }, '未分配')
      return h(NSpace, { size: 'small' }, () =>
        row.departments.map((d: any) => h(NTag, { size: 'small', type: 'success' }, () => d.name))
      )
    }
  },
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
    width: 150,
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, {
        size: 'small',
        text: true,
        type: 'primary',
        onClick: () => openEditModal(row)
      }, () => '编辑'),
      h(NButton, {
        size: 'small',
        text: true,
        type: 'error',
        onClick: () => handleDelete(row),
        disabled: row.role === 'superadmin'
      }, () => '删除')
    ])
  }
]

onMounted(async () => {
  await configStore.loadConfig()
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await $fetch('/api/users', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize
      },
      headers: authStore.getAuthHeaders()
    })

    if (response.success) {
      tableData.value = response.data.records
      pagination.total = response.data.pagination.total
      pagination.totalPages = response.data.pagination.totalPages
    }
  } catch {
    message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadData()
}

function resetForm() {
  formData.username = ''
  formData.name = ''
  formData.password = ''
  formData.role = 'normal'
  formData.enabled = true
  formData.departmentIds = []
}

function openCreateModal() {
  editingUser.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(row: any) {
  editingUser.value = row
  formData.username = row.username
  formData.name = row.name
  formData.password = ''
  formData.role = row.role
  formData.enabled = row.enabled
  formData.departmentIds = row.departments?.map((d: any) => d.id) || []
  showModal.value = true
}

async function handleSubmit() {
  submitting.value = true
  try {
    if (editingUser.value) {
      // Update
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        departmentIds: formData.departmentIds,
        enabled: formData.enabled
      }
      if (formData.password) {
        updateData.password = formData.password
      }

      await $fetch(`/api/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: updateData,
        headers: authStore.getAuthHeaders()
      })
      message.success('用户更新成功')
    } else {
      // Create
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          username: formData.username,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          departmentIds: formData.departmentIds
        },
        headers: authStore.getAuthHeaders()
      })
      message.success('用户创建成功')
    }

    showModal.value = false
    await loadData()
  } catch (e: any) {
    message.error(e.data?.statusMessage || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除用户 "${row.name}" 吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/users/${row.id}`, {
          method: 'DELETE',
          headers: authStore.getAuthHeaders()
        })
        message.success('删除成功')
        await loadData()
      } catch {
        message.error('删除失败')
      }
    }
  })
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="mb-4">
      <h1 class="page-title">部门与人员管理</h1>
      <p class="page-subtitle">管理部门组织架构，查看人员分配</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Left: Department List -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-title mb-0">部门架构</h3>
          <n-button v-if="isSuperAdmin" size="small" type="primary" @click="openDeptModal()">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg></template>
            新增
          </n-button>
        </div>
        <n-spin :show="deptLoading">
          <div class="space-y-1 max-h-[600px] overflow-y-auto">
            <div v-for="d in departments" :key="d.id"
              class="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border"
              :class="selectedDeptId === d.id ? 'border-primary-300 bg-primary-50' : 'border-transparent hover:bg-gray-50'"
              @click="selectDept(d)">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800">{{ d.name }}</p>
                <p class="text-xs text-gray-400">{{ d._count?.userDepartments || 0 }}人 · {{ d._count?.complaints || 0
                  }}客诉</p>
              </div>
              <div v-if="isSuperAdmin" class="flex gap-0.5 shrink-0 ml-2">
                <n-button size="tiny" quaternary @click.stop="openDeptModal(d)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg></template>
                </n-button>
                <n-popconfirm @positive-click="deleteDept(d.id)">
                  <template #trigger>
                    <n-button size="tiny" quaternary type="error">
                      <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg></template>
                    </n-button>
                  </template>
                  确认删除部门「{{ d.name }}」？
                </n-popconfirm>
              </div>
            </div>
            <div v-if="!departments.length && !deptLoading" class="text-center py-8 text-gray-400 text-sm">
              暂无部门数据
            </div>
          </div>
        </n-spin>
      </div>

      <!-- Right: Users in selected department -->
      <div class="lg:col-span-2 card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-title mb-0">{{ selectedDept ? selectedDept.name + ' - 人员' : '选择部门查看人员' }}</h3>
          <n-button v-if="isSuperAdmin && selectedDept" size="small" type="primary" @click="openUserModal()">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg></template>
            添加人员
          </n-button>
        </div>

        <template v-if="selectedDept">
          <n-spin :show="userLoading">
            <n-data-table :columns="userCols" :data="deptUsers" size="small" :bordered="false" />
            <div v-if="!deptUsers.length && !userLoading" class="text-center py-8 text-gray-400 text-sm">
              该部门暂无人员
            </div>
          </n-spin>
        </template>
        <div v-else class="text-center py-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 opacity-30" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p>点击左侧部门查看人员架构</p>
        </div>
      </div>
    </div>

    <!-- Department Modal -->
    <n-modal v-model:show="deptModal" preset="card" :title="editingDept ? '编辑部门' : '新增部门'" style="width:420px">
      <n-form-item label="部门编码" required><n-input v-model:value="deptForm.code" placeholder="如 RD-01" /></n-form-item>
      <n-form-item label="部门名称" required><n-input v-model:value="deptForm.name" placeholder="如 生产部" /></n-form-item>
      <n-form-item label="排序"><n-input-number v-model:value="deptForm.sortOrder" :min="0" /></n-form-item>
      <template #footer>
        <n-button @click="deptModal = false">取消</n-button>
        <n-button type="primary" :loading="deptSaving" @click="saveDept">{{ editingDept ? '保存' : '创建' }}</n-button>
      </template>
    </n-modal>

    <!-- User Assignment Modal -->
    <n-modal v-model:show="userModal" preset="card" title="添加人员到部门" style="width:500px">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-medium text-gray-700 mb-1.5">选择用户</p>
          <n-spin :show="userListLoading" size="small">
            <n-select v-model:value="assignUserId" :options="availableUserOpts" placeholder="搜索用户..." filterable
              :loading="userListLoading" />
          </n-spin>
          <p v-if="!userListLoading && !availableUserOpts.length" class="text-xs text-gray-400 mt-1">
            暂无可添加的用户（所有启用用户已在此部门中）
          </p>
        </div>
      </div>
      <template #footer>
        <n-button @click="userModal = false">取消</n-button>
        <n-button type="primary" :loading="userSaving" :disabled="!assignUserId" @click="assignUser">确认添加</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const message = useMessage()
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

const departments = ref<any[]>([])
const selectedDeptId = ref<number | null>(null)
const selectedDept = ref<any>(null)
const deptUsers = ref<any[]>([])
const deptLoading = ref(false)
const userLoading = ref(false)
const allUsers = ref<any[]>([])

// Department modal
const deptModal = ref(false)
const deptSaving = ref(false)
const editingDept = ref<any>(null)
const deptForm = reactive({ code: '', name: '', sortOrder: 0 })

// User modal
const userModal = ref(false)
const userSaving = ref(false)
const userListLoading = ref(false)
const assignUserId = ref<number | null>(null)

const userCols = [
  { title: '用户名', key: 'username', width: 110 },
  { title: '姓名', key: 'name', width: 130 },
  {
    title: '角色', key: 'role', width: 100, render: (row: any) => {
      const m: Record<string, string> = { superadmin: '超级管理员', admin: '部门管理员', normal: '普通用户' }
      return m[row.role] || row.role
    }
  },
  { title: '状态', key: 'enabled', width: 70, render: (row: any) => row.enabled ? '启用' : '禁用' },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row: any) => {
      if (!isSuperAdmin.value || !selectedDept.value) return null
      return h('div', [
        h(resolveComponent('NPopconfirm'), { onPositiveClick: () => removeUser(row.userId) }, {
          trigger: () => h(resolveComponent('NButton'), { size: 'tiny', type: 'error', quaternary: true }, () => '移除')
        })
      ])
    }
  }
]

const availableUserOpts = computed(() => {
  const assignedIds = new Set(deptUsers.value.map(u => u.userId || u.id))
  return allUsers.value
    .filter(u => u.enabled && !assignedIds.has(u.id))
    .map(u => ({ label: `${u.name} (${u.username})`, value: u.id }))
})

async function loadDepartments() {
  deptLoading.value = true
  try {
    const r = await $fetch('/api/departments', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) departments.value = r.data
  } catch (e) { console.error(e) }
  deptLoading.value = false
}

async function selectDept(d: any) {
  selectedDeptId.value = d.id
  userLoading.value = true
  try {
    const r = await $fetch(`/api/departments/${d.id}`, { headers: authStore.getAuthHeaders() }) as any
    if (r.success) {
      selectedDept.value = r.data
      deptUsers.value = (r.data.userDepartments || []).map((ud: any) => ({
        ...ud.user, userId: ud.user.id, role: ud.user.role, enabled: ud.user.enabled
      }))
    }
  } catch (e) { console.error(e) }
  userLoading.value = false
}

function openDeptModal(d?: any) {
  editingDept.value = d || null
  deptForm.code = d?.code || ''
  deptForm.name = d?.name || ''
  deptForm.sortOrder = d?.sortOrder || 0
  deptModal.value = true
}

async function saveDept() {
  if (!deptForm.code || !deptForm.name) { message.error('请填写完整'); return }
  deptSaving.value = true
  try {
    if (editingDept.value) {
      await $fetch(`/api/departments/${editingDept.value.id}`, { method: 'PUT', headers: authStore.getAuthHeaders(), body: deptForm }) as any
      message.success('更新成功')
    } else {
      await $fetch('/api/departments', { method: 'POST', headers: authStore.getAuthHeaders(), body: deptForm }) as any
      message.success('创建成功')
    }
    deptModal.value = false
    await loadDepartments()
  } catch (e: any) { message.error(e.data?.statusMessage || '操作失败') }
  deptSaving.value = false
}

async function deleteDept(id: number) {
  try {
    await $fetch(`/api/departments/${id}`, { method: 'DELETE', headers: authStore.getAuthHeaders() }) as any
    message.success('已删除')
    selectedDeptId.value = null
    selectedDept.value = null
    deptUsers.value = []
    await loadDepartments()
  } catch (e: any) { message.error(e.data?.statusMessage || '操作失败') }
}

async function openUserModal() {
  // Always open modal first for responsive UX
  assignUserId.value = null
  userModal.value = true
  userListLoading.value = true
  // Then load users
  try {
    const r = await $fetch('/api/users', {
      headers: authStore.getAuthHeaders()
    }) as any
    if (r.success) {
      allUsers.value = r.data.records || r.data
    } else {
      message.error('获取用户列表失败')
    }
  } catch (e: any) {
    console.error('获取用户列表失败:', e)
    message.error('获取用户列表失败，请确认您有超级管理员权限')
  } finally {
    userListLoading.value = false
  }
}

async function assignUser() {
  if (!assignUserId.value || !selectedDeptId.value) return
  userSaving.value = true
  try {
    // Fetch user's current departments to preserve them
    const userResp = await $fetch(`/api/users/${assignUserId.value}`, {
      headers: authStore.getAuthHeaders()
    }) as any
    const currentDeptIds: number[] = userResp.success
      ? (userResp.data.departments || []).map((d: any) => d.id || d.departmentId)
      : []
    // Add new department without removing existing ones
    const newDeptIds = [...new Set([...currentDeptIds, selectedDeptId.value])]
    await $fetch(`/api/users/${assignUserId.value}`, {
      method: 'PUT',
      headers: authStore.getAuthHeaders(),
      body: { departmentIds: newDeptIds }
    }) as any
    message.success('已添加')
    userModal.value = false
    await selectDept(selectedDept.value!)
  } catch (e: any) { message.error(e.data?.statusMessage || '操作失败') }
  userSaving.value = false
}

async function removeUser(userId: number) {
  if (!selectedDeptId.value) return
  try {
    // Fetch user's current departments
    const userResp = await $fetch(`/api/users/${userId}`, {
      headers: authStore.getAuthHeaders()
    }) as any
    const currentDeptIds: number[] = userResp.success
      ? (userResp.data.departments || []).map((d: any) => d.id || d.departmentId)
      : []
    // Remove only the current department
    const newDeptIds = currentDeptIds.filter(id => id !== selectedDeptId.value)
    await $fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: authStore.getAuthHeaders(),
      body: { departmentIds: newDeptIds }
    }) as any
    message.success('已移除')
    await selectDept(selectedDept.value!)
  } catch (e: any) { message.error(e.data?.statusMessage || '操作失败') }
}

onMounted(async () => {
  await loadDepartments()
  if (departments.value.length) selectDept(departments.value[0])
})
</script>

<template>
  <div class="access-management-page animate-fade-in">
    <!-- Page header -->
    <div class="enterprise-page-header">
      <div class="page-header-content">
        <div class="page-header-left">
          <div class="enterprise-icon-wrapper purple">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0M14 14a7 7 0 00-7 7h14a7 7 0 00-7-7" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">跨部门数据权限</h1>
            <p class="page-subtitle">申请查看其他部门数据，管理本部门授权</p>
          </div>
        </div>
        <n-button type="primary" class="enterprise-small-btn" @click="openRequestModal"
          style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </template>
          申请查看权限
        </n-button>
      </div>
    </div>

    <!-- Stats summary -->
    <div class="stats-summary-grid">
      <div class="summary-card">
        <div class="summary-icon summary-icon-blue">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div class="summary-info">
          <p class="summary-value">{{ myAccess.length }}</p>
          <p class="summary-label">已获授权</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon summary-icon-amber">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="summary-info">
          <p class="summary-value">{{ outgoingRequests.filter(r => r.status === 'pending').length }}</p>
          <p class="summary-label">待审批申请</p>
        </div>
      </div>
      <div v-if="authStore.canWrite" class="summary-card">
        <div class="summary-icon summary-icon-green">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="summary-info">
          <p class="summary-value">{{ managedAccess.length }}</p>
          <p class="summary-label">已授出权限</p>
        </div>
      </div>
      <div v-if="authStore.canWrite" class="summary-card">
        <div class="summary-icon summary-icon-rose">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="summary-info">
          <p class="summary-value">{{ incomingRequests.filter(r => r.status === 'pending').length }}</p>
          <p class="summary-label">待我审批</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <n-tabs type="segment" v-model:value="activeTab" class="enterprise-tabs">
      <n-tab-pane name="mine" tab="我的授权">
        <div class="enterprise-card">
          <div class="enterprise-card-header">
            <h3 class="enterprise-card-title">已获得的跨部门查看权限</h3>
          </div>
          <n-spin :show="loadingMy">
            <n-data-table :columns="myAccessCols" :data="myAccess" :bordered="false" size="small" />
            <div v-if="!myAccess.length && !loadingMy" class="enterprise-empty-state">
              <div class="enterprise-empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p class="enterprise-empty-state-title">暂无跨部门查看权限</p>
              <p class="enterprise-empty-state-desc">点击右上角"申请查看权限"向其他部门发起申请</p>
            </div>
          </n-spin>
        </div>

        <div class="enterprise-card" style="margin-top: 1rem;">
          <div class="enterprise-card-header">
            <h3 class="enterprise-card-title">我发起的申请</h3>
          </div>
          <n-spin :show="loadingOutgoing">
            <n-data-table :columns="outgoingCols" :data="outgoingRequests" :bordered="false" size="small" />
            <div v-if="!outgoingRequests.length && !loadingOutgoing" class="enterprise-empty-state">
              <div class="enterprise-empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p class="enterprise-empty-state-title">暂无申请记录</p>
              <p class="enterprise-empty-state-desc">您还没有向其他部门发起过查看申请</p>
            </div>
          </n-spin>
        </div>
      </n-tab-pane>

      <n-tab-pane v-if="authStore.canWrite" name="manage" tab="待我审批">
        <div class="enterprise-card">
          <div class="enterprise-card-header">
            <h3 class="enterprise-card-title">待审批的查看申请</h3>
          </div>
          <n-spin :show="loadingIncoming">
            <n-data-table :columns="incomingCols" :data="incomingRequests" :bordered="false" size="small" />
            <div v-if="!incomingRequests.length && !loadingIncoming" class="enterprise-empty-state">
              <div class="enterprise-empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p class="enterprise-empty-state-title">暂无待审批申请</p>
              <p class="enterprise-empty-state-desc">目前没有需要您审批的跨部门查看申请</p>
            </div>
          </n-spin>
        </div>

        <div class="enterprise-card" style="margin-top: 1rem;">
          <div class="enterprise-card-header">
            <h3 class="enterprise-card-title">本部门已授权的查看权限</h3>
          </div>
          <n-spin :show="loadingManaged">
            <n-data-table :columns="managedAccessCols" :data="managedAccess" :bordered="false" size="small" />
            <div v-if="!managedAccess.length && !loadingManaged" class="enterprise-empty-state">
              <div class="enterprise-empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p class="enterprise-empty-state-title">暂无已授权的查看权限</p>
              <p class="enterprise-empty-state-desc">您所在部门尚未向其他人员授出查看权限</p>
            </div>
          </n-spin>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- Request Modal -->
    <n-modal v-model:show="requestModal" preset="card" title="申请查看部门数据" style="width:480px">
      <n-form-item label="选择部门" required>
        <n-select v-model:value="requestForm.departmentId" :options="deptOptions" placeholder="选择要查看的部门" filterable />
      </n-form-item>
      <n-form-item label="申请理由">
        <n-input v-model:value="requestForm.reason" type="textarea" placeholder="请简述查看该部门数据的需求" :rows="3" />
      </n-form-item>
      <template #footer>
        <n-button @click="requestModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" :disabled="!requestForm.departmentId" @click="submitRequest">提交申请</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ title: '跨部门数据权限' })

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()

const activeTab = ref('mine')

// Data
const myAccess = ref<any[]>([])
const outgoingRequests = ref<any[]>([])
const incomingRequests = ref<any[]>([])
const managedAccess = ref<any[]>([])
const allDepartments = ref<any[]>([])

// Loading states
const loadingMy = ref(false)
const loadingOutgoing = ref(false)
const loadingIncoming = ref(false)
const loadingManaged = ref(false)

// Modal
const requestModal = ref(false)
const submitting = ref(false)
const requestForm = reactive({ departmentId: null as number | null, reason: '' })

const statusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已批准', type: 'success' },
  rejected: { label: '已拒绝', type: 'error' }
}

const deptOptions = computed(() => {
  const myDeptIds = new Set(authStore.departmentIds)
  const grantedIds = new Set(authStore.grantedDepartmentIds)
  return allDepartments.value
    .filter(d => !myDeptIds.has(d.id) && !grantedIds.has(d.id))
    .map(d => ({ label: d.name, value: d.id }))
})

// Columns
const myAccessCols = [
  { title: '部门', key: 'department.name', width: 150, render: (r: any) => r.department?.name || '-' },
  { title: '授权人', key: 'grantedBy.name', width: 120, render: (r: any) => r.grantedBy?.name || '-' },
  {
    title: '有效期', key: 'expiresAt', width: 180,
    render: (r: any) => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('zh-CN') : '永久'
  },
  { title: '授权时间', key: 'createdAt', width: 180, render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row: any) => h(resolveComponent('NPopconfirm'), { onPositiveClick: () => revokeAccess(row.id) }, {
      trigger: () => h(resolveComponent('NButton'), { size: 'tiny', type: 'warning', quaternary: true }, () => '放弃')
    })
  }
]

const outgoingCols = [
  { title: '目标部门', key: 'department.name', width: 150, render: (r: any) => r.department?.name || '-' },
  {
    title: '状态', key: 'status', width: 100,
    render: (r: any) => h(resolveComponent('NTag'), { type: statusMap[r.status]?.type || 'default', size: 'small' }, () => statusMap[r.status]?.label || r.status)
  },
  { title: '申请理由', key: 'reason', ellipsis: { tooltip: true } },
  {
    title: '审批人', key: 'approver.name', width: 120,
    render: (r: any) => r.approver?.name || '-'
  },
  {
    title: '申请时间', key: 'createdAt', width: 180,
    render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN')
  }
]

const incomingCols = [
  { title: '申请人', key: 'requester.name', width: 120, render: (r: any) => r.requester?.name || '-' },
  { title: '目标部门', key: 'department.name', width: 150, render: (r: any) => r.department?.name || '-' },
  { title: '申请理由', key: 'reason', ellipsis: { tooltip: true } },
  {
    title: '申请时间', key: 'createdAt', width: 180,
    render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN')
  },
  {
    title: '操作', key: 'actions', width: 160,
    render: (row: any) => row.status === 'pending' ? h('div', { class: 'flex gap-1' }, [
      h(resolveComponent('NButton'), {
        size: 'tiny', type: 'success', onClick: () => handleApprove(row.id)
      }, () => '批准'),
      h(resolveComponent('NButton'), {
        size: 'tiny', type: 'error', onClick: () => handleReject(row.id)
      }, () => '拒绝')
    ]) : h('span', { class: 'text-slate-400 text-xs' }, statusMap[row.status]?.label || row.status)
  }
]

const managedAccessCols = [
  { title: '被授权人', key: 'user.name', width: 120, render: (r: any) => r.user?.name || '-' },
  { title: '部门', key: 'department.name', width: 150, render: (r: any) => r.department?.name || '-' },
  { title: '授权人', key: 'grantedBy.name', width: 120, render: (r: any) => r.grantedBy?.name || '-' },
  {
    title: '有效期', key: 'expiresAt', width: 150,
    render: (r: any) => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('zh-CN') : '永久'
  },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row: any) => h(resolveComponent('NPopconfirm'), { onPositiveClick: () => revokeManagedAccess(row.id) }, {
      trigger: () => h(resolveComponent('NButton'), { size: 'tiny', type: 'error', quaternary: true }, () => '撤销')
    })
  }
]

// Functions
async function loadMyAccess() {
  loadingMy.value = true
  try {
    const r = await $fetch('/api/departments/access?scope=mine', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) myAccess.value = r.data
  } catch { }
  loadingMy.value = false
}

async function loadOutgoing() {
  loadingOutgoing.value = true
  try {
    const r = await $fetch('/api/departments/access-requests?type=outgoing', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) outgoingRequests.value = r.data
  } catch { }
  loadingOutgoing.value = false
}

async function loadIncoming() {
  loadingIncoming.value = true
  try {
    const r = await $fetch('/api/departments/access-requests?type=incoming', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) incomingRequests.value = r.data
  } catch { }
  loadingIncoming.value = false
}

async function loadManaged() {
  loadingManaged.value = true
  try {
    const r = await $fetch('/api/departments/access?scope=managed', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) managedAccess.value = r.data
  } catch { }
  loadingManaged.value = false
}

async function loadDepartments() {
  try {
    const r = await $fetch('/api/departments', { headers: authStore.getAuthHeaders() }) as any
    if (r.success) allDepartments.value = r.data
  } catch { }
}

function openRequestModal() {
  requestForm.departmentId = null
  requestForm.reason = ''
  requestModal.value = true
}

async function submitRequest() {
  if (!requestForm.departmentId) return
  submitting.value = true
  try {
    const r = await $fetch('/api/departments/access-requests', {
      method: 'POST',
      headers: authStore.getAuthHeaders(),
      body: { departmentId: requestForm.departmentId, reason: requestForm.reason }
    }) as any
    if (r.success) {
      message.success('申请已提交')
      requestModal.value = false
      await loadOutgoing()
    }
  } catch (e: any) {
    message.error(e.data?.message || '提交失败')
  }
  submitting.value = false
}

async function handleApprove(id: number) {
  try {
    await $fetch(`/api/departments/access-requests/${id}`, {
      method: 'PUT',
      headers: authStore.getAuthHeaders(),
      body: { action: 'approve' }
    }) as any
    message.success('已批准')
    await loadIncoming()
    await loadManaged()
  } catch (e: any) {
    message.error(e.data?.message || '操作失败')
  }
}

async function handleReject(id: number) {
  dialog.warning({
    title: '拒绝申请',
    content: '确定要拒绝此查看申请吗？',
    positiveText: '确定拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/departments/access-requests/${id}`, {
          method: 'PUT',
          headers: authStore.getAuthHeaders(),
          body: { action: 'reject' }
        }) as any
        message.success('已拒绝')
        await loadIncoming()
      } catch (e: any) {
        message.error(e.data?.message || '操作失败')
      }
    }
  })
}

async function revokeAccess(id: number) {
  try {
    await $fetch(`/api/departments/access/${id}`, {
      method: 'DELETE',
      headers: authStore.getAuthHeaders()
    }) as any
    message.success('已放弃查看权限')
    await loadMyAccess()
    await authStore.checkAuth()
  } catch (e: any) {
    message.error(e.data?.message || '操作失败')
  }
}

async function revokeManagedAccess(id: number) {
  try {
    await $fetch(`/api/departments/access/${id}`, {
      method: 'DELETE',
      headers: authStore.getAuthHeaders()
    }) as any
    message.success('已撤销授权')
    await loadManaged()
  } catch (e: any) {
    message.error(e.data?.message || '操作失败')
  }
}

onMounted(async () => {
  await Promise.all([loadMyAccess(), loadOutgoing(), loadDepartments()])
  if (authStore.canWrite) {
    await Promise.all([loadIncoming(), loadManaged()])
  }
})
</script>

<style scoped>
.access-management-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

/* Stats summary */
.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
}
@media (min-width: 640px) {
  .stats-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .stats-summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.summary-card {
  background: #ffffff;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
}

.summary-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.summary-icon-blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}
.summary-icon-amber {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
}
.summary-icon-green {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}
.summary-icon-rose {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.summary-info {
  flex: 1;
}
.summary-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 0.25rem;
}
.summary-label {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0;
}

/* Tabs */
.enterprise-tabs :deep(.n-tabs .n-tab-pane) {
  padding: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-title {
    font-size: 1.25rem;
  }
}
</style>

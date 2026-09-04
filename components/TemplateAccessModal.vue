<template>
  <n-modal v-model:show="show" preset="card" title="模板访问权限" class="tpl-access-modal" :style="{ width: '920px', maxWidth: '95vw' }">
    <template #header-extra>
      <n-button size="small" quaternary @click="refreshAll">
        <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></template>
        刷新
      </n-button>
    </template>

    <n-alert type="info" :bordered="false" style="margin-bottom: 12px;">
      这里展示系统中的全部表单模板及其所属部门。非公开部门的模板需要向该部门管理员申请查看权限，批准后即可在数据列表中查看该模板下的公开数据。
    </n-alert>

    <n-tabs type="segment" v-model:value="activeTab">
      <!-- Tab 1: 模板目录（申请） -->
      <n-tab-pane name="catalog" tab="模板目录">
        <n-input v-model:value="catalogSearch" placeholder="搜索模板名称..." clearable size="small" style="margin-bottom: 10px; max-width: 260px;" />
        <n-data-table :columns="catalogCols" :data="filteredCatalog" :loading="loadingCatalog" :bordered="false" size="small" :max-height="380" />
      </n-tab-pane>

      <!-- Tab 2: 我的权限与申请 -->
      <n-tab-pane name="mine" tab="我的权限">
        <div class="section-title">已获得的模板查看权限</div>
        <n-data-table :columns="myAccessCols" :data="myAccess" :loading="loadingMine" :bordered="false" size="small" :max-height="220" />
        <div v-if="!myAccess.length && !loadingMine" class="empty-hint">暂无模板级查看权限</div>

        <div class="section-title" style="margin-top: 16px;">我发起的申请</div>
        <n-data-table :columns="myRequestCols" :data="myRequests" :loading="loadingRequests" :bordered="false" size="small" :max-height="220" />
        <div v-if="!myRequests.length && !loadingRequests" class="empty-hint">暂无申请记录</div>
      </n-tab-pane>

      <!-- Tab 3: 审批管理（仅管理员） -->
      <n-tab-pane v-if="authStore.canWrite" name="manage" tab="审批管理">
        <div class="section-title">待我审批的申请</div>
        <n-data-table :columns="pendingCols" :data="pendingRequests" :loading="loadingRequests" :bordered="false" size="small" :max-height="220" />
        <div v-if="!pendingRequests.length && !loadingRequests" class="empty-hint">暂无待审批申请</div>

        <div class="section-title" style="margin-top: 16px;">本部门模板已授出的权限（可撤销）</div>
        <n-data-table :columns="managedCols" :data="managedAccess" :loading="loadingManaged" :bordered="false" size="small" :max-height="220" />
        <div v-if="!managedAccess.length && !loadingManaged" class="empty-hint">本部门模板尚未授出查看权限</div>
      </n-tab-pane>
    </n-tabs>

    <!-- 申请理由弹窗 -->
    <n-modal v-model:show="reasonModal" preset="card" title="申请查看模板数据" style="width: 460px">
      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px; font-weight: 600;">{{ reasonTarget?.templateName }}</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          所属部门：{{ reasonTarget?.deptName || '全局' }}
        </p>
      </div>
      <n-input v-model:value="reasonText" type="textarea" placeholder="申请理由（可选）" :autosize="{ minRows: 3, maxRows: 5 }" />
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <n-button @click="reasonModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="submitRequest">提交申请</n-button>
        </div>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NTag, NTooltip } from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()

const show = computed({
  get: () => props.show,
  set: (val: boolean) => emit('update:show', val)
})

const activeTab = ref<'catalog' | 'mine' | 'manage'>('catalog')

// 模板目录
const allTemplates = ref<any[]>([])
const loadingCatalog = ref(false)
const catalogSearch = ref('')

// 我的权限 / 申请
const myAccess = ref<any[]>([])
const myRequests = ref<any[]>([])
const pendingRequests = ref<any[]>([])
const managedAccess = ref<any[]>([])
const loadingMine = ref(false)
const loadingRequests = ref(false)
const loadingManaged = ref(false)

// 申请弹窗
const reasonModal = ref(false)
const reasonText = ref('')
const reasonTarget = ref<{ templateId: number; templateName: string; deptName: string } | null>(null)
const submitting = ref(false)

const filteredCatalog = computed(() => {
  const q = catalogSearch.value.trim().toLowerCase()
  if (!q) return allTemplates.value
  return allTemplates.value.filter((t: any) => String(t.name).toLowerCase().includes(q))
})

// ─── 目录列定义 ───
const catalogCols: DataTableColumn<any>[] = [
  { title: '模板名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '所属部门',
    key: 'dept',
    width: 140,
    render: (row) => row.department?.name || h(NTag, { size: 'small', type: 'default', bordered: false }, () => '全局')
  },
  {
    title: '访问状态',
    key: 'accessState',
    width: 120,
    render: (row) => {
      const state = getAccessState(row)
      if (state === 'owned_dept') return h(NTag, { size: 'small', type: 'info', bordered: false }, () => '本部门模板')
      if (state === 'global') return h(NTag, { size: 'small', type: 'default', bordered: false }, () => '全局开放')
      if (state === 'granted') return h(NTag, { size: 'small', type: 'success', bordered: false }, () => '已授权')
      if (state === 'pending') return h(NTag, { size: 'small', type: 'warning', bordered: false }, () => '审批中')
      if (state === 'rejected') return h(NTag, { size: 'small', type: 'error', bordered: false }, () => '已拒绝，可重新申请')
      return h(NTag, { size: 'small', type: 'warning', bordered: false }, () => '未授权')
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => {
      const state = getAccessState(row)
      if (state === 'owned_dept' || state === 'global' || state === 'granted' || state === 'pending') {
        return h('span', { style: 'font-size:12px;color:#94a3b8' }, state === 'pending' ? '等待审批' : '无需申请')
      }
      return h(NButton, {
        size: 'small',
        type: 'primary',
        ghost: true,
        onClick: () => openReasonModal(row)
      }, () => '申请查看')
    }
  }
]

function getAccessState(row: any): string {
  if (!row.department) return 'global'
  if (authStore.departmentIds.includes(row.department.id)) return 'owned_dept'
  const acc = myAccess.value.find((a: any) => a.templateId === row.id)
  if (acc) return 'granted'
  const req = myRequests.value.find((r: any) => r.templateId === row.id && r.status === 'pending')
  if (req) return 'pending'
  const rej = myRequests.value.find((r: any) => r.templateId === row.id && r.status === 'rejected')
  if (rej) return 'rejected'
  return 'none'
}

// ─── 我的权限列定义 ───
const myAccessCols: DataTableColumn<any>[] = [
  { title: '模板名称', key: 'templateName', ellipsis: { tooltip: true }, render: (row) => row.template?.name || '-' },
  { title: '所属部门', key: 'dept', width: 140, render: (row) => row.template?.department?.name || '全局' },
  { title: '授予人', key: 'granter', width: 110, render: (row) => row.grantedBy?.name || '-' },
  { title: '有效期', key: 'expiresAt', width: 120, render: (row) => row.expiresAt ? dayjs(row.expiresAt).format('YYYY-MM-DD') : '永久' },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) => h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => revokeAccess(row) }, () => '放弃')
  }
]

const myRequestCols: DataTableColumn<any>[] = [
  { title: '模板名称', key: 'templateName', ellipsis: { tooltip: true }, render: (row) => row.template?.name || '-' },
  { title: '所属部门', key: 'dept', width: 130, render: (row) => row.template?.department?.name || '全局' },
  { title: '申请时间', key: 'createdAt', width: 110, render: (row) => dayjs(row.createdAt).format('YYYY-MM-DD') },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => {
      if (row.status === 'pending') return h(NTag, { size: 'small', type: 'warning', bordered: false }, () => '审批中')
      if (row.status === 'approved') return h(NTag, { size: 'small', type: 'success', bordered: false }, () => '已批准')
      return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h(NTag, { size: 'small', type: 'error', bordered: false }, () => '已拒绝'),
        default: () => row.rejectedReason || '管理员拒绝了您的申请'
      })
    }
  }
]

// ─── 审批列定义 ───
const pendingCols: DataTableColumn<any>[] = [
  { title: '申请人', key: 'requester', width: 100, render: (row) => row.requester?.name || row.requester?.username || '-' },
  { title: '模板名称', key: 'templateName', ellipsis: { tooltip: true }, render: (row) => row.template?.name || '-' },
  { title: '申请理由', key: 'reason', ellipsis: { tooltip: true }, render: (row) => row.reason || '-' },
  { title: '申请时间', key: 'createdAt', width: 110, render: (row) => dayjs(row.createdAt).format('YYYY-MM-DD') },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) => h('div', { style: 'display:flex;gap:6px' }, [
      h(NButton, { size: 'small', type: 'primary', onClick: () => approveRequest(row) }, () => '批准'),
      h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => rejectRequest(row) }, () => '拒绝')
    ])
  }
]

const managedCols: DataTableColumn<any>[] = [
  { title: '被授权人', key: 'userName', width: 100, render: (row) => row.user?.name || row.user?.username || '-' },
  { title: '模板名称', key: 'templateName', ellipsis: { tooltip: true }, render: (row) => row.template?.name || '-' },
  { title: '授予人', key: 'granter', width: 100, render: (row) => row.grantedBy?.name || '-' },
  { title: '有效期', key: 'expiresAt', width: 110, render: (row) => row.expiresAt ? dayjs(row.expiresAt).format('YYYY-MM-DD') : '永久' },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) => h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => revokeAccess(row) }, () => '撤销')
  }
]

function openReasonModal(row: any) {
  reasonTarget.value = {
    templateId: row.id,
    templateName: row.name,
    deptName: row.department?.name || '全局'
  }
  reasonText.value = ''
  reasonModal.value = true
}

async function submitRequest() {
  if (!reasonTarget.value) return
  submitting.value = true
  try {
    const resp = await $fetch('/api/templates/access/requests', {
      method: 'POST',
      headers: authStore.getAuthHeaders(),
      body: { templateId: reasonTarget.value.templateId, reason: reasonText.value || undefined }
    }) as any
    message.success(resp.message || '申请已提交')
    reasonModal.value = false
    await refreshAll()
  } catch (e: any) {
    message.error(e?.data?.message || '申请失败')
  } finally {
    submitting.value = false
  }
}

async function approveRequest(row: any) {
  try {
    await $fetch(`/api/templates/access/requests/${row.id}`, {
      method: 'PUT',
      headers: authStore.getAuthHeaders(),
      body: { action: 'approve' }
    })
    message.success('已批准该用户的模板查看权限')
    await refreshAll()
  } catch (e: any) {
    message.error(e?.data?.message || '操作失败')
  }
}

function rejectRequest(row: any) {
  dialog.warning({
    title: '拒绝申请',
    content: `确定拒绝 ${row.requester?.name || '该用户'} 对模板「${row.template?.name}」的查看申请吗？`,
    positiveText: '拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/templates/access/requests/${row.id}`, {
          method: 'PUT',
          headers: authStore.getAuthHeaders(),
          body: { action: 'reject' }
        })
        message.success('已拒绝该申请')
        await refreshAll()
      } catch (e: any) {
        message.error(e?.data?.message || '操作失败')
      }
    }
  })
}

function revokeAccess(row: any) {
  dialog.warning({
    title: '撤销授权',
    content: `确定撤销 ${row.user?.name || '该用户'} 对模板「${row.template?.name}」的查看权限吗？撤销后其将无法查看该模板下的数据。`,
    positiveText: '撤销',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await $fetch(`/api/templates/access/${row.id}`, {
          method: 'DELETE',
          headers: authStore.getAuthHeaders()
        })
        message.success('授权已撤销')
        await refreshAll()
      } catch (e: any) {
        message.error(e?.data?.message || '操作失败')
      }
    }
  })
}

async function refreshAll() {
  const headers = authStore.getAuthHeaders()
  loadingCatalog.value = true
  loadingMine.value = true
  loadingRequests.value = true

  // 模板目录（all=1 返回所有模板含所属部门）
  $fetch('/api/templates', { params: { all: 1 }, headers }).then((r: any) => {
    if (r.success) allTemplates.value = r.data
  }).catch(() => {}).finally(() => { loadingCatalog.value = false })

  // 我的模板授权
  $fetch('/api/templates/access', { params: { scope: 'mine' }, headers }).then((r: any) => {
    if (r.success) myAccess.value = r.data
  }).catch(() => {}).finally(() => { loadingMine.value = false })

  // 申请列表（outgoing + incoming 一次取回）
  $fetch('/api/templates/access/requests', { params: { type: 'all' }, headers }).then((r: any) => {
    if (r.success) {
      const all = r.data || []
      myRequests.value = all.filter((x: any) => x.requesterId === authStore.user?.id)
      pendingRequests.value = all.filter((x: any) => x.status === 'pending' && x.requesterId !== authStore.user?.id)
    }
  }).catch(() => {}).finally(() => { loadingRequests.value = false })

  // 管理的授权
  if (authStore.canWrite) {
    loadingManaged.value = true
    $fetch('/api/templates/access', { params: { scope: 'managed' }, headers }).then((r: any) => {
      if (r.success) managedAccess.value = r.data
    }).catch(() => {}).finally(() => { loadingManaged.value = false })
  }
}

watch(() => props.show, (val) => {
  if (val) {
    activeTab.value = 'catalog'
    refreshAll()
  }
})
</script>

<style scoped>
.section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
}

.empty-hint {
  padding: 1.25rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8125rem;
}
</style>

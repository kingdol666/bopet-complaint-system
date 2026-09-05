<template>
  <div class="analysis-page-wrapper">
    <!-- Modern page header with gradient background -->
    <div class="analysis-header">
      <div class="header-content">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="header-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 class="analysis-page-title">自定义分析</h1>
              <p class="analysis-page-subtitle">
                <template v-if="currentDashboard">
                  看板：<span class="font-semibold text-primary-600">{{ currentDashboard.name }}</span>
                  <span class="text-gray-300 mx-2">·</span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-600 text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                    {{ panels.length }} 个面板
                  </span>
                </template>
                <template v-else>
                  选择模板和字段，自动生成可视化分析图表
                </template>
              </p>
            </div>
          </div>
          
          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <!-- Grid toggle -->
            <n-button-group v-if="panels.length > 1" class="grid-toggle">
              <n-button :type="gridColumns === 1 ? 'primary' : 'default'" @click="setColumns(1)">
                <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></template>
              </n-button>
              <n-button :type="gridColumns === 2 ? 'primary' : 'default'" @click="setColumns(2)">
                <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 9a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zm10-9a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 9a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z"/></svg></template>
              </n-button>
            </n-button-group>
            
            <!-- Dashboard actions -->
            <template v-if="currentDashboard">
              <n-button class="action-btn" @click="clearDashboard">
                <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
                退出看板
              </n-button>
              <n-button type="primary" class="action-btn-primary" @click="openDashboardSaveModal">
                <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></template>
                更新看板
              </n-button>
            </template>
            
            <!-- Save dashboard -->
            <n-button v-else-if="panels.length > 1" type="primary" class="action-btn-primary" @click="openDashboardSaveModal">
              <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg></template>
              保存为看板
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content area -->
    <div class="analysis-content">
      <!-- Left sidebar -->
      <div class="analysis-sidebar">
        <!-- New panel button -->
        <n-button type="primary" block class="new-panel-btn" @click="addPanel()">
          <template #icon>
            <div class="btn-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
          </template>
          <span class="btn-text">新建分析面板</span>
        </n-button>

        <!-- My dashboards -->
        <div v-if="dashboards.length" class="sidebar-card">
          <div class="sidebar-card-header">
            <div class="header-left">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
              <h3>看板</h3>
            </div>
            <n-tag :bordered="false" type="info" size="small" class="count-badge">{{ dashboards.length }}</n-tag>
          </div>
          <div class="sidebar-list">
            <div v-for="db in dashboards" :key="db.id"
              class="sidebar-list-item"
              :class="{ 'active': currentDashboard?.id === db.id }"
              @click="loadDashboard(db)">
              <div class="item-content">
                <div class="item-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <div class="item-text">
                  <p class="item-title">
                    {{ db.name }}
                    <n-tag v-if="db.visibility === 'department'" size="tiny" type="success" :bordered="false" class="vis-tag">部门共享</n-tag>
                    <n-tag v-else size="tiny" type="default" :bordered="false" class="vis-tag">私有</n-tag>
                  </p>
                  <p class="item-meta">{{ db._count?.analyses || 0 }} 面板 · {{ db.user?.name || '我' }} · {{ dayjs(db.updatedAt).format('MM-DD HH:mm') }}</p>
                </div>
              </div>
              <div v-if="isOwnerOf(db)" class="item-actions">
                <n-button size="tiny" quaternary circle @click.stop="renameDashboard(db)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></template>
                </n-button>
                <n-button size="tiny" quaternary circle type="error" @click.stop="deleteDashboard(db.id)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Saved panels -->
        <div v-if="independentAnalyses.length" class="sidebar-card">
          <div class="sidebar-card-header">
            <div class="header-left">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
              <h3>已保存面板</h3>
            </div>
            <n-tag :bordered="false" type="default" size="small" class="count-badge">{{ independentAnalyses.length }}</n-tag>
          </div>
          <div class="sidebar-list">
            <div v-for="sa in independentAnalyses" :key="sa.id"
              class="sidebar-list-item"
              @click="loadSaved(sa)">
              <div class="item-content">
                <div class="item-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="item-text">
                  <p class="item-title">
                    {{ sa.name }}
                    <n-tag v-if="sa.visibility === 'department'" size="tiny" type="success" :bordered="false" class="vis-tag">部门共享</n-tag>
                    <n-tag v-else size="tiny" type="default" :bordered="false" class="vis-tag">私有</n-tag>
                  </p>
                  <p class="item-meta">{{ sa.user?.name || '我' }} · {{ dayjs(sa.updatedAt).format('MM-DD HH:mm') }}</p>
                </div>
              </div>
              <div v-if="isOwnerOf(sa)" class="item-actions">
                <n-button size="tiny" quaternary circle @click.stop="renameSaved(sa)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></template>
                </n-button>
                <n-button size="tiny" quaternary circle type="error" @click.stop="deleteSaved(sa.id)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Nothing saved -->
        <div v-if="!dashboards.length && !independentAnalyses.length" class="sidebar-empty">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
          </div>
          <p class="empty-title">暂无保存的分析</p>
          <p class="empty-desc">创建分析后可保存为看板</p>
        </div>
      </div>

      <!-- Main panels area -->
      <div class="analysis-main">
        <div v-if="panels.length" class="panels-container">
          <ClientOnly>
            <VueDraggableNext
              v-model="panels"
              :animation="200"
              handle=".drag-handle"
              ghost-class="ghost-panel"
              @end="onDragEnd"
              :class="gridColumns === 1 ? 'panels-grid-1' : 'panels-grid-2'"
            >
              <div v-for="p in panels" :key="p.key" :class="gridSpanClass(p.gridW)">
                <div class="panel-wrapper">
                  <!-- Drag handle -->
                  <div class="drag-handle">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
                  </div>
                  <AnalysisPanel
                    :panel-id="p.key"
                    :title="p.title"
                    :saved-analysis-id="p.savedAnalysisId"
                    :initial-config="p.config"
                    :grid-w="p.gridW"
                    @delete="(panelId: number) => handleRemovePanel(panelId)"
                    @save="(cfg: any) => handleSaveConfig(p, cfg)"
                  />
                </div>
              </div>
            </VueDraggableNext>
          </ClientOnly>
        </div>

        <!-- Empty canvas -->
        <div v-else class="empty-canvas">
          <div class="empty-canvas-content">
            <div class="empty-canvas-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="empty-canvas-title">开始自定义分析</h3>
            <p class="empty-canvas-desc">
              点击左侧「新建分析面板」创建分析，或加载已保存的看板。面板支持拖拽排序、自由排列，可保存为看板组合一键复用。
            </p>
            <n-button type="primary" size="large" class="mt-4" @click="addPanel()">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </template>
              创建第一个分析面板
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save analysis modal -->
    <n-modal v-model:show="saveModal" preset="card" title="保存分析配置" style="width:500px" class="modern-modal">
      <n-form-item label="分析名称" required>
        <n-input v-model:value="saveName" placeholder="例如：客诉分类月度分析" />
      </n-form-item>
      <n-form-item label="可见范围">
        <n-radio-group v-model:value="saveVisibility">
          <n-radio-button value="private">仅自己（私有）</n-radio-button>
          <n-radio-button value="department">同部门可见</n-radio-button>
        </n-radio-group>
      </n-form-item>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="saveModal = false">取消</n-button>
          <n-button v-if="saveTarget?.savedAnalysisId && isOwnerOf(saveTarget)" type="info" :loading="saving" @click="doUpdate">更新已有配置</n-button>
          <n-button type="primary" :loading="saving" @click="doSave">保存为新配置</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Save dashboard modal -->
    <n-modal v-model:show="dashboardSaveModal" preset="card" :title="currentDashboard ? '更新看板' : '保存为看板'" style="width:500px" class="modern-modal">
      <n-form-item label="看板名称" required>
        <n-input v-model:value="dashboardName" placeholder="例如：月度质量分析看板" />
      </n-form-item>
      <n-form-item label="描述（可选）">
        <n-input v-model:value="dashboardDesc" type="textarea" placeholder="看板用途说明" :autosize="{ minRows: 2, maxRows: 4 }" />
      </n-form-item>
      <n-form-item label="可见范围">
        <n-radio-group v-model:value="dashboardVisibility">
          <n-radio-button value="private">仅自己（私有）</n-radio-button>
          <n-radio-button value="department">同部门可见</n-radio-button>
        </n-radio-group>
      </n-form-item>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="dashboardSaveModal = false">取消</n-button>
          <n-button type="primary" :loading="dashboardSaving" @click="doSaveDashboard">{{ currentDashboard ? '更新看板' : '保存看板' }}</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { h } from 'vue'
import { VueDraggableNext } from 'vue-draggable-next'
import { NInput } from 'naive-ui'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ title: '自定义分析' })

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const panels = ref<any[]>([])
const dashboards = ref<any[]>([])
const allSavedAnalyses = ref<any[]>([])
let nextKey = 1

const currentDashboard = ref<any>(null)
const preferredColumns = ref(2)

const independentAnalyses = computed(() => allSavedAnalyses.value.filter((sa: any) => !sa.dashboardId))

const saveModal = ref(false)
const saveName = ref('')
const saveTarget = ref<any>(null)
const saving = ref(false)
const saveVisibility = ref<'private' | 'department'>('private')

const dashboardSaveModal = ref(false)
const dashboardName = ref('')
const dashboardDesc = ref('')
const dashboardSaving = ref(false)
const dashboardVisibility = ref<'private' | 'department'>('private')
const renameTarget = ref('')

const gridColumns = computed(() => {
  if (panels.value.length <= 1) return 1
  return preferredColumns.value
})

function setColumns(n: number) { preferredColumns.value = n }

function gridSpanClass(w: number) {
  const span = Math.min(Math.max(w || 1, 1), 3)
  return `panel-span-${Math.min(span, gridColumns.value)}`
}

function addPanel(config?: any, savedAnalysisId?: number | null, title?: string, gridW = 1, gridH = 1) {
  panels.value.push({
    key: nextKey++,
    title: title || `分析面板 ${panels.value.length + 1}`,
    savedAnalysisId: savedAnalysisId || null,
    gridW, gridH,
    config: config || null
  })
  nextTick(() => {
    const el = document.querySelector('.analysis-main')
    if (el) el.scrollTop = el.scrollHeight
  })
}

function handleRemovePanel(panelId: number) {
  const panel = panels.value.find((p: any) => p.key === panelId)
  if (panel?.savedAnalysisId) {
    dialog.warning({
      title: '确认移除',
      content: '该面板关联了已保存的分析配置，移除后不会删除保存的配置。确定要移除吗？',
      positiveText: '移除',
      negativeText: '取消',
      onPositiveClick: () => { panels.value = panels.value.filter((p: any) => p.key !== panelId) }
    })
  } else {
    panels.value = panels.value.filter((p: any) => p.key !== panelId)
  }
}

function onDragEnd() {}
function onPanelChange() {}

function isOwnerOf(item: any): boolean {
  if (!item) return false
  // 无 user 信息（面板对象）或未保存过的面板视为本人
  if (!item.user) return true
  return item.userId === authStore.user?.id
}

function handleSaveConfig(panel: any, config: any) {
  panel.config = config
  saveTarget.value = panel
  saveName.value = panel.title || ''
  saveModal.value = true
}

async function doSave() {
  if (!saveName.value.trim()) { message.error('请输入分析名称'); return }
  saving.value = true
  try {
    const body: any = { name: saveName.value.trim(), config: saveTarget.value?.config || {}, visibility: saveVisibility.value }
    if (currentDashboard.value) body.dashboardId = currentDashboard.value.id
    const resp = await $fetch('/api/analyses', { method: 'POST', body }) as any
    if (resp.success) {
      message.success('保存成功')
      saveModal.value = false
      if (saveTarget.value) { saveTarget.value.savedAnalysisId = resp.data.id; saveTarget.value.title = saveName.value.trim() }
      await refreshData()
    }
  } catch (e: any) { message.error(e.data?.message || '保存失败') } finally { saving.value = false }
}

async function doUpdate() {
  if (!saveName.value.trim()) { message.error('请输入分析名称'); return }
  const id = saveTarget.value?.savedAnalysisId; if (!id) return
  saving.value = true
  try {
    await $fetch(`/api/analyses/${id}`, { method: 'PUT', body: { name: saveName.value.trim(), config: saveTarget.value?.config || {}, visibility: saveVisibility.value } })
    message.success('更新成功')
    saveModal.value = false
    if (saveTarget.value) saveTarget.value.title = saveName.value.trim()
    await refreshData()
  } catch (e: any) { message.error(e.data?.message || '更新失败') } finally { saving.value = false }
}

function loadSaved(sa: any) {
  try {
    const config = typeof sa.config === 'string' ? JSON.parse(sa.config) : sa.config
    addPanel(config, sa.id, sa.name, sa.gridW || 1, sa.gridH || 1)
    message.success(`已加载「${sa.name}」`)
  } catch { message.error('配置数据损坏，无法加载') }
}

async function deleteSaved(id: number) {
  dialog.warning({
    title: '确认删除', content: '删除后无法恢复，确定要删除这个分析配置吗？',
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try { await $fetch(`/api/analyses/${id}`, { method: 'DELETE' }); message.success('删除成功'); await refreshData() }
      catch (e: any) { message.error(e.data?.message || '删除失败') }
    }
  })
}

function renameSaved(sa: any) {
  dialog.create({
    title: '重命名分析',
    content: () => h(NInput, { defaultValue: sa.name, onInput: (v: string) => { renameTarget.value = v } }),
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const name = renameTarget.value?.trim()
      if (!name) { message.error('名称不能为空'); return false }
      try { await $fetch(`/api/analyses/${sa.id}`, { method: 'PUT', body: { name } }); await refreshData() }
      catch (e: any) { message.error(e.data?.message || '重命名失败') }
    }
  })
}

async function loadDashboard(db: any) {
  try {
    const resp = await $fetch(`/api/dashboards/${db.id}`) as any
    if (!resp.success) return
    const dashboard = resp.data
    currentDashboard.value = dashboard
    panels.value = []
    if (dashboard.analyses?.length) {
      for (const sa of dashboard.analyses) {
        const config = typeof sa.config === 'string' ? JSON.parse(sa.config) : sa.config
        addPanel(config, sa.id, sa.name, sa.gridW || 1, sa.gridH || 1)
      }
    }
    message.success(`已加载看板「${dashboard.name}」`)
  } catch (e: any) { message.error('加载看板失败') }
}

function clearDashboard() { currentDashboard.value = null; panels.value = [] }

function openDashboardSaveModal() {
  dashboardName.value = currentDashboard.value?.name || ''
  dashboardDesc.value = currentDashboard.value?.description || ''
  dashboardSaveModal.value = true
}

async function doSaveDashboard() {
  if (!dashboardName.value.trim()) { message.error('请输入看板名称'); return }
  dashboardSaving.value = true
  try {
    const panelIds: number[] = []
    for (let i = 0; i < panels.value.length; i++) {
      const p = panels.value[i]
      if (p.savedAnalysisId) {
        await $fetch(`/api/analyses/${p.savedAnalysisId}`, { method: 'PUT', body: { name: p.title, config: p.config || {}, sortOrder: i, gridW: p.gridW, gridH: p.gridH } })
        panelIds.push(p.savedAnalysisId)
      } else if (p.config) {
        const resp = await $fetch('/api/analyses', { method: 'POST', body: { name: p.title, config: p.config, sortOrder: i, gridW: p.gridW, gridH: p.gridH, visibility: dashboardVisibility.value } }) as any
        if (resp.success) { p.savedAnalysisId = resp.data.id; panelIds.push(resp.data.id) }
      }
    }
    if (currentDashboard.value) {
      await $fetch(`/api/dashboards/${currentDashboard.value.id}`, { method: 'PUT', body: { name: dashboardName.value.trim(), description: dashboardDesc.value || null, panelIds, visibility: dashboardVisibility.value } })
      message.success('看板已更新')
      currentDashboard.value.name = dashboardName.value.trim()
    } else {
      const resp = await $fetch('/api/dashboards', { method: 'POST', body: { name: dashboardName.value.trim(), description: dashboardDesc.value || null, panelIds, visibility: dashboardVisibility.value } }) as any
      if (resp.success) { currentDashboard.value = resp.data; message.success('看板保存成功') }
    }
    dashboardSaveModal.value = false
    await refreshData()
  } catch (e: any) { message.error(e.data?.message || '保存看板失败') } finally { dashboardSaving.value = false }
}

function renameDashboard(db: any) {
  dialog.create({
    title: '重命名看板',
    content: () => h(NInput, { defaultValue: db.name, onInput: (v: string) => { renameTarget.value = v } }),
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const name = renameTarget.value?.trim()
      if (!name) { message.error('名称不能为空'); return false }
      try { await $fetch(`/api/dashboards/${db.id}`, { method: 'PUT', body: { name } }); await refreshData() }
      catch (e: any) { message.error(e.data?.message || '重命名失败') }
    }
  })
}

async function deleteDashboard(id: number) {
  dialog.warning({
    title: '确认删除看板', content: '删除后无法恢复，确定要删除这个看板吗？',
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try { await $fetch(`/api/dashboards/${id}`, { method: 'DELETE' }); message.success('删除成功'); if (currentDashboard.value?.id === id) clearDashboard(); await refreshData() }
      catch (e: any) { message.error(e.data?.message || '删除失败') }
    }
  })
}

async function refreshData() {
  try {
    const [dashResp, analysesResp] = await Promise.all([
      $fetch('/api/dashboards'),
      $fetch('/api/analyses')
    ])
    if ((dashResp as any).success) dashboards.value = (dashResp as any).data
    if ((analysesResp as any).success) allSavedAnalyses.value = (analysesResp as any).data
  } catch (e: any) { console.error('刷新数据失败:', e) }
}

onMounted(async () => { await refreshData() })
</script>

<style scoped>
/* Page wrapper */
.analysis-page-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2rem);
  gap: 1.5rem;
}

/* Header */
.analysis-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.header-content {
  max-width: 100%;
}

.header-icon-wrapper {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2), 0 2px 4px -1px rgba(14, 165, 233, 0.1);
}

.analysis-page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  margin: 0;
  line-height: 1.2;
}

.analysis-page-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
  line-height: 1.5;
}

/* Action buttons */
.grid-toggle {
  border-radius: 0.5rem;
  overflow: hidden;
}

.action-btn {
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-btn-primary {
  border-radius: 0.5rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
  transition: all 0.2s;
}

.action-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);
}

/* Content area */
.analysis-content {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

/* Sidebar */
.analysis-sidebar {
  width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.new-panel-btn {
  border-radius: 0.75rem;
  height: auto;
  padding: 0.75rem 1rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
  transition: all 0.2s;
}

.new-panel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(14, 165, 233, 0.3);
}

.btn-icon-circle {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  margin-left: 0.5rem;
}

/* Sidebar cards */
.sidebar-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.sidebar-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left svg {
  color: #64748b;
}

.header-left h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.count-badge {
  font-size: 0.625rem;
}

/* Sidebar list */
.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.sidebar-list-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.sidebar-list-item.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  flex: 1;
}

.item-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.sidebar-list-item.active .item-icon {
  background: #dbeafe;
  color: #2563eb;
}

.item-text {
  min-width: 0;
  flex: 1;
}

.item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vis-tag {
  margin-left: 4px;
  flex-shrink: 0;
  font-size: 10px;
  padding: 0 4px;
  vertical-align: 1px;
}

.item-meta {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.125rem 0 0 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.sidebar-list-item:hover .item-actions {
  opacity: 1;
}

/* Empty state */
.sidebar-empty {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
  color: #cbd5e1;
}

.empty-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  margin: 0 0 0.25rem 0;
}

.empty-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

/* Main area */
.analysis-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.panels-container {
  height: 100%;
}

.panels-grid-1 {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panels-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.panel-span-1 {
  grid-column: span 1;
}

.panel-span-2 {
  grid-column: span 2;
}

.panel-wrapper {
  position: relative;
  height: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.panel-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.drag-handle {
  position: absolute;
  left: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 0.375rem;
  background: #f1f5f9;
  color: #94a3b8;
  z-index: 10;
}

.panel-wrapper:hover .drag-handle {
  opacity: 0.6;
}

.drag-handle:hover {
  opacity: 1 !important;
  background: #e2e8f0;
}

.ghost-panel {
  opacity: 0.5;
  background: #f1f5f9;
}

/* Empty canvas */
.empty-canvas {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-canvas-content {
  text-align: center;
  max-width: 28rem;
}

.empty-canvas-icon {
  width: 5rem;
  height: 5rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: #3b82f6;
}

.empty-canvas-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.empty-canvas-desc {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Modal */
.modern-modal {
  border-radius: 1rem;
  overflow: hidden;
}

/* Scrollbar */
.analysis-sidebar::-webkit-scrollbar,
.analysis-main::-webkit-scrollbar {
  width: 4px;
}

.analysis-sidebar::-webkit-scrollbar-track,
.analysis-main::-webkit-scrollbar-track {
  background: transparent;
}

.analysis-sidebar::-webkit-scrollbar-thumb,
.analysis-main::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}

.analysis-sidebar::-webkit-scrollbar-thumb:hover,
.analysis-main::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Responsive */
@media (max-width: 1024px) {
  .analysis-content {
    flex-direction: column;
  }
  
  .analysis-sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .sidebar-card {
    flex: 1;
    min-width: 200px;
  }
}
</style>

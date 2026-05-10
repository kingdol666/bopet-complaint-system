<template>
  <div class="animate-fade-in h-full flex flex-col custom-analysis-page">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="page-title mb-1">自定义分析</h1>
        <p class="page-subtitle">
          <template v-if="currentDashboard">看板：<span class="font-semibold text-primary-600">{{ currentDashboard.name
          }}</span>（{{ panels.length }} 个面板）</template>
          <template v-else>拖拽排列面板，保存为看板组合，一键加载完整分析</template>
        </p>
      </div>
      <div v-if="currentDashboard" class="flex gap-2">
        <n-button size="small" @click="clearDashboard">退出看板</n-button>
        <n-button size="small" type="primary" @click="openDashboardSaveModal">更新看板</n-button>
      </div>
    </div>

    <div class="flex gap-4 flex-1 min-h-0">
      <!-- Left sidebar -->
      <div class="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
        <!-- Action buttons -->
        <div class="flex flex-col gap-2">
          <n-button type="primary" block @click="addPanel()">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg></template>
            新建分析面板
          </n-button>
          <n-button v-if="panels.length" block secondary @click="openDashboardSaveModal">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg></template>
            保存为看板
          </n-button>
        </div>

        <!-- Dashboards section -->
        <div v-if="dashboards.length" class="card p-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">我的看板</h3>
            <n-tag size="tiny" :bordered="false">{{ dashboards.length }}</n-tag>
          </div>
          <div class="space-y-1">
            <div v-for="db in dashboards" :key="db.id"
              class="group flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
              :class="{ 'bg-blue-50 border-blue-200': currentDashboard?.id === db.id }" @click="loadDashboard(db)">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-700 truncate">{{ db.name }}</p>
                <p class="text-xs text-gray-400">{{ db._count?.analyses || 0 }} 面板 · {{
                  dayjs(db.updatedAt).format('MM-DD-YYYY HH:mm') }}</p>
              </div>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <n-button size="tiny" quaternary @click.stop="renameDashboard(db)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg></template>
                </n-button>
                <n-button size="tiny" quaternary type="error" @click.stop="deleteDashboard(db.id)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Independent panels section -->
        <div v-if="independentAnalyses.length" class="card p-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">独立面板</h3>
          <div class="space-y-1">
            <div v-for="sa in independentAnalyses" :key="sa.id"
              class="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              @click="loadSaved(sa)">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-700 truncate">{{ sa.name }}</p>
                <p class="text-xs text-gray-400">{{ dayjs(sa.updatedAt).format('MM-DD HH:mm') }}</p>
              </div>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <n-button size="tiny" quaternary @click.stop="renameSaved(sa)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg></template>
                </n-button>
                <n-button size="tiny" quaternary type="error" @click.stop="deleteSaved(sa.id)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!dashboards.length && !independentAnalyses.length"
          class="card p-6 text-center flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <p class="text-xs text-gray-400">还没有保存的分析</p>
          <p class="text-xs text-gray-400 mt-1">运行分析后点击「保存配置」</p>
        </div>
      </div>

      <!-- Main panels area -->
      <div class="flex-1 min-w-0 overflow-y-auto">
        <div v-if="panels.length">
          <ClientOnly>
            <VueDraggableNext v-model="panels" :animation="200" handle=".drag-handle" ghost-class="ghost-panel"
              @end="onDragEnd" :class="gridColumns === 1 ? 'panels-grid-1' : 'panels-grid-2'">
              <div v-for="p in panels" :key="p.key" :class="gridSpanClass(p.gridW)">
                <div class="relative h-full">
                  <!-- Drag handle overlay -->
                  <div
                    class="drag-handle absolute -left-1 top-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center cursor-grab opacity-0 hover:opacity-100 group-hover:opacity-60 transition-opacity z-10 rounded hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <AnalysisPanel :panel-id="p.key" :title="p.title" :saved-analysis-id="p.savedAnalysisId"
                    :initial-config="p.config" :grid-w="p.gridW"
                    @delete="(panelId: number) => handleRemovePanel(panelId)"
                    @save="(cfg: any) => handleSaveConfig(p, cfg)"
                    @resize="(w: number) => { p.gridW = w; onPanelChange() }" />
                </div>
              </div>
            </VueDraggableNext>
          </ClientOnly>
        </div>

        <!-- Empty state -->
        <div v-else class="card py-20 text-center flex flex-col items-center justify-center">
          <div class="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary-400" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">开始自定义分析</h3>
          <p class="text-sm text-gray-400 max-w-md">
            点击左侧「新建分析面板」按钮，选择模板和字段，系统将自动生成可视化图表和统计表格。拖拽面板左侧手柄可调整排列顺序，支持保存为看板组合一键加载。
          </p>
        </div>
      </div>
    </div>

    <!-- Save analysis modal -->
    <n-modal v-model:show="saveModal" preset="card" title="保存分析配置" style="width:500px">
      <n-form-item label="分析名称" required>
        <n-input v-model:value="saveName" placeholder="例如：数据分类月度分析" />
      </n-form-item>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="saveModal = false">取消</n-button>
          <n-button v-if="saveTarget?.savedAnalysisId" type="info" :loading="saving" @click="doUpdate">
            更新已有配置
          </n-button>
          <n-button type="primary" :loading="saving" @click="doSave">
            保存为新配置
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- Dashboard save modal -->
    <n-modal v-model:show="dashboardSaveModal" preset="card" :title="currentDashboard ? '更新看板' : '保存为看板'"
      style="width:500px">
      <n-form-item label="看板名称" required>
        <n-input v-model:value="dashboardName" placeholder="例如：月度质量分析看板" />
      </n-form-item>
      <n-form-item label="描述（可选）">
        <n-input v-model:value="dashboardDesc" type="textarea" placeholder="看板用途说明"
          :autosize="{ minRows: 2, maxRows: 4 }" />
      </n-form-item>
      <div class="mb-4 p-3 bg-gray-50 rounded-lg">
        <p class="text-xs text-gray-500 mb-1">将保存以下 {{ panels.length }} 个面板到看板：</p>
        <div class="space-y-1">
          <div v-for="p in panels" :key="p.key" class="text-xs text-gray-600 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-primary-400" />
            {{ p.title || '未命名面板' }}
            <span class="text-gray-400">(宽度: {{ p.gridW }}x)</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="dashboardSaveModal = false">取消</n-button>
          <n-button type="primary" :loading="dashboardSaving" @click="doSaveDashboard">
            {{ currentDashboard ? '更新看板' : '保存看板' }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- Rename modal -->
    <n-modal v-model:show="renameModal" preset="card" title="重命名" style="width:400px">
      <n-form-item label="新名称" required>
        <n-input v-model:value="renameName" placeholder="输入新名称" />
      </n-form-item>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="renameModal = false">取消</n-button>
          <n-button type="primary" :loading="renaming" @click="doRename">确认</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { VueDraggableNext } from 'vue-draggable-next'

const message = useMessage()
const dialog = useDialog()

interface PanelConfig {
  templateId: number | null
  groupByField: string | string[] | null  // single for backward compat, array for multi-field
  fieldLabel: string
  chartType: 'bar' | 'pie' | 'hbar' | 'donut'
  dateRange: { start: string; end: string } | null
  limit: number
}

interface PanelState {
  key: number
  title: string
  savedAnalysisId: number | null
  gridW: number
  gridH: number
  config: PanelConfig | null
}

const panels = ref<PanelState[]>([])
const dashboards = ref<any[]>([])
const allSavedAnalyses = ref<any[]>([])
let nextKey = 1

// Current loaded dashboard
const currentDashboard = ref<any>(null)

// Computed: independent panels (no dashboard)
const independentAnalyses = computed(() =>
  allSavedAnalyses.value.filter((sa: any) => !sa.dashboardId)
)

// Save modal state
const saveModal = ref(false)
const saveName = ref('')
const saveTarget = ref<PanelState | null>(null)
const saving = ref(false)

// Dashboard save modal
const dashboardSaveModal = ref(false)
const dashboardName = ref('')
const dashboardDesc = ref('')
const dashboardSaving = ref(false)

// Rename modal (shared for both analysis and dashboard)
const renameModal = ref(false)
const renameName = ref('')
const renameTarget = ref<'analysis' | 'dashboard'>('analysis')
const renameId = ref<number | null>(null)
const renaming = ref(false)

const gridColumns = computed(() => panels.value.length === 1 ? 1 : 2)

function gridSpanClass(w: number) {
  const span = Math.min(Math.max(w || 1, 1), 3)
  // Clamp span to grid column count
  const maxSpan = gridColumns.value
  return `panel-span-${Math.min(span, maxSpan)}`
}

// ─── Panel management ──────────────────────────────

function addPanel(config?: any, savedAnalysisId?: number | null, title?: string, gridW = 1, gridH = 1) {
  panels.value.push({
    key: nextKey++,
    title: title || `分析面板 ${panels.value.length + 1}`,
    savedAnalysisId: savedAnalysisId || null,
    gridW,
    gridH,
    config: config || null
  })
}

function removePanel(key: number) {
  panels.value = panels.value.filter(p => p.key !== key)
  onPanelChange()
}

function handleRemovePanel(panelId: number) {
  const panel = panels.value.find(p => p.key === panelId)
  if (panel?.savedAnalysisId) {
    dialog.warning({
      title: '确认移除',
      content: '该面板关联了已保存的分析配置，移除后不会删除保存的配置。确定要移除吗？',
      positiveText: '移除',
      negativeText: '取消',
      onPositiveClick: () => removePanel(panelId)
    })
  } else {
    removePanel(panelId)
  }
}

function onDragEnd() {
  onPanelChange()
}

function onPanelChange() {
  // If we're viewing a dashboard, mark as modified
  if (currentDashboard.value) {
    // Sync panel order to dashboard later on save
  }
}

// ─── Save/Load single panel ──────────────────────

function handleSaveConfig(panel: PanelState, config: any) {
  panel.config = config
  saveTarget.value = panel
  saveName.value = panel.title || ''
  saveModal.value = true
}

async function doSave() {
  if (!saveName.value.trim()) {
    message.error('请输入分析名称')
    return
  }
  saving.value = true
  try {
    const body: any = {
      name: saveName.value.trim(),
      config: saveTarget.value?.config || {}
    }
    // If inside a dashboard, link to it
    if (currentDashboard.value) {
      body.dashboardId = currentDashboard.value.id
    }
    const resp = await $fetch('/api/analyses', { method: 'POST', body }) as any
    if (resp.success) {
      message.success('保存成功')
      saveModal.value = false
      if (saveTarget.value) {
        saveTarget.value.savedAnalysisId = resp.data.id
        saveTarget.value.title = saveName.value.trim()
        saveTarget.value.config = JSON.parse(resp.data.config)
      }
      await refreshData()
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doUpdate() {
  if (!saveName.value.trim()) {
    message.error('请输入分析名称')
    return
  }
  const id = saveTarget.value?.savedAnalysisId
  if (!id) return
  saving.value = true
  try {
    const resp = await $fetch(`/api/analyses/${id}`, {
      method: 'PUT',
      body: {
        name: saveName.value.trim(),
        config: saveTarget.value?.config || {},
        gridW: saveTarget.value?.gridW,
        gridH: saveTarget.value?.gridH
      }
    }) as any
    if (resp.success) {
      message.success('更新成功')
      saveModal.value = false
      if (saveTarget.value) {
        saveTarget.value.title = saveName.value.trim()
        saveTarget.value.config = JSON.parse(resp.data.config)
      }
      await refreshData()
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '更新失败')
  } finally {
    saving.value = false
  }
}

function loadSaved(sa: any) {
  try {
    const config = typeof sa.config === 'string' ? JSON.parse(sa.config) : sa.config
    addPanel(config, sa.id, sa.name, sa.gridW || 1, sa.gridH || 1)
    message.success(`已加载「${sa.name}」`)
    scrollToBottom()
  } catch {
    message.error('配置数据损坏，无法加载')
  }
}

async function deleteSaved(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除这个分析配置吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const resp = await $fetch(`/api/analyses/${id}`, { method: 'DELETE' }) as any
        if (resp.success) {
          message.success('删除成功')
          await refreshData()
        }
      } catch (e: any) {
        message.error(e.data?.statusMessage || '删除失败')
      }
    }
  })
}

function renameSaved(sa: any) {
  renameTarget.value = 'analysis'
  renameId.value = sa.id
  renameName.value = sa.name
  renameModal.value = true
}

// ─── Dashboard CRUD ─────────────────────────────

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
      await nextTick()
      scrollToBottom()
    }
    message.success(`已加载看板「${dashboard.name}」（${dashboard.analyses?.length || 0} 个面板）`)
  } catch (e: any) {
    message.error('加载看板失败')
  }
}

function clearDashboard() {
  currentDashboard.value = null
  panels.value = []
}

function openDashboardSaveModal() {
  dashboardName.value = currentDashboard.value?.name || ''
  dashboardDesc.value = currentDashboard.value?.description || ''
  dashboardSaveModal.value = true
}

async function doSaveDashboard() {
  if (!dashboardName.value.trim()) {
    message.error('请输入看板名称')
    return
  }
  dashboardSaving.value = true
  try {
    // First, save/update all current panels in order
    const panelIds: number[] = []
    for (let i = 0; i < panels.value.length; i++) {
      const p = panels.value[i]
      if (p.savedAnalysisId) {
        // Update existing saved analysis
        await $fetch(`/api/analyses/${p.savedAnalysisId}`, {
          method: 'PUT',
          body: {
            name: p.title,
            config: p.config || {},
            sortOrder: i,
            gridW: p.gridW,
            gridH: p.gridH
          }
        })
        panelIds.push(p.savedAnalysisId)
      } else if (p.config) {
        // Create new saved analysis
        const resp = await $fetch('/api/analyses', {
          method: 'POST',
          body: {
            name: p.title,
            config: p.config,
            sortOrder: i,
            gridW: p.gridW,
            gridH: p.gridH
          }
        }) as any
        if (resp.success) {
          p.savedAnalysisId = resp.data.id
          panelIds.push(resp.data.id)
        }
      }
    }

    const layout = {
      columns: 2,
      panels: panels.value.map((p, i) => ({
        key: p.key,
        savedAnalysisId: p.savedAnalysisId,
        gridW: p.gridW,
        gridH: p.gridH,
        order: i
      }))
    }

    if (currentDashboard.value) {
      // Update existing dashboard
      await $fetch(`/api/dashboards/${currentDashboard.value.id}`, {
        method: 'PUT',
        body: {
          name: dashboardName.value.trim(),
          description: dashboardDesc.value || null,
          layout,
          panelIds
        }
      })
      message.success('看板已更新')
      currentDashboard.value.name = dashboardName.value.trim()
      currentDashboard.value.description = dashboardDesc.value || null
    } else {
      // Create new dashboard
      const resp = await $fetch('/api/dashboards', {
        method: 'POST',
        body: {
          name: dashboardName.value.trim(),
          description: dashboardDesc.value || null,
          layout,
          panelIds
        }
      }) as any
      if (resp.success) {
        message.success('看板保存成功')
        currentDashboard.value = resp.data
      }
    }

    dashboardSaveModal.value = false
    await refreshData()
  } catch (e: any) {
    message.error(e.data?.statusMessage || '保存看板失败')
  } finally {
    dashboardSaving.value = false
  }
}

function renameDashboard(db: any) {
  renameTarget.value = 'dashboard'
  renameId.value = db.id
  renameName.value = db.name
  renameModal.value = true
}

async function deleteDashboard(id: number) {
  dialog.warning({
    title: '确认删除看板',
    content: '删除看板后，看板中的面板配置仍会保留（变为独立面板）。确定要删除吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const resp = await $fetch(`/api/dashboards/${id}`, { method: 'DELETE' }) as any
        if (resp.success) {
          message.success('看板已删除')
          if (currentDashboard.value?.id === id) {
            currentDashboard.value = null
          }
          await refreshData()
        }
      } catch (e: any) {
        message.error(e.data?.statusMessage || '删除失败')
      }
    }
  })
}

async function doRename() {
  if (!renameName.value.trim() || !renameId.value) return
  renaming.value = true
  try {
    if (renameTarget.value === 'analysis') {
      await $fetch(`/api/analyses/${renameId.value}`, {
        method: 'PUT',
        body: { name: renameName.value.trim() }
      })
    } else {
      await $fetch(`/api/dashboards/${renameId.value}`, {
        method: 'PUT',
        body: { name: renameName.value.trim() }
      })
    }
    message.success('重命名成功')
    renameModal.value = false
    await refreshData()
  } catch (e: any) {
    message.error(e.data?.statusMessage || '重命名失败')
  } finally {
    renaming.value = false
  }
}

// ─── Data loading ──────────────────────────────

async function refreshData() {
  await Promise.all([loadDashboardList(), loadSavedList()])
}

async function loadDashboardList() {
  try {
    const resp = await $fetch('/api/dashboards') as any
    if (resp.success) dashboards.value = resp.data
  } catch (e) { console.error(e) }
}

async function loadSavedList() {
  try {
    const resp = await $fetch('/api/analyses') as any
    if (resp.success) allSavedAnalyses.value = resp.data
  } catch (e) { console.error(e) }
}

function scrollToBottom() {
  nextTick(() => {
    const el = document.querySelector('.flex-1.min-w-0.overflow-y-auto')
    if (el) el.scrollTop = el.scrollHeight
  })
}

onMounted(async () => {
  await refreshData()
  addPanel()
})
</script>

<style scoped>
.ghost-panel {
  opacity: 0.4;
  border: 2px dashed #3b82f6;
  border-radius: 0.75rem;
  background: #eff6ff;
}

:deep(.drag-handle) {
  cursor: grab;
}

:deep(.drag-handle:active) {
  cursor: grabbing;
}
</style>

<style>
/* Unscoped: needed for VueDraggableNext root element which doesn't get the scoped attribute */
.custom-analysis-page .panels-grid-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: start;
}

.custom-analysis-page .panels-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  align-items: start;
}

.custom-analysis-page .panel-span-1 {
  grid-column: span 1;
  min-width: 0;
}

.custom-analysis-page .panel-span-2 {
  grid-column: span 2;
  min-width: 0;
}

.custom-analysis-page .panel-span-3 {
  grid-column: span 2;
  min-width: 0;
}

@media (max-width: 1280px) {

  .custom-analysis-page .panel-span-1,
  .custom-analysis-page .panel-span-2,
  .custom-analysis-page .panel-span-3 {
    grid-column: span 2;
  }
}
</style>

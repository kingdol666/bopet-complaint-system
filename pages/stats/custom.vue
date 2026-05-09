<template>
  <div class="animate-fade-in h-full flex flex-col">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="page-title mb-1">自定义分析</h1>
        <p class="page-subtitle">选择模板字段，自由组合多面板可视化分析，支持保存和加载配置</p>
      </div>
    </div>

    <div class="flex gap-4 flex-1 min-h-0">
      <!-- Left sidebar -->
      <div class="w-64 shrink-0 flex flex-col gap-3">
        <n-button type="primary" block @click="addPanel()">
          <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></template>
          新建分析面板
        </n-button>

        <!-- Saved analyses list -->
        <div v-if="savedAnalyses.length" class="card p-3 flex-1 overflow-y-auto">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">已保存的分析</h3>
          <div class="space-y-1">
            <div
              v-for="sa in savedAnalyses"
              :key="sa.id"
              class="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              @click="loadSaved(sa)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-700 truncate">{{ sa.name }}</p>
                <p class="text-xs text-gray-400">{{ dayjs(sa.updatedAt).format('MM-DD HH:mm') }}</p>
              </div>
              <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <n-button size="tiny" quaternary @click.stop="renameSaved(sa)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></template>
                </n-button>
                <n-button size="tiny" quaternary type="error" @click.stop="deleteSaved(sa.id)">
                  <template #icon><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card p-6 text-center flex-1 flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          <p class="text-xs text-gray-400">还没有保存的分析</p>
          <p class="text-xs text-gray-400 mt-1">运行分析后点击「保存配置」</p>
        </div>
      </div>

      <!-- Main panels grid -->
      <div class="flex-1 min-w-0 overflow-y-auto">
        <div v-if="panels.length" class="grid gap-4" :class="gridClass">
          <AnalysisPanel
            v-for="p in panels"
            :key="p.key"
            :panel-id="p.key"
            :title="p.title"
            :saved-analysis-id="p.savedAnalysisId"
            :initial-config="p.config"
            @delete="removePanel"
            @save="openSaveModal(p)"
          />
        </div>

        <!-- Empty state -->
        <div v-else class="card py-20 text-center flex flex-col items-center justify-center">
          <div class="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">开始自定义分析</h3>
          <p class="text-sm text-gray-400 max-w-md">点击左侧「新建分析面板」按钮，选择模板和字段，系统将自动生成可视化图表和统计表格。多个面板可并行展示不同维度的分析。</p>
        </div>
      </div>
    </div>

    <!-- Save modal -->
    <n-modal v-model:show="saveModal" preset="card" title="保存分析配置" style="width:500px">
      <n-form-item label="分析名称" required>
        <n-input v-model:value="saveName" placeholder="例如：客诉分类月度分析" />
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

    <!-- Rename modal -->
    <n-modal v-model:show="renameModal" preset="card" title="重命名分析" style="width:400px">
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

const message = useMessage()

interface PanelState {
  key: number
  title: string
  savedAnalysisId: number | null
  config: {
    templateId: number | null
    groupByField: string | null
    fieldLabel: string
    chartType: 'bar' | 'pie' | 'hbar' | 'donut'
    dateRange: { start: string; end: string } | null
    limit: number
  } | null
}

const panels = ref<PanelState[]>([])
const savedAnalyses = ref<any[]>([])
let nextKey = 1

// Save modal state
const saveModal = ref(false)
const saveName = ref('')
const saveTarget = ref<PanelState | null>(null)
const saving = ref(false)

// Rename modal state
const renameModal = ref(false)
const renameName = ref('')
const renameId = ref<number | null>(null)
const renaming = ref(false)

const gridClass = computed(() => {
  const n = panels.value.length
  if (n === 1) return 'grid-cols-1'
  return 'grid-cols-1 xl:grid-cols-2'
})

function addPanel(config?: any, savedAnalysisId?: number | null, title?: string) {
  panels.value.push({
    key: nextKey++,
    title: title || `分析面板 ${panels.value.length + 1}`,
    savedAnalysisId: savedAnalysisId || null,
    config: config || null
  })
}

function removePanel(key: number) {
  panels.value = panels.value.filter(p => p.key !== key)
}

function openSaveModal(panel: PanelState) {
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
    const resp = await $fetch('/api/analyses', {
      method: 'POST',
      body: { name: saveName.value.trim(), config: saveTarget.value?.config || {} }
    }) as any
    if (resp.success) {
      message.success('保存成功')
      saveModal.value = false
      // Link panel to saved analysis
      if (saveTarget.value) {
        saveTarget.value.savedAnalysisId = resp.data.id
        saveTarget.value.title = saveName.value.trim()
      }
      await loadSavedList()
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
      body: { name: saveName.value.trim(), config: saveTarget.value?.config || {} }
    }) as any
    if (resp.success) {
      message.success('更新成功')
      saveModal.value = false
      if (saveTarget.value) saveTarget.value.title = saveName.value.trim()
      await loadSavedList()
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '更新失败')
  } finally {
    saving.value = false
  }
}

function loadSaved(sa: any) {
  try {
    const config = JSON.parse(sa.config)
    addPanel(config, sa.id, sa.name)
    // Scroll to bottom to show new panel
    nextTick(() => {
      const grid = document.querySelector('.grid')
      if (grid) grid.scrollTop = grid.scrollHeight
    })
  } catch {
    message.error('配置数据损坏，无法加载')
  }
}

async function deleteSaved(id: number) {
  try {
    const resp = await $fetch(`/api/analyses/${id}`, { method: 'DELETE' }) as any
    if (resp.success) {
      message.success('删除成功')
      await loadSavedList()
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '删除失败')
  }
}

function renameSaved(sa: any) {
  renameId.value = sa.id
  renameName.value = sa.name
  renameModal.value = true
}

async function doRename() {
  if (!renameName.value.trim() || !renameId.value) return
  renaming.value = true
  try {
    const resp = await $fetch(`/api/analyses/${renameId.value}`, {
      method: 'PUT',
      body: { name: renameName.value.trim() }
    }) as any
    if (resp.success) {
      message.success('重命名成功')
      renameModal.value = false
      await loadSavedList()
    }
  } catch (e: any) {
    message.error(e.data?.statusMessage || '重命名失败')
  } finally {
    renaming.value = false
  }
}

async function loadSavedList() {
  try {
    const resp = await $fetch('/api/analyses') as any
    if (resp.success) savedAnalyses.value = resp.data
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await loadSavedList()
  // Auto-create first panel for convenience
  addPanel()
})
</script>

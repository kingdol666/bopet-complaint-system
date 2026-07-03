<template>
  <div class="min-h-screen">
    <div v-if="isMobile && mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm lg:hidden" @click="closeMobileSidebar" />

    <div class="flex min-h-screen" :class="isMobile ? 'flex-col' : ''">
      <!-- Glass sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 transition-all duration-300 lg:static"
        :class="[
          isMobile ? (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          isMobile ? 'w-64' : (sidebarCollapsed ? 'w-[72px]' : 'w-[248px]')
        ]">
        <div class="flex h-full flex-col glass-panel rounded-none border-r border-black/[0.05]">
          <!-- Logo -->
          <div class="flex items-center gap-3 px-4 py-4 border-b border-black/[0.04]">
            <div class="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'" class="overflow-hidden transition-all duration-300">
              <p class="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-semibold">Platform</p>
              <p class="text-sm font-bold text-slate-800">BOPET EDA</p>
            </div>
          </div>

          <!-- Nav -->
          <nav class="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
            <NuxtLink v-for="item in menuItems" :key="item.path" :to="item.path"
              :title="sidebarCollapsed && !isMobile ? item.label : undefined"
              class="group flex items-center gap-2.5 px-2.5 py-2 rounded-[11px] text-[13px] font-medium transition-all duration-200"
              :class="[
                isMenuItemActive(item)
                  ? 'bg-sky-50/80 text-sky-700'
                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800',
                sidebarCollapsed && !isMobile ? 'justify-center px-0' : ''
              ]">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-all duration-200"
                :class="isMenuItemActive(item)
                  ? 'bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow shadow-sky-500/20'
                  : 'bg-black/[0.03] text-slate-400 group-hover:bg-black/[0.06] group-hover:text-slate-600'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path v-for="(path, index) in getIconPaths(item.icon)" :key="index" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" :d="path" />
                </svg>
              </span>
              <span :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'" class="overflow-hidden whitespace-nowrap transition-all duration-300">{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- User -->
          <div class="p-2.5 border-t border-black/[0.04]">
            <div class="flex items-center gap-2.5 p-2 rounded-[11px] bg-gradient-to-r from-slate-50/80 to-sky-50/40 border border-black/[0.03]" :class="sidebarCollapsed && !isMobile ? 'justify-center' : ''">
              <div class="relative">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xs font-semibold shadow shadow-sky-500/20">{{ userInitial }}</div>
                <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white" :class="roleDotColor"></span>
              </div>
              <div :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'" class="overflow-hidden transition-all duration-300">
                <p class="text-xs font-semibold text-slate-700 truncate">{{ authStore.user?.name || '用户' }}</p>
                <div class="flex items-center gap-1">
                  <span class="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-semibold leading-none" :class="roleBadgeClass">{{ roleLabel }}</span>
                </div>
              </div>
              <button v-if="!sidebarCollapsed || isMobile" class="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50/60 transition-colors" title="退出" @click="handleLogout">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 15l3-3m0 0l-3-3m3 3H8.25" /></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Glass header -->
        <header class="sticky top-0 z-30 glass-panel rounded-none border-b border-black/[0.04] px-5 sm:px-7 lg:px-9">
          <div class="flex items-center justify-between h-[56px]">
            <div class="flex items-center gap-3">
              <button class="flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-700 hover:bg-black/[0.04] transition-colors lg:hidden" @click="toggleSidebar">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button v-if="!isMobile" class="hidden lg:flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-700 hover:bg-black/[0.04] transition-colors" @click="toggleSidebar">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div>
                <p class="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold">{{ currentPageTitle }}</p>
                <p class="text-[11px] text-slate-400">{{ currentDate }}</p>
              </div>
            </div>
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xs font-semibold shadow shadow-sky-500/20">{{ userInitial }}</div>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6 lg:p-8">
          <div class="page-shell animate-fade-in"><slot /></div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

type MenuIcon = 'dashboard' | 'list' | 'add' | 'users' | 'template' | 'chart' | 'key'
interface MenuItem { path: string; label: string; icon: MenuIcon }

const authStore = useAuthStore()
const route = useRoute()
const isMobile = ref(false)
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

const iconPaths: Record<MenuIcon, string[]> = {
  dashboard: ['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
  key: ['M15 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
  chart: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'],
  list: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 002 2h2a2 2 0 002-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h6', 'M9 16h6'],
  add: ['M12 4v16', 'M20 12H4'],
  users: ['M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'],
  template: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    { path: '/', label: '数据概览', icon: 'dashboard' },
    { path: '/datas', label: '数据管理', icon: 'list' },
    ...(authStore.canWrite ? [{ path: '/datas/new', label: '新增记录', icon: 'add' as MenuIcon }] : []),
    { path: '/stats/custom', label: '自定义分析', icon: 'chart' },
    { path: '/departments', label: '部门管理', icon: 'users' },
    { path: '/departments/access', label: '跨部门权限', icon: 'key' },
  ]
  if (authStore.isSuperAdmin) items.push({ path: '/users', label: '用户管理', icon: 'users' })
  if (authStore.canWrite) items.push({ path: '/templates', label: '表单模板', icon: 'template' })
  return items
})

const activeMenuPath = computed(() => {
  if (route.path === '/') return '/'
  const matches = menuItems.value.filter(i => i.path !== '/' && (route.path === i.path || route.path.startsWith(`${i.path}/`))).sort((a, b) => b.path.length - a.path.length)
  return matches[0]?.path || ''
})
const currentPageTitle = computed(() => route.path === '/' ? '数据概览' : menuItems.value.find(i => i.path === activeMenuPath.value)?.label || 'BOPET EDA')
const roleLabel = computed(() => ({ superadmin: '超级管理员', admin: '部门管理员', normal: '普通用户' } as Record<string, string>)[authStore.user?.role || ''] || '未知')
const roleBadgeClass = computed(() => {
  const map: Record<string, string> = {
    superadmin: 'bg-rose-50 text-rose-600 border border-rose-200/50',
    admin: 'bg-amber-50 text-amber-600 border border-amber-200/50',
    normal: 'bg-sky-50 text-sky-600 border border-sky-200/50',
  }
  return map[authStore.user?.role || ''] || 'bg-slate-50 text-slate-500'
})
const roleDotColor = computed(() => {
  const map: Record<string, string> = {
    superadmin: 'bg-rose-500',
    admin: 'bg-amber-500',
    normal: 'bg-sky-500',
  }
  return map[authStore.user?.role || ''] || 'bg-slate-400'
})
const userInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'U')
const currentDate = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()))

const updateViewport = () => { isMobile.value = window.innerWidth < 1024; if (!isMobile.value) mobileSidebarOpen.value = false }
const toggleSidebar = () => { if (isMobile.value) { mobileSidebarOpen.value = !mobileSidebarOpen.value; return }; sidebarCollapsed.value = !sidebarCollapsed.value }
const closeMobileSidebar = () => { mobileSidebarOpen.value = false }
const isMenuItemActive = (item: MenuItem) => item.path === '/' ? route.path === '/' : activeMenuPath.value === item.path
const getIconPaths = (icon: MenuIcon) => iconPaths[icon]
const handleLogout = async () => { await authStore.logout(); await navigateTo('/login') }

onMounted(async () => {
  await authStore.checkAuth()
  if (!authStore.isLoggedIn) { await navigateTo('/login'); return }
  const v = localStorage.getItem('layout-sidebar-collapsed')
  if (v !== null) sidebarCollapsed.value = v === 'true'
  updateViewport(); window.addEventListener('resize', updateViewport)
})
onBeforeUnmount(() => { if (import.meta.client) window.removeEventListener('resize', updateViewport) })
watch(sidebarCollapsed, v => { if (import.meta.client) localStorage.setItem('layout-sidebar-collapsed', String(v)) })
watch(() => route.fullPath, () => { if (isMobile.value) mobileSidebarOpen.value = false })
</script>

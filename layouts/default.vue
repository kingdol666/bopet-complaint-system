<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-16 top-0 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
      <div class="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
      <div class="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
    </div>

    <div
      v-if="isMobile && mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-slate-950/36 backdrop-blur-sm lg:hidden"
      @click="closeMobileSidebar"
    />

    <div
      class="relative min-h-screen transition-[grid-template-columns] duration-300 ease-out lg:grid"
      :style="layoutStyle"
    >
      <aside
        class="fixed inset-y-0 left-0 z-50 w-[18rem] px-3 py-3 transition-transform duration-300 ease-out lg:static lg:w-auto lg:px-4 lg:py-4"
        :class="[
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        ]"
      >
        <div class="glass-panel flex h-full flex-col rounded-[28px] px-3 pb-4 pt-3">
          <div
            class="flex items-center gap-3"
            :class="isDesktopCollapsed ? 'justify-center' : 'justify-between'"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-sky-400 to-cyan-300 text-base font-bold text-white shadow-lg shadow-primary-500/25">
                BP
              </div>
              <div
                class="min-w-0 overflow-hidden transition-all duration-200"
                :class="isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'"
              >
                <p class="text-[11px] uppercase tracking-[0.32em] text-industrial-500">
                  Complaint Hub
                </p>
                <p class="truncate text-base font-semibold text-industrial-900">
                  BOPET 客诉系统
                </p>
              </div>
            </div>

            <button
              v-if="!isMobile"
              class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/60 text-industrial-500 transition-all hover:-translate-y-0.5 hover:bg-white/85 hover:text-industrial-900"
              :aria-label="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
              @click="toggleSidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  :d="sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'"
                />
              </svg>
            </button>
          </div>

          <div
            class="mt-6 overflow-hidden rounded-[26px] text-white transition-all duration-200"
            :class="isDesktopCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-48 opacity-100 glass-panel-strong p-5'"
          >
            <p class="text-xs uppercase tracking-[0.3em] text-slate-300">
              一个客诉系统app
            </p>
          </div>

          <nav class="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              :title="item.label"
              class="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200"
              :class="isMenuItemActive(item)
                ? 'bg-white/78 text-industrial-900 shadow-[0_14px_30px_rgba(148,163,184,0.22)] ring-1 ring-white/70'
                : 'text-industrial-600 hover:bg-white/55 hover:text-industrial-900'"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200"
                :class="isMenuItemActive(item)
                  ? 'bg-gradient-to-br from-primary-500 via-sky-400 to-cyan-300 text-white shadow-lg shadow-primary-500/20'
                  : 'bg-white/50 text-industrial-500 group-hover:bg-white/75 group-hover:text-primary-600'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    v-for="(path, index) in getIconPaths(item.icon)"
                    :key="index"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    :d="path"
                  />
                </svg>
              </span>

              <span
                class="min-w-0 overflow-hidden text-sm font-medium transition-all duration-200"
                :class="isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100'"
              >
                <span class="block truncate">{{ item.label }}</span>
              </span>

              <span
                class="ml-auto overflow-hidden text-industrial-300 transition-all duration-200"
                :class="isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-4 opacity-100'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </NuxtLink>
          </nav>

          <div class="mt-4 rounded-[24px] border border-white/55 bg-white/58 p-3 shadow-[0_10px_30px_rgba(148,163,184,0.12)]">
            <div class="flex items-center gap-3" :class="isDesktopCollapsed ? 'justify-center' : ''">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-sky-50 text-sm font-semibold text-primary-700 shadow-inner shadow-white/90">
                {{ userInitial }}
              </div>

              <div
                class="min-w-0 flex-1 overflow-hidden transition-all duration-200"
                :class="isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'"
              >
                <p class="truncate text-sm font-semibold text-industrial-900">
                  {{ authStore.user?.name || '当前用户' }}
                </p>
                <p class="truncate text-xs text-industrial-500">
                  {{ roleLabel }}
                </p>
              </div>

              <button
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/60 text-industrial-500 transition-all hover:-translate-y-0.5 hover:bg-white/85 hover:text-rose-500"
                title="退出登录"
                @click="handleLogout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15l3-3m0 0l-3-3m3 3H8.25" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="relative min-w-0">
        <div class="flex min-h-screen flex-col px-4 pb-6 pt-4 sm:px-5 lg:px-6 lg:pb-8 lg:pt-5">
          <header class="glass-panel sticky top-4 z-30 mb-6 flex items-center justify-between rounded-[28px] px-4 py-3 sm:px-5">
            <div class="flex min-w-0 items-center gap-3">
              <button
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/68 text-industrial-600 transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:text-industrial-900"
                :aria-label="isMobile
                  ? (mobileSidebarOpen ? '关闭导航' : '打开导航')
                  : (sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏')"
                @click="toggleSidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <div class="min-w-0">
                <p class="text-[11px] uppercase tracking-[0.3em] text-industrial-400">
                  Operations Console
                </p>
                <h1 class="truncate text-lg font-semibold text-industrial-900">
                  {{ currentPageTitle }}
                </h1>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="hidden rounded-2xl border border-white/55 bg-white/60 px-4 py-2 text-right shadow-inner shadow-white/80 sm:block">
                <p class="text-[11px] uppercase tracking-[0.24em] text-industrial-400">
                  Today
                </p>
                <p class="mt-0.5 text-sm font-medium text-industrial-700">
                  {{ currentDate }}
                </p>
              </div>

              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-sky-50 text-sm font-semibold text-primary-700 shadow-inner shadow-white/90">
                {{ userInitial }}
              </div>
            </div>
          </header>

          <main class="page-shell flex-1">
            <slot />
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

type MenuIcon = 'dashboard' | 'list' | 'add' | 'mapping' | 'chart' | 'config'

interface MenuItem {
  path: string
  label: string
  icon: MenuIcon
}

const authStore = useAuthStore()
const route = useRoute()

const isMobile = ref(false)
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

const iconPaths: Record<MenuIcon, string[]> = {
  dashboard: [
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  ],
  list: [
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2',
    'M9 5a2 2 0 002 2h2a2 2 0 002-2',
    'M9 5a2 2 0 012-2h2a2 2 0 012 2',
    'M9 12h6',
    'M9 16h6',
    'M9 8h.01',
    'M9 12h.01',
    'M9 16h.01'
  ],
  add: [
    'M12 4v16',
    'M20 12H4'
  ],
  mapping: [
    'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101',
    'M10.344 13.656a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
  ],
  chart: [
    'M9 17v-6',
    'M12 17V9',
    'M15 17v-3',
    'M5 19h14',
    'M7 17V13a1 1 0 011-1h2v5',
    'M11 17V9a1 1 0 011-1h2v9',
    'M15 17v-3a1 1 0 011-1h2v4'
  ],
  config: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  ]
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    { path: '/', label: '仪表盘', icon: 'dashboard' },
    { path: '/complaints', label: '客诉列表', icon: 'list' },
    { path: '/complaints/new', label: '新增客诉', icon: 'add' },
    { path: '/mappings', label: '问题映射', icon: 'mapping' },
    { path: '/stats', label: '统计分析', icon: 'chart' }
  ]

  if (authStore.isAdmin) {
    items.push({ path: '/config', label: '系统配置', icon: 'config' })
  }

  return items
})

const activeMenuPath = computed(() => {
  if (route.path === '/') {
    return '/'
  }

  const matches = menuItems.value
    .filter((item) => item.path !== '/' && (route.path === item.path || route.path.startsWith(`${item.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)

  return matches[0]?.path || ''
})

const currentPageTitle = computed(() => {
  if (route.path === '/') {
    return '仪表盘'
  }

  return menuItems.value.find((item) => item.path === activeMenuPath.value)?.label || 'BOPET 客诉系统'
})

const roleLabel = computed(() => (authStore.isAdmin ? '系统管理员' : '业务操作员'))
const userInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'U')

const currentDate = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
)

const isDesktopCollapsed = computed(() => !isMobile.value && sidebarCollapsed.value)

const layoutStyle = computed(() => ({
  gridTemplateColumns: isMobile.value
    ? 'minmax(0, 1fr)'
    : `${sidebarCollapsed.value ? '6rem' : '18rem'} minmax(0, 1fr)`
}))

const updateViewport = () => {
  isMobile.value = window.innerWidth < 1024

  if (!isMobile.value) {
    mobileSidebarOpen.value = false
  }
}

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

const closeMobileSidebar = () => {
  mobileSidebarOpen.value = false
}

const isMenuItemActive = (item: MenuItem) => {
  if (item.path === '/') {
    return route.path === '/'
  }

  return activeMenuPath.value === item.path
}

const getIconPaths = (icon: MenuIcon) => iconPaths[icon]

const handleLogout = async () => {
  await authStore.logout()
  await navigateTo('/login')
}

onMounted(async () => {
  await authStore.checkAuth()

  if (!authStore.isLoggedIn) {
    await navigateTo('/login')
    return
  }

  const savedState = window.localStorage.getItem('layout-sidebar-collapsed')
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true'
  }

  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', updateViewport)
  }
})

watch(sidebarCollapsed, (value) => {
  if (import.meta.client) {
    window.localStorage.setItem('layout-sidebar-collapsed', String(value))
  }
})

watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) {
      mobileSidebarOpen.value = false
    }
  }
)
</script>

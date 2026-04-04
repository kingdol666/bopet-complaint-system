<template>
  <div class="min-h-screen bg-corporate-50">
    <!-- Mobile overlay -->
    <div
      v-if="isMobile && mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-corporate-900/50 backdrop-blur-sm lg:hidden"
      @click="closeMobileSidebar"
    />

    <div
      class="flex min-h-screen transition-all duration-300"
      :class="isMobile ? 'flex-col' : ''"
    >
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 bg-white border-r border-corporate-200 transition-all duration-300 lg:static"
        :class="[
          isMobile ? (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          isMobile ? 'w-64' : (sidebarCollapsed ? 'w-20' : 'w-64')
        ]"
      >
        <div class="flex h-full flex-col">
          <!-- Logo -->
          <div class="flex items-center gap-3 px-6 py-5 border-b border-corporate-100">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25">
              BP
            </div>
            <div
              class="overflow-hidden transition-all duration-300"
              :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              <p class="text-xs text-corporate-400 uppercase tracking-wider">Complaint Hub</p>
              <p class="text-sm font-semibold text-corporate-900">BOPET客诉系统</p>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              :title="sidebarCollapsed && !isMobile ? item.label : undefined"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              :class="[
                isMenuItemActive(item)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-corporate-600 hover:bg-corporate-100 hover:text-corporate-900',
                sidebarCollapsed && !isMobile ? 'justify-center' : ''
              ]"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
                :class="isMenuItemActive(item)
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'bg-corporate-100 text-corporate-500 group-hover:bg-white group-hover:text-primary-600'
                "
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
                class="overflow-hidden whitespace-nowrap transition-all duration-300"
                :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'"
              >
                {{ item.label }}
              </span>
            </NuxtLink>
          </nav>

          <!-- User section -->
          <div class="p-3 border-t border-corporate-100">
            <div
              class="flex items-center gap-3 p-3 rounded-xl bg-corporate-50"
              :class="sidebarCollapsed && !isMobile ? 'justify-center' : ''"
            >
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-primary-700 font-semibold border border-primary-200">
                {{ userInitial }}
              </div>
              <div
                class="overflow-hidden transition-all duration-300"
                :class="sidebarCollapsed && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'"
              >
                <p class="text-sm font-medium text-corporate-900 truncate">{{ authStore.user?.name || '当前用户' }}</p>
                <p class="text-xs text-corporate-500">{{ roleLabel }}</p>
              </div>
              <button
                v-if="!sidebarCollapsed || isMobile"
                class="ml-auto p-2 rounded-lg text-corporate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
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

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Header -->
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-corporate-200 px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center gap-4">
              <button
                class="flex h-10 w-10 items-center justify-center rounded-lg text-corporate-500 hover:text-corporate-900 hover:bg-corporate-100 transition-colors lg:hidden"
                @click="toggleSidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                v-if="!isMobile"
                class="hidden lg:flex h-10 w-10 items-center justify-center rounded-lg text-corporate-500 hover:text-corporate-900 hover:bg-corporate-100 transition-colors"
                @click="toggleSidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <p class="text-xs text-corporate-400 uppercase tracking-wider">Operations Console</p>
                <h1 class="text-lg font-semibold text-corporate-900">{{ currentPageTitle }}</h1>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-corporate-50 text-sm text-corporate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ currentDate }}</span>
              </div>

              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-primary-700 font-semibold border border-primary-200">
                {{ userInitial }}
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8">
          <div class="page-shell">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

type MenuIcon = 'dashboard' | 'list' | 'add' | 'mapping' | 'chart' | 'config' | 'users' | 'template'

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
  users: [
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
  ],
  config: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  ],
  template: [
    'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z'
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

  if (authStore.isSuperAdmin) {
    items.push({ path: '/users', label: '用户管理', icon: 'users' })
    items.push({ path: '/config', label: '系统配置', icon: 'config' })
  }

  if (authStore.canWrite) {
    items.push({ path: '/templates', label: '表单模板', icon: 'template' })
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

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    superadmin: '超级管理员',
    admin: '部门管理员',
    normal: '普通用户'
  }
  return map[authStore.user?.role || ''] || '未知'
})

const userInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'U')

const currentDate = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
)

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

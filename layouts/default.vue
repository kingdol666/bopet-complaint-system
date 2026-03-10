<template>
  <div class="min-h-screen bg-industrial-50">
    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 h-full w-64 bg-industrial-800 text-white z-50 transition-transform duration-300"
      :class="{ '-translate-x-full': !sidebarOpen }"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-industrial-700">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">BP</span>
          </div>
          <span class="font-semibold text-lg">BOPET客诉系统</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="p-4 space-y-1">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors"
          :class="[
            $route.path === item.path
              ? 'bg-primary-600 text-white'
              : 'text-industrial-300 hover:bg-industrial-700 hover:text-white'
          ]"
        >
          <!-- Dashboard Icon -->
          <svg v-if="item.icon === 'dashboard'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <!-- List Icon -->
          <svg v-else-if="item.icon === 'list'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <!-- Add Icon -->
          <svg v-else-if="item.icon === 'add'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <!-- Mapping Icon -->
          <svg v-else-if="item.icon === 'mapping'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <!-- Chart Icon -->
          <svg v-else-if="item.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <!-- Config Icon -->
          <svg v-else-if="item.icon === 'config'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- User info at bottom -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-industrial-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-industrial-600 rounded-full flex items-center justify-center">
              <span class="text-sm">{{ userInitial }}</span>
            </div>
            <div>
              <div class="text-sm font-medium">{{ authStore.user?.name || '用户' }}</div>
              <div class="text-xs text-industrial-400">{{ roleLabel }}</div>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="p-2 text-industrial-400 hover:text-white transition-colors"
            title="退出登录"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="ml-64 transition-all duration-300" :class="{ 'ml-0': !sidebarOpen }">
      <!-- Header -->
      <header class="h-16 bg-white border-b border-industrial-200 flex items-center justify-between px-6 sticky top-0 z-40">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="p-2 text-industrial-600 hover:text-industrial-800 hover:bg-industrial-100 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex items-center space-x-4">
          <span class="text-sm text-industrial-500">{{ currentDate }}</span>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const sidebarOpen = ref(true)
const route = useRoute()

// Check authentication
onMounted(async () => {
  if (!authStore.isLoggedIn) {
    await navigateTo('/login')
  }
})

// Menu items - using string identifiers for icons
const menuItems = computed(() => {
  const items = [
    { path: '/', label: '仪表盘', icon: 'dashboard' },
    { path: '/complaints', label: '客诉列表', icon: 'list' },
    { path: '/complaints/new', label: '新增客诉', icon: 'add' },
    { path: '/mappings', label: '问题映射', icon: 'mapping' },
    { path: '/stats', label: '统计分析', icon: 'chart' }
  ]

  // Admin only items
  if (authStore.isAdmin) {
    items.push({ path: '/config', label: '系统配置', icon: 'config' })
  }

  return items
})

// User initial for avatar
const userInitial = computed(() => {
  return authStore.user?.name?.charAt(0) || 'U'
})

// Role label
const roleLabel = computed(() => {
  return authStore.isAdmin ? '管理员' : '操作员'
})

// Current date
const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
  await navigateTo('/login')
}
</script>

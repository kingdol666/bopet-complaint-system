<template>
  <div class="min-h-screen bg-corporate-50 flex items-center justify-center p-4">
    <!-- Background decoration -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
    </div>

    <div class="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
      <!-- Left side - Branding -->
      <div class="hidden lg:block text-center lg:text-left">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white text-2xl font-bold shadow-lg shadow-primary-500/25 mb-6">
          BP
        </div>
        <h1 class="text-4xl font-bold text-corporate-900 mb-4">
          BOPET 客诉管理系统
        </h1>
        <p class="text-lg text-corporate-500 mb-8">
          企业级客诉处理平台，实现客诉全生命周期管理
        </p>

        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-white border border-corporate-200 shadow-sm">
            <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-corporate-900">高效处理</p>
            <p class="text-xs text-corporate-500 mt-1">快速响应客诉</p>
          </div>
          <div class="p-4 rounded-xl bg-white border border-corporate-200 shadow-sm">
            <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-corporate-900">数据分析</p>
            <p class="text-xs text-corporate-500 mt-1">可视化统计</p>
          </div>
          <div class="p-4 rounded-xl bg-white border border-corporate-200 shadow-sm">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-corporate-900">安全可靠</p>
            <p class="text-xs text-corporate-500 mt-1">权限管控</p>
          </div>
        </div>
      </div>

      <!-- Right side - Login form -->
      <div class="w-full max-w-md mx-auto">
        <div class="card-elevated p-8">
          <div class="text-center mb-8">
            <div class="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white text-xl font-bold shadow-lg shadow-primary-500/25 mb-4">
              BP
            </div>
            <h2 class="text-2xl font-bold text-corporate-900">欢迎回来</h2>
            <p class="text-sm text-corporate-500 mt-2">请登录您的账户以继续</p>
          </div>

          <n-form ref="formRef" :model="formData" :rules="rules" size="large">
            <n-form-item path="username" label="用户名">
              <n-input
                v-model:value="formData.username"
                placeholder="请输入用户名"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="password" label="密码">
              <n-input
                v-model:value="formData.password"
                type="password"
                placeholder="请输入密码"
                show-password-on="click"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-corporate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-button
              type="primary"
              block
              size="large"
              :loading="loading"
              @click="handleLogin"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </template>
              登录系统
            </n-button>
          </n-form>

          <div class="mt-6 p-4 rounded-xl bg-corporate-50 border border-corporate-100">
            <p class="text-xs font-medium text-corporate-500 uppercase tracking-wider mb-3">演示账户</p>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-corporate-600">管理员</span>
                <code class="px-2 py-1 rounded bg-white text-corporate-700 text-xs font-mono">admin / admin123</code>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-corporate-600">操作员</span>
                <code class="px-2 py-1 rounded bg-white text-corporate-700 text-xs font-mono">operator / operator123</code>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-6 text-center text-sm text-corporate-400">
          &copy; {{ new Date().getFullYear() }} BOPET 客诉管理系统 · 企业级客诉处理平台
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    const result = await authStore.login(formData.username, formData.password)

    if (result.success) {
      message.success('登录成功')
      await navigateTo('/')
    } else {
      message.error(result.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await authStore.checkAuth()

  if (authStore.isLoggedIn) {
    await navigateTo('/')
  }
})
</script>

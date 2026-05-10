<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Ambient orbs -->
    <div class="bg-orb bg-orb-1" style="top:-180px;right:-120px;width:600px;height:600px;" />
    <div class="bg-orb bg-orb-2" style="bottom:-150px;left:-100px;width:500px;height:500px;" />
    <div class="bg-orb bg-orb-3" style="width:450px;height:450px;opacity:0.25;" />

    <div class="relative w-full max-w-[960px] grid lg:grid-cols-2 gap-10 items-center z-10">
      <!-- Left: Branding -->
      <div class="hidden lg:block">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xl font-bold shadow-xl shadow-sky-500/25 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 class="text-[2.25rem] font-bold text-slate-900 leading-tight mb-3 tracking-tight">
          BOPET EDA<br /><span class="gradient-text">数据平台</span>
        </h1>
        <p class="text-base text-slate-500 leading-relaxed mb-8 max-w-sm">
          企业级数据存储、管理与分析平台<br />实现数据全生命周期管理
        </p>

        <!-- Feature pills -->
        <div class="flex flex-wrap gap-2">
          <span class="chip chip-info">灵活存储</span>
          <span class="chip chip-success">数据分析</span>
          <span class="chip chip-warning">安全可靠</span>
          <span class="chip">权限管控</span>
        </div>
      </div>

      <!-- Right: Login card -->
      <div class="card-glass-strong p-8 sm:p-10 w-full animate-scale-in">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center gap-3 mb-8">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-bold shadow shadow-sky-500/20 text-sm">BP</div>
          <div>
            <p class="text-lg font-bold text-slate-800">BOPET EDA</p>
            <p class="text-xs text-slate-400">企业数据平台</p>
          </div>
        </div>

        <h2 class="text-xl font-bold text-slate-800 mb-1">欢迎回来</h2>
        <p class="text-sm text-slate-400 mb-7">请登录您的账户以继续</p>

        <n-form ref="formRef" :model="formData" :rules="rules" size="large">
          <n-form-item path="username" label="用户名">
            <n-input v-model:value="formData.username" placeholder="请输入用户名" @keyup.enter="handleLogin">
              <template #prefix>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="password" label="密码">
            <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" show-password-on="click"
              @keyup.enter="handleLogin">
              <template #prefix>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </template>
            </n-input>
          </n-form-item>

          <n-button type="primary" block size="large" :loading="loading" @click="handleLogin" class="!mt-2">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </template>
            登录系统
          </n-button>
        </n-form>

        <!-- Demo accounts -->
        <div class="mt-6 p-4 rounded-xl bg-black/[0.02] border border-black/[0.04]">
          <p class="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-semibold mb-2.5">演示账户</p>
          <div class="space-y-1.5 text-[13px]">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">管理员</span>
              <code class="px-2 py-0.5 rounded-md bg-white/60 text-slate-600 text-[11px] font-mono border border-black/[0.04]">admin / admin123</code>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">操作员</span>
              <code class="px-2 py-0.5 rounded-md bg-white/60 text-slate-600 text-[11px] font-mono border border-black/[0.04]">operator / operator123</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="fixed bottom-6 text-center text-[11px] text-slate-400 z-10">
      &copy; {{ new Date().getFullYear() }} BOPET EDA 数据平台
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  try { await formRef.value?.validate() } catch { return }
  loading.value = true
  try {
    const result = await authStore.login(formData.username, formData.password)
    if (result.success) { message.success('登录成功'); await navigateTo('/') }
    else { message.error(result.message || '登录失败') }
  } finally { loading.value = false }
}

onMounted(async () => {
  await authStore.checkAuth()
  if (authStore.isLoggedIn) await navigateTo('/')
})
</script>

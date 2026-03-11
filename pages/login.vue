<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute left-[-5rem] top-[-4rem] h-72 w-72 rounded-full bg-primary-300/35 blur-3xl" />
      <div class="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
      <div class="absolute bottom-[-7rem] left-1/3 h-96 w-96 rounded-full bg-teal-200/25 blur-3xl" />
    </div>

    <div class="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/45 bg-white/45 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-3xl lg:grid-cols-[1.08fr_0.92fr]">
      <section class="glass-panel-strong hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div class="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-400 to-cyan-300 text-xl font-bold text-white shadow-lg shadow-primary-500/25">
            BP
          </div>
          <p class="mt-6 text-xs uppercase tracking-[0.34em] text-slate-300">
            BOPET Complaint Console
          </p>
          <h1 class="mt-4 max-w-md text-4xl font-semibold leading-tight text-balance">
            用更轻盈的面板，处理更复杂的客诉闭环。
          </h1>
          <p class="mt-5 max-w-lg text-sm leading-7 text-slate-200/90">
            将登记、分析、映射和统计集中到一个可视化工作台中，让日常处理路径更短、信息更清晰。
          </p>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-3xl border border-white/15 bg-white/10 p-4">
              <p class="text-xs uppercase tracking-[0.24em] text-slate-300">体验</p>
              <p class="mt-3 text-2xl font-semibold">Glass</p>
            </div>
            <div class="rounded-3xl border border-white/15 bg-white/10 p-4">
              <p class="text-xs uppercase tracking-[0.24em] text-slate-300">导航</p>
              <p class="mt-3 text-2xl font-semibold">Adaptive</p>
            </div>
            <div class="rounded-3xl border border-white/15 bg-white/10 p-4">
              <p class="text-xs uppercase tracking-[0.24em] text-slate-300">状态</p>
              <p class="mt-3 text-2xl font-semibold">Focus</p>
            </div>
          </div>

          <div class="rounded-[28px] border border-white/15 bg-white/10 p-5">
            <div class="flex items-start gap-3">
              <div class="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.75)]" />
              <div>
                <p class="text-sm font-medium text-white">当前推荐体验</p>
                <p class="mt-1 text-sm text-slate-200/85">
                  登录后使用左侧导航在宽屏下折叠展开，主内容区会自动横向撑满。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div class="mx-auto flex h-full w-full max-w-md flex-col justify-center">
          <div class="flex items-center gap-3 lg:hidden">
            <div class="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-cyan-300 text-lg font-bold text-white shadow-lg shadow-primary-500/20">
              BP
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-industrial-500">Welcome Back</p>
              <p class="text-lg font-semibold text-industrial-900">BOPET 客诉系统</p>
            </div>
          </div>

          <div class="mt-8 lg:mt-0">
            <p class="text-xs uppercase tracking-[0.34em] text-industrial-400">
              Secure Access
            </p>
            <h2 class="mt-3 text-3xl font-semibold tracking-tight text-industrial-900">
              登录你的工作台
            </h2>
            <p class="mt-3 text-sm leading-7 text-industrial-500">
              使用账户密码进入系统，继续处理客诉记录、问题映射和统计分析。
            </p>
          </div>

          <div class="glass-panel mt-8 rounded-[30px] p-6 sm:p-7">
            <n-form ref="formRef" :model="formData" :rules="rules" size="large">
              <n-form-item path="username" label="用户名">
                <n-input
                  v-model:value="formData.username"
                  placeholder="请输入用户名"
                  @keyup.enter="handleLogin"
                />
              </n-form-item>

              <n-form-item path="password" label="密码">
                <n-input
                  v-model:value="formData.password"
                  type="password"
                  placeholder="请输入密码"
                  show-password-on="click"
                  @keyup.enter="handleLogin"
                />
              </n-form-item>

              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleLogin"
              >
                登录系统
              </n-button>
            </n-form>

            <div class="mt-5 rounded-[24px] border border-white/60 bg-white/55 p-4">
              <p class="text-xs uppercase tracking-[0.28em] text-industrial-400">
                Demo Account
              </p>
              <div class="mt-3 space-y-2 text-sm text-industrial-600">
                <p>管理员：admin / admin123</p>
                <p>操作员：operator / operator123</p>
              </div>
            </div>
          </div>

          <p class="mt-6 text-center text-sm text-industrial-400">
            &copy; {{ new Date().getFullYear() }} BOPET 客诉管理系统
          </p>
        </div>
      </section>
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

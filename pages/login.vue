<template>
  <div class="min-h-screen bg-gradient-to-br from-industrial-800 to-industrial-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo and title -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">BP</span>
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">BOPET客诉管理系统</h1>
        <p class="text-industrial-400">客诉闭环管理平台</p>
      </div>

      <!-- Login form -->
      <div class="bg-white rounded-xl shadow-xl p-8">
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
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </n-button>
        </n-form>

        <!-- Demo accounts hint -->
        <div class="mt-6 p-4 bg-industrial-50 rounded-lg">
          <p class="text-sm text-industrial-600 mb-2">演示账号：</p>
          <div class="text-xs text-industrial-500 space-y-1">
            <p>管理员：admin / admin123</p>
            <p>操作员：operator / operator123</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6 text-industrial-500 text-sm">
        &copy; {{ new Date().getFullYear() }} BOPET客诉管理系统
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

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

// Redirect if already logged in
onMounted(async () => {
  await authStore.checkAuth()
  if (authStore.isLoggedIn) {
    await navigateTo('/')
  }
})
</script>

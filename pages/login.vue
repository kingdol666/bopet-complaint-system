<template>
  <div class="login-page">
    <div class="login-container">
      <div class="relative w-full max-w-[960px] grid lg:grid-cols-2 gap-12 items-center">
        <!-- Left: Branding with enhanced design -->
        <div class="hidden lg:block animate-fade-in-left">
          <div class="brand-logo-wrapper">
            <div class="brand-logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h1 class="brand-title">BOPET EDA<br /><span class="brand-title-highlight">数据平台</span></h1>
          <p class="brand-desc">企业级数据存储、管理与分析平台<br />实现数据全生命周期管理</p>
          <div class="brand-features">
            <span class="feature-tag feature-tag-info">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              灵活存储
            </span>
            <span class="feature-tag feature-tag-success">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              数据分析
            </span>
            <span class="feature-tag feature-tag-warning">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              安全可靠
            </span>
            <span class="feature-tag">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              权限管控
            </span>
          </div>
        </div>

        <!-- Right: Enhanced glass login card -->
        <div class="login-card animate-scale-in">
          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center gap-3 mb-8">
            <div class="mobile-logo">
              <span class="text-sm font-bold">BP</span>
            </div>
            <div>
              <p class="text-lg font-bold text-slate-800">BOPET EDA</p>
              <p class="text-xs text-slate-400">企业数据平台</p>
            </div>
          </div>

          <div class="login-header">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">请登录您的账户以继续</p>
          </div>

          <n-form ref="formRef" :model="formData" :rules="rules" size="large" class="login-form">
            <n-form-item path="username" label="用户名">
              <n-input v-model:value="formData.username" placeholder="请输入用户名" @keyup.enter="handleLogin" class="modern-input-field">
                <template #prefix>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="password" label="密码">
              <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" show-password-on="click" @keyup.enter="handleLogin" class="modern-input-field">
                <template #prefix>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-button type="primary" block size="large" :loading="loading" @click="handleLogin" class="login-btn">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </template>
              登录系统
            </n-button>
          </n-form>

          <div v-if="isDev" class="demo-section">
            <p class="demo-title">演示账户</p>
            <div class="demo-accounts">
              <div class="demo-account">
                <span class="demo-account-label">管理员</span>
                <code class="demo-account-code">admin / admin123</code>
              </div>
              <div class="demo-account">
                <span class="demo-account-label">操作员</span>
                <code class="demo-account-code">operator / operator123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="login-footer">&copy; {{ new Date().getFullYear() }} BOPET EDA 数据平台</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const message = useMessage()
const isDev = import.meta.dev
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

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #dbeafe 50%, #e0e7ff 75%, #f0f9ff 100%);
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
}

.animate-fade-in-left {
  animation: fadeInLeft 0.6s ease-out;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-scale-in {
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.brand-logo-wrapper {
  margin-bottom: 1.5rem;
}

.brand-logo-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 16px -4px rgba(14, 165, 233, 0.3), 0 4px 8px -4px rgba(99, 102, 241, 0.2);
}

.brand-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 0.75rem;
  letter-spacing: -0.025em;
}

.brand-title-highlight {
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 24rem;
}

.brand-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.feature-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.feature-tag-info {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
  color: #0ea5e9;
  border-color: rgba(14, 165, 233, 0.2);
}

.feature-tag-success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.2);
}

.feature-tag-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.2);
}

.login-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(2);
  -webkit-backdrop-filter: blur(24px) saturate(2);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 1.5rem;
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.mobile-logo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 8px -2px rgba(14, 165, 233, 0.3);
}

.login-header {
  margin-bottom: 2rem;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.login-subtitle {
  font-size: 0.875rem;
  color: #64748b;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.login-btn {
  margin-top: 0.5rem;
  height: 3rem;
  font-weight: 600;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
  transition: all 0.3s ease;
}

.login-btn:hover {
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.35);
  transform: translateY(-2px);
}

.login-btn:active {
  transform: translateY(0);
}

.demo-section {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.demo-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.demo-accounts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.demo-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.demo-account-label {
  font-size: 0.875rem;
  color: #64748b;
}

.demo-account-code {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #475569;
}

.login-footer {
  position: fixed;
  bottom: 1.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  z-index: 1;
}
</style>

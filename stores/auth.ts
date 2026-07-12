import { defineStore } from 'pinia'

interface Department {
  id: number
  name: string
}

interface User {
  id: number
  username: string
  name: string
  role: string
  departments: Department[]
  grantedDepartments?: Department[]
}

interface AuthState {
  token: string | null
  user: User | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    isSuperAdmin: (state) => state.user?.role === 'superadmin',
    isAdmin: (state) => state.user?.role === 'admin',
    isNormal: (state) => state.user?.role === 'normal',
    /** 是否拥有写权限（superadmin 或 admin）— 用于管理部门设置等管理功能 */
    canWrite: (state) => state.user?.role === 'superadmin' || state.user?.role === 'admin',
    /** 是否可以创建数据（所有登录用户都可以） */
    canCreateData: (state) => !!state.user,
    /** 是否可以审批跨部门访问请求（仅 admin 和 superadmin） */
    canApproveAccess: (state) => state.user?.role === 'superadmin' || state.user?.role === 'admin',
    /** 获取用户所属部门ID列表 */
    departmentIds: (state) => state.user?.departments?.map(d => d.id) || [],
    /** 获取跨部门授权可查看的部门ID列表 */
    grantedDepartmentIds: (state) => state.user?.grantedDepartments?.map(d => d.id) || [],
    /** 获取所有可查看部门ID列表（本部门 + 跨部门授权） */
    viewableDepartmentIds: (state) => [
      ...(state.user?.departments?.map(d => d.id) || []),
      ...(state.user?.grantedDepartments?.map(d => d.id) || [])
    ],
    roleLabel: (state) => {
      const map: Record<string, string> = {
        superadmin: '超级管理员',
        admin: '部门管理员',
        normal: '普通用户'
      }
      return map[state.user?.role || ''] || '未知'
    }
  },

  actions: {
    clearPersistedAuth() {
      this.token = null
      this.user = null

      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        document.cookie = 'auth_token=; path=/; max-age=0'
      }
    },

    async login(username: string, password: string) {
      try {
        const response = await $fetch('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        })

        if (response.success) {
          this.token = response.data.token
          this.user = response.data.user

          if (import.meta.client) {
            localStorage.setItem('token', response.data.token)
            localStorage.setItem('user', JSON.stringify(response.data.user))
            // 同步写入 cookie，让浏览器自动携带
            document.cookie = `auth_token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`
          }

          return { success: true }
        }

        return { success: false, message: '登录失败' }
      } catch (error: any) {
        const msg = error.data?.message
        if (msg) return { success: false, message: msg }
        if (error.message === 'Failed to fetch' || error.cause?.code === 'ECONNREFUSED') {
          return { success: false, message: '无法连接到服务器，请检查网络' }
        }
        return { success: false, message: '登录失败，请稍后重试' }
      }
    },

    async logout() {
      try {
        await $fetch('/api/auth/logout', {
          method: 'POST',
          headers: this.getAuthHeaders()
        })
      } catch {
        // Ignore logout errors.
      }

      this.clearPersistedAuth()
    },

    async checkAuth() {
      if (import.meta.client) {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (token && userStr) {
          this.token = token
          // 确保 cookie 同步（兼容老 session 未写 cookie 的情况）
          document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`
          try {
            this.user = JSON.parse(userStr)
          } catch {
            this.clearPersistedAuth()
            return
          }
        }
      } else if (import.meta.server) {
        // SSR 场景：从请求 cookie 中恢复 token，避免直接刷新页面时被误判为未登录
        const cookie = useCookie('auth_token')
        if (cookie.value) {
          this.token = cookie.value
        }
      }

      if (this.token) {
        try {
          const response = await $fetch('/api/auth/me', {
            headers: this.getAuthHeaders()
          })

          if (response.success) {
            this.user = response.data

            if (import.meta.client) {
              localStorage.setItem('user', JSON.stringify(response.data))
            }
          } else {
            this.clearPersistedAuth()
          }
        } catch {
          this.clearPersistedAuth()
        }
      }
    },

    getAuthHeaders(): Record<string, string> {
      return this.token ? { Authorization: `Bearer ${this.token}` } : {}
    }
  }
})

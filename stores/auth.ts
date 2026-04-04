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
    /** 是否拥有写权限（superadmin 或 admin） */
    canWrite: (state) => state.user?.role === 'superadmin' || state.user?.role === 'admin',
    /** 获取用户所属部门ID列表 */
    departmentIds: (state) => state.user?.departments?.map(d => d.id) || [],
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
        return { success: false, message: error.data?.statusMessage || '登录失败' }
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

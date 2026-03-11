import { defineStore } from 'pinia'

interface User {
  id: number
  username: string
  name: string
  role: string
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
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    clearPersistedAuth() {
      this.token = null
      this.user = null

      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
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

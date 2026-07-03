export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth for login page
  if (to.path === '/login') return

  const authStore = useAuthStore()

  // Check auth status
  await authStore.checkAuth()

  // If not logged in, redirect to login
  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }
})

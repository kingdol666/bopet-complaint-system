export default defineEventHandler(async () => {
  return {
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
})

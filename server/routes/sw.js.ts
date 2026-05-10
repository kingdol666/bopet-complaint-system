/**
 * Silences browser auto-requests for /sw.js (Service Worker).
 * Returns a self-unregistering worker so the browser stops asking.
 */
export default defineEventHandler(() => {
  return new Response(
    'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",()=>self.registration.unregister());',
    {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    }
  )
})

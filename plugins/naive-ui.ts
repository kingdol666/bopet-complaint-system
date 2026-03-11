import { setup } from '@css-render/vue3-ssr'
import naive from 'naive-ui'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(naive)

  if (import.meta.server) {
    const { collect } = setup(nuxtApp.vueApp)
    const ctx = nuxtApp.ssrContext

    if (ctx) {
      const originalRenderMeta = ctx.renderMeta
      ctx.renderMeta = function () {
        let result: any = { headTags: '' }

        if (typeof originalRenderMeta === 'function') {
          result = originalRenderMeta.call(ctx)
        }

        if (result && typeof result.then === 'function') {
          return result.then((resolved: any) => ({
            ...resolved,
            headTags: (resolved.headTags || '') + collect()
          }))
        }

        return {
          ...result,
          headTags: (result.headTags || '') + collect()
        }
      }
    }
  }
})

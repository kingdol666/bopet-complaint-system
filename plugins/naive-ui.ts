import { setup } from '@css-render/vue3-ssr'
import * as naive from 'naive-ui'

export default defineNuxtPlugin((nuxtApp) => {
  // 注册 naive-ui 到 Vue 应用 (使用 install 方法)
  // @ts-ignore - naive-ui 类型定义问题
  if (naive.default?.install) {
    nuxtApp.vueApp.use(naive.default)
  }

  // Setup SSR for naive-ui CSS rendering
  if (import.meta.server) {
    const { collect } = setup(nuxtApp.vueApp)
    const ctx = nuxtApp.ssrContext

    if (ctx) {
      const originalRenderMeta = ctx.renderMeta
      ctx.renderMeta = function() {
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

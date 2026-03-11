// https://nuxt.com/docs/api/configuration/nuxt-config
const tailwindModuleConfig = {
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js'
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  css: [],

  // Enable TypeScript
  typescript: {
    strict: false,
    shim: false
  },

  // Runtime config
  runtimeConfig: {
    // Server-side only
    databaseUrl: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || '',
    // Public
    public: {
      apiBase: '/api'
    }
  },

  // Vite config - handle ESM/CommonJS interop for naive-ui
  vite: {
    optimizeDeps: {
      include: [
        'naive-ui',
        'echarts',
        'vue-echarts',
        'vueuc',
        '@css-render/vue3-ssr',
        '@juggle/resize-observer'
      ]
    },
    ssr: {
      noExternal: ['naive-ui', 'vueuc', '@css-render/vue3-ssr']
    }
  },

  // Build config - always transpile naive-ui related packages
  build: {
    transpile: [
      'naive-ui',
      'vueuc',
      '@css-render/vue3-ssr',
      '@juggle/resize-observer'
    ]
  },

  // Imports
  imports: {
    dirs: ['stores', 'composables', 'utils']
  },

  // TailwindCSS
  ...tailwindModuleConfig,

  // Nitro config
  nitro: {
    externals: {
      inline: ['naive-ui', 'vueuc']
    }
  }
})

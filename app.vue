<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <nuxt-layout>
            <nuxt-page />
          </nuxt-layout>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  dateZhCN,
  zhCN
} from 'naive-ui'

// Enterprise theme overrides
const themeOverrides = {
  common: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeightStrong: '600',
    primaryColor: '#0ea5e9',
    primaryColorHover: '#0284c7',
    primaryColorPressed: '#0369a1',
    primaryColorSuppl: '#38bdf8',
    infoColor: '#3b82f6',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    bodyColor: '#f8fafc',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    tableColor: '#ffffff',
    borderColor: '#e2e8f0',
    dividerColor: '#f1f5f9',
    boxShadow1: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    boxShadow2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    borderRadiusSmall: '6px'
  },
  Button: {
    heightMedium: '38px',
    heightLarge: '44px',
    borderRadiusMedium: '8px',
    borderRadiusLarge: '10px',
    fontWeight: '500',
    paddingMedium: '0 16px',
    paddingLarge: '0 20px'
  },
  Card: {
    borderRadius: '12px',
    color: '#ffffff',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)'
  },
  Input: {
    borderRadius: '8px',
    color: '#ffffff',
    colorFocus: '#ffffff',
    boxShadowFocus: '0 0 0 3px rgba(14, 165, 233, 0.1)',
    heightMedium: '38px',
    heightLarge: '44px'
  },
  Select: {
    borderRadius: '8px',
    peers: {
      InternalSelection: {
        borderRadius: '8px',
        heightMedium: '38px'
      }
    }
  },
  DataTable: {
    borderRadius: '12px',
    thColor: '#f8fafc',
    thColorHover: '#f1f5f9',
    tdColor: '#ffffff',
    tdColorHover: '#f8fafc',
    borderColor: '#e2e8f0'
  },
  Tag: {
    borderRadius: '6px',
    fontWeight: '500'
  },
  Modal: {
    borderRadius: '16px'
  },
  Pagination: {
    itemBorderRadius: '6px'
  }
}

// Add page meta
useHead({
  titleTemplate: (title) => title ? `${title} - BOPET客诉系统` : 'BOPET客诉管理系统',
  meta: [
    { name: 'description', content: 'BOPET客诉管理系统 - 企业级客诉处理平台' }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
  ]
})
</script>

<style>
/* Global transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

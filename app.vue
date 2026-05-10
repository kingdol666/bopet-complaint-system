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

// iOS 26 Glassmorphism theme overrides
const themeOverrides = {
  common: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeightStrong: '600',
    primaryColor: '#0ea5e9',
    primaryColorHover: '#0284c7',
    primaryColorPressed: '#0369a1',
    primaryColorSuppl: '#38bdf8',
    infoColor: '#6366f1',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    bodyColor: 'transparent',
    cardColor: 'rgba(255,255,255,0.72)',
    modalColor: 'rgba(255,255,255,0.88)',
    popoverColor: 'rgba(255,255,255,0.88)',
    tableColor: 'rgba(255,255,255,0.55)',
    tableColorHover: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(0,0,0,0.06)',
    dividerColor: 'rgba(0,0,0,0.04)',
    boxShadow1: '0 1px 3px rgba(0,0,0,0.04)',
    boxShadow2: '0 4px 16px rgba(0,0,0,0.06)',
    boxShadow3: '0 12px 32px rgba(0,0,0,0.08)',
    borderRadius: '11px',
    borderRadiusSmall: '8px',
    fontSizeSmall: '0.8125rem',
    fontSizeMedium: '0.875rem',
    fontSizeLarge: '0.9375rem',
    cubicBezierEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusLarge: '12px',
    fontWeight: '500',
    paddingMedium: '0 18px',
    paddingLarge: '0 22px',
  },
  Card: {
    borderRadius: '16px',
    color: 'rgba(255,255,255,0.72)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  Input: {
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.65)',
    colorFocus: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderFocus: '1px solid #0ea5e9',
    boxShadowFocus: '0 0 0 3px rgba(14,165,233,0.1)',
  },
  Select: {
    borderRadius: '10px',
    peers: { InternalSelection: { borderRadius: '10px' } }
  },
  DataTable: {
    borderRadius: '14px',
    thColor: 'rgba(0,0,0,0.02)',
    tdColor: 'rgba(255,255,255,0.4)',
    tdColorHover: 'rgba(255,255,255,0.76)',
    borderColor: 'rgba(0,0,0,0.04)',
  },
  Tag: { borderRadius: '7px', fontWeight: '500' },
  Modal: { borderRadius: '20px', boxShadow: '0 24px 56px rgba(0,0,0,0.12)' },
  Pagination: { itemBorderRadius: '8px' },
  Switch: { railColorActive: '#0ea5e9' },
}

// Add page meta
useHead({
  titleTemplate: (title) => title ? `${title} - BOPET客诉系统` : 'BOPET客诉管理系统',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
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
.page-enter-active, .page-leave-active { transition: all 0.25s ease; }
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }

/* iOS glass on Naive UI overlays */
.n-modal, .n-modal .n-card, .n-drawer, .n-popover, .n-dropdown-menu {
  backdrop-filter: blur(28px) saturate(2) !important;
  -webkit-backdrop-filter: blur(28px) saturate(2) !important;
}
.n-modal-mask {
  backdrop-filter: blur(6px) !important;
  -webkit-backdrop-filter: blur(6px) !important;
  background: rgba(0,0,0,0.06) !important;
}
.n-base-select-menu, .n-dropdown-menu {
  background: rgba(255,255,255,0.92) !important;
  backdrop-filter: blur(24px) saturate(2) !important;
  -webkit-backdrop-filter: blur(24px) saturate(2) !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.08) !important;
  border-radius: 14px !important;
}
.n-data-table .n-data-table-th {
  background: rgba(0,0,0,0.015) !important;
  font-weight: 600 !important; font-size: 0.8125rem !important; color: #64748b !important;
}
.n-button--primary-type { box-shadow: 0 2px 8px rgba(14,165,233,0.25) !important; }
.n-button--primary-type:hover { box-shadow: 0 4px 16px rgba(14,165,233,0.35) !important; }
</style>

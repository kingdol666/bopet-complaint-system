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

// Glassmorphism enterprise theme overrides
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
    tableColor: 'rgba(255,255,255,0.6)',
    tableColorHover: 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(0,0,0,0.06)',
    dividerColor: 'rgba(0,0,0,0.04)',
    boxShadow1: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
    boxShadow2: '0 6px 16px -4px rgba(0,0,0,0.06), 0 3px 8px -4px rgba(0,0,0,0.04)',
    boxShadow3: '0 16px 36px -8px rgba(0,0,0,0.08), 0 6px 16px -6px rgba(0,0,0,0.04)',
    borderRadius: '10px',
    borderRadiusSmall: '7px',
    fontSizeSmall: '0.8125rem',
    fontSizeMedium: '0.875rem',
    fontSizeLarge: '0.9375rem',
    heightSmall: '32px',
    heightMedium: '38px',
    heightLarge: '44px',
    cubicBezierEaseInOut: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  },
  Button: {
    heightMedium: '38px',
    heightLarge: '44px',
    borderRadiusMedium: '9px',
    borderRadiusLarge: '11px',
    fontWeight: '500',
    paddingMedium: '0 18px',
    paddingLarge: '0 22px',
    textColor: '#fff',
  },
  Card: {
    borderRadius: '14px',
    color: 'rgba(255,255,255,0.72)',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03), 0 1px 2px -1px rgba(0,0,0,0.02)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  Input: {
    borderRadius: '9px',
    color: 'rgba(255,255,255,0.7)',
    colorFocus: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderFocus: '1px solid #0ea5e9',
    boxShadowFocus: '0 0 0 3px rgba(14,165,233,0.1)',
    heightMedium: '38px',
    heightLarge: '44px',
  },
  Select: {
    borderRadius: '9px',
    peers: {
      InternalSelection: {
        borderRadius: '9px',
        heightMedium: '38px',
        color: 'rgba(255,255,255,0.7)',
      }
    }
  },
  DataTable: {
    borderRadius: '14px',
    thColor: 'rgba(0,0,0,0.02)',
    thColorHover: 'rgba(0,0,0,0.03)',
    tdColor: 'rgba(255,255,255,0.4)',
    tdColorHover: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(0,0,0,0.04)',
  },
  Tag: {
    borderRadius: '6px',
    fontWeight: '500',
  },
  Modal: {
    borderRadius: '18px',
    color: 'rgba(255,255,255,0.88)',
    boxShadow: '0 24px 56px -12px rgba(0,0,0,0.12), 0 8px 24px -10px rgba(0,0,0,0.06)',
  },
  Pagination: {
    itemBorderRadius: '7px',
  },
  Switch: {
    railColorActive: '#0ea5e9',
  },
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
/* Page transitions */
.page-enter-active,
.page-leave-active { transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1); }
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to { opacity: 0; transform: translateY(-8px); }

/* Glass effect on Naive UI overlay elements */
.n-modal,
.n-modal .n-card,
.n-drawer,
.n-popover,
.n-dropdown-menu {
  backdrop-filter: blur(24px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.8) !important;
}

/* Modal mask */
.n-modal-mask {
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  background: rgba(0, 0, 0, 0.08) !important;
}

/* Select / dropdown menus */
.n-base-select-menu,
.v-binder-follower-container .n-dropdown-menu {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px) saturate(2) !important;
  -webkit-backdrop-filter: blur(20px) saturate(2) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.08) !important;
  border-radius: 12px !important;
}

/* Input fields - subtle glass */
.n-input .n-input__input-el,
.n-input .n-input__textarea-el {
  background: transparent !important;
}

/* Data table header */
.n-data-table .n-data-table-th {
  background: rgba(0, 0, 0, 0.015) !important;
  font-weight: 600 !important;
  font-size: 0.8125rem !important;
  color: #4a5b6b !important;
}

/* Tag softness */
.n-tag {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Button primary glow */
.n-button--primary-type {
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25) !important;
}
.n-button--primary-type:hover {
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35) !important;
}
</style>

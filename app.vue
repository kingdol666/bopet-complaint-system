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

// Enterprise Glassmorphism theme overrides
const themeOverrides = {
  common: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeightStrong: '600',
    primaryColor: '#0ea5e9',
    primaryColorHover: '#0284c7',
    primaryColorPressed: '#0369a1',
    primaryColorSuppl: '#38bdf8',
    infoColor: '#6366f1',
    infoColorHover: '#4f46e5',
    successColor: '#10b981',
    successColorHover: '#059669',
    warningColor: '#f59e0b',
    warningColorHover: '#d97706',
    errorColor: '#ef4444',
    errorColorHover: '#dc2626',
    bodyColor: 'transparent',
    cardColor: 'rgba(255,255,255,0.78)',
    modalColor: 'rgba(255,255,255,0.92)',
    popoverColor: 'rgba(255,255,255,0.92)',
    tableColor: 'rgba(255,255,255,0.6)',
    tableColorHover: 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(0,0,0,0.06)',
    dividerColor: 'rgba(0,0,0,0.04)',
    boxShadow1: '0 1px 3px rgba(0,0,0,0.04)',
    boxShadow2: '0 4px 16px rgba(0,0,0,0.06)',
    boxShadow3: '0 12px 32px rgba(0,0,0,0.08)',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontSizeSmall: '0.8125rem',
    fontSizeMedium: '0.875rem',
    fontSizeLarge: '0.9375rem',
    cubicBezierEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    textColor1: '#0f172a',
    textColor2: '#334155',
    textColor3: '#64748b',
    textColorDisabled: '#94a3b8',
    placeholderColor: '#94a3b8',
    fontWeight: '400',
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusLarge: '12px',
    borderRadiusTiny: '6px',
    borderRadiusSmall: '8px',
    fontWeight: '500',
    paddingMedium: '0 18px',
    paddingLarge: '0 22px',
  },
  Card: {
    borderRadius: '16px',
    color: 'rgba(255,255,255,0.78)',
    colorModal: 'rgba(255,255,255,0.92)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  Input: {
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.65)',
    colorFocus: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderFocus: '1px solid #0ea5e9',
    borderHover: '1px solid rgba(0,0,0,0.12)',
    boxShadowFocus: '0 0 0 3px rgba(14,165,233,0.1)',
    caretColor: '#0ea5e9',
  },
  Select: {
    borderRadius: '10px',
    peers: { InternalSelection: { borderRadius: '10px' } }
  },
  DataTable: {
    borderRadius: '14px',
    thColor: 'rgba(248,250,252,0.9)',
    thColorHover: 'rgba(241,245,249,0.9)',
    tdColor: 'rgba(255,255,255,0.4)',
    tdColorHover: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(0,0,0,0.04)',
    thFontWeight: '600',
    thTextColor: '#475569',
    tdTextColor: '#334155',
    fontSizeMedium: '0.8125rem',
  },
  Tag: { borderRadius: '7px', fontWeight: '500' },
  Modal: {
    borderRadius: '20px',
    boxShadow: '0 24px 56px rgba(0,0,0,0.12)',
  },
  Pagination: { itemBorderRadius: '8px' },
  Switch: { railColorActive: '#0ea5e9' },
  Tabs: {
    tabFontWeightActive: '600',
    tabFontWeight: '500',
  },
  Form: {
    labelFontWeight: '500',
    labelTextColor: '#334155',
  },
  Menu: {
    borderRadius: '10px',
    itemHeight: '36px',
  },
  Spin: { opacitySpinning: '0.8' },
  Tooltip: {
    borderRadius: '8px',
    padding: '6px 10px',
    textColor: '#f8fafc',
    color: 'rgba(15,23,42,0.92)',
  },
}

// Add page meta
useHead({
  titleTemplate: (title) => title ? `${title} - BOPET EDA` : 'BOPET EDA 数据平台',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
    { name: 'description', content: 'BOPET EDA 数据平台 - 企业级数据存储与分析平台' }
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

/* Enterprise glass on Naive UI overlays */
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
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(24px) saturate(2) !important;
  -webkit-backdrop-filter: blur(24px) saturate(2) !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.08) !important;
  border-radius: 14px !important;
}

/* Enterprise table headers */
.n-data-table .n-data-table-th {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
  font-weight: 600 !important;
  font-size: 0.8125rem !important;
  color: #475569 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}
.n-data-table .n-data-table-td {
  font-size: 0.8125rem !important;
}
.n-data-table .n-data-table-tr:hover .n-data-table-td {
  background: rgba(14,165,233,0.03) !important;
}

/* Enterprise buttons */
.n-button--primary-type { box-shadow: 0 2px 8px rgba(14,165,233,0.2) !important; }
.n-button--primary-type:hover { box-shadow: 0 4px 16px rgba(14,165,233,0.32) !important; transform: translateY(-1px); }
.n-button--success-type { box-shadow: 0 2px 8px rgba(16,185,129,0.2) !important; }
.n-button--success-type:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.32) !important; transform: translateY(-1px); }
.n-button--error-type { box-shadow: 0 2px 8px rgba(239,68,68,0.15) !important; }
.n-button--error-type:hover { box-shadow: 0 4px 16px rgba(239,68,68,0.25) !important; transform: translateY(-1px); }
.n-button--warning-type { box-shadow: 0 2px 8px rgba(245,158,11,0.15) !important; }
.n-button--warning-type:hover { box-shadow: 0 4px 16px rgba(245,158,11,0.25) !important; transform: translateY(-1px); }
.n-button:active { transform: translateY(0) !important; }

/* Enterprise modal header */
.n-modal .n-card-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
}

/* Enterprise tabs */
.n-tabs .n-tabs-rail {
  background: rgba(0,0,0,0.02) !important;
  border-radius: 12px !important;
  padding: 3px !important;
}
.n-tabs .n-tabs-tab {
  font-weight: 500 !important;
  border-radius: 9px !important;
}
.n-tabs .n-tabs-tab.n-tabs-tab--active {
  font-weight: 600 !important;
}

/* Enterprise form labels */
.n-form-item .n-form-item-label {
  font-weight: 500 !important;
  color: #334155 !important;
}

/* Enterprise input focus */
.n-input .n-input__input-el:focus,
.n-input .n-input__textarea-el:focus {
  outline: none !important;
}

/* Enterprise tag */
.n-tag {
  font-weight: 500 !important;
  letter-spacing: 0.01em !important;
}

/* Enterprise spin */
.n-spin-container .n-spin-body {
  background: rgba(255,255,255,0.6) !important;
  backdrop-filter: blur(4px) !important;
  border-radius: 12px !important;
}

/* Smooth scroll for modals */
.n-modal .n-card__content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.12) transparent;
}
</style>

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

const themeOverrides = {
  common: {
    fontFamily: '"Avenir Next", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeightStrong: '600',
    primaryColor: '#2563eb',
    primaryColorHover: '#4a7dff',
    primaryColorPressed: '#1f52cd',
    primaryColorSuppl: '#7cb3ff',
    infoColor: '#0ea5e9',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    bodyColor: 'rgba(255, 255, 255, 0.68)',
    cardColor: 'rgba(255, 255, 255, 0.62)',
    modalColor: 'rgba(248, 251, 255, 0.9)',
    popoverColor: 'rgba(248, 251, 255, 0.9)',
    tableColor: 'rgba(255, 255, 255, 0.24)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    dividerColor: 'rgba(148, 163, 184, 0.18)',
    boxShadow1: '0 12px 30px rgba(15, 23, 42, 0.08)',
    boxShadow2: '0 18px 60px rgba(15, 23, 42, 0.12)',
    borderRadius: '18px'
  },
  Button: {
    heightMedium: '40px',
    heightLarge: '46px',
    borderRadiusMedium: '16px',
    borderRadiusLarge: '18px',
    fontWeight: '600'
  },
  Card: {
    borderRadius: '24px',
    color: 'rgba(255, 255, 255, 0.6)',
    boxShadow: '0 16px 50px rgba(15, 23, 42, 0.08)'
  },
  Input: {
    borderRadius: '16px',
    color: 'rgba(255, 255, 255, 0.7)',
    colorFocus: 'rgba(255, 255, 255, 0.88)',
    boxShadowFocus: '0 0 0 3px rgba(37, 99, 235, 0.14)'
  }
}
</script>

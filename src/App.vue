<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToast from '@/components/common/AppToast.vue'
import { useThemeStore } from '@/stores/theme'

// 初始化主题（应用持久化偏好 + 监听系统主题变化）
const themeStore = useThemeStore()
themeStore.init()
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>
  <AppToast />
</template>

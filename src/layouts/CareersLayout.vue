<script setup lang="ts">
/**
 * 招聘官网布局 —— UI §4
 *
 * `.careers-app` 为招聘官网的作用域根：
 * Design Tokens 定义于此（见 styles/recruitment.css），不会影响现有应用样式。
 */
import { RouterView } from 'vue-router'
import CareersHeader from '@/components/recruitment/CareersHeader.vue'
import CareersFooter from '@/components/recruitment/CareersFooter.vue'
</script>

<template>
  <div class="careers-app">
    <CareersHeader />

    <main class="rc-main">
      <RouterView />
    </main>

    <CareersFooter />
  </div>
</template>

<style scoped>
.rc-main {
  display: block;
  min-height: 60vh;
  background-color: var(--rc-color-surface);
}
</style>

<script setup lang="ts">
/**
 * 招聘官网 404 —— 产品书 §10.9（直接访问不存在的路由时给出明确提示与返回入口）
 */
import { RouterLink } from 'vue-router'
import RcEmpty from '@/components/recruitment/RcEmpty.vue'
</script>

<template>
  <div class="rc-notfound">
    <div class="rc-container">
      <RcEmpty title="页面不存在" desc="你访问的页面可能已被移除，或链接有误。" icon="warning">
        <template #action>
          <RouterLink :to="{ name: 'careers-home' }" class="rc-btn rc-btn--primary">
            返回招聘官网首页
          </RouterLink>
        </template>
      </RcEmpty>
    </div>
  </div>
</template>

<style scoped>
.rc-notfound {
  padding: var(--rc-space-16) 0;
  background-color: var(--rc-color-surface);
}
</style>

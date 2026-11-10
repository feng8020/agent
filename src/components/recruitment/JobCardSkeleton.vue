<script setup lang="ts">
/**
 * 岗位卡片骨架屏 —— UI §6.11 / §10（列表 Loading）
 */
</script>

<template>
  <div class="rc-job-skeleton" aria-hidden="true">
    <span class="rc-skeleton rc-job-skeleton__tag" />
    <span class="rc-skeleton rc-job-skeleton__title" />
    <span class="rc-skeleton rc-job-skeleton__meta" />
    <span class="rc-skeleton rc-job-skeleton__salary" />
  </div>
</template>

<style scoped>
.rc-job-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-4);
  padding: var(--rc-space-6);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
}

.rc-job-skeleton__tag {
  width: 72px;
  height: 26px;
  border-radius: var(--rc-radius-pill);
}

.rc-job-skeleton__title {
  width: 62%;
  height: 22px;
}

.rc-job-skeleton__meta {
  width: 42%;
  height: 16px;
}

.rc-job-skeleton__salary {
  width: 30%;
  height: 18px;
}
</style>

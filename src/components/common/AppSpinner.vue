<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
    strokeWidth?: number
  }>(),
  { size: 16, strokeWidth: 2 }
)
</script>

<template>
  <span
    class="app-spinner"
    :style="{ width: `${size}px`, height: `${size}px`, borderWidth: `${strokeWidth}px` }"
    role="status"
    aria-label="加载中"
  />
</template>

<style scoped>
.app-spinner {
  display: inline-block;
  flex: none;
  border-style: solid;
  border-color: currentColor;
  border-top-color: transparent;
  border-radius: var(--radius-full);
  animation: ai-spin 0.7s linear infinite;
}
</style>

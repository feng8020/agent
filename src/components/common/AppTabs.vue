<script setup lang="ts">
import type { TabItem } from './types'

defineProps<{
  modelValue: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <!-- 设置页下划线 Tabs（UI §4 P4、§16.3：Tab 间距 88 / 激活下划线 2px） -->
  <!-- 间距改为可覆盖变量：消息内产物块等窄容器需要更紧凑的间距（默认仍为 88px） -->
  <div class="app-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      class="app-tabs__item"
      :class="{ 'is-active': tab.value === modelValue }"
      :aria-selected="tab.value === modelValue"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.app-tabs {
  display: flex;
  align-items: center;
  gap: var(--tabs-gap, 88px);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  scrollbar-width: none;
}

.app-tabs::-webkit-scrollbar {
  display: none;
}

.app-tabs__item {
  position: relative;
  flex: none;
  padding-bottom: 14px;
  font-size: var(--font-size-form);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  transition: color var(--duration-fast) var(--easing-standard);
}

.app-tabs__item:hover {
  color: var(--color-text-primary);
}

.app-tabs__item.is-active {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.app-tabs__item.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 1px;
  background-color: var(--color-primary);
}
</style>

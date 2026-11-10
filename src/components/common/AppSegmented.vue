<script setup lang="ts">
import type { SegmentedOption } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SegmentedOption[]
    /** 是否占满整行（UI §6.13 主题切换、§7.1 登录方式切换） */
    block?: boolean
    disabled?: boolean
  }>(),
  { block: true, disabled: false }
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const select = (value: string): void => {
  if (props.disabled || value === props.modelValue) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="app-segmented" :class="{ 'is-block': block, 'is-disabled': disabled }" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      class="app-segmented__item"
      :class="{ 'is-active': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      :disabled="disabled"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.app-segmented {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  background-color: var(--color-hover);
  border-radius: 11px;
}

.app-segmented.is-block {
  display: flex;
  width: 100%;
}

.app-segmented__item {
  flex: 1;
  height: 36px;
  padding: 0 var(--space-4);
  font-size: var(--font-size-form);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.app-segmented__item:hover:not(.is-active):not(:disabled) {
  color: var(--color-text-primary);
}

.app-segmented__item.is-active {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  border-color: var(--color-border-strong);
}

.app-segmented.is-disabled {
  opacity: 0.6;
}

.app-segmented__item:disabled {
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import AppSpinner from './AppSpinner.vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    block?: boolean
    loading?: boolean
    loadingText?: string
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    title?: string
    ariaLabel?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    block: false,
    loading: false,
    loadingText: '',
    disabled: false,
    type: 'button',
    title: '',
    ariaLabel: ''
  }
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'is-block': block, 'is-loading': loading }
    ]"
    :type="type"
    :disabled="isDisabled"
    :title="title || undefined"
    :aria-label="ariaLabel || undefined"
    @click="emit('click', $event)"
  >
    <AppSpinner v-if="loading" :size="size === 'sm' ? 14 : 16" />
    <span v-else-if="$slots.icon" class="app-button__icon">
      <slot name="icon" />
    </span>

    <span v-if="variant !== 'icon'" class="app-button__label">
      <template v-if="loading && loadingText">{{ loadingText }}</template>
      <slot v-else />
    </span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard);
}

.app-button:active:not(:disabled) {
  transform: scale(0.98);
}

.app-button:disabled {
  cursor: not-allowed;
}

.is-block {
  width: 100%;
}

/* ---- 尺寸 ---- */
.app-button--sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--font-size-caption);
  border-radius: var(--radius-md);
}

.app-button--md {
  height: 44px;
  padding: 0 var(--space-5);
  font-size: var(--font-size-form);
}

.app-button--lg {
  height: 48px;
  padding: 0 var(--space-6);
  font-size: 15px;
}

/* ---- 变体 ---- */
.app-button--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.app-button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.app-button--secondary {
  background-color: var(--color-bg);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

.app-button--secondary:hover:not(:disabled) {
  background-color: var(--color-hover);
}

.app-button--ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.app-button--ghost:hover:not(:disabled) {
  background-color: var(--color-hover);
  color: var(--color-text-primary);
}

.app-button--danger {
  background-color: transparent;
  border-color: var(--color-error);
  color: var(--color-error);
}

.app-button--danger:hover:not(:disabled) {
  background-color: var(--color-error-bg);
}

/* ---- 图标按钮（UI §6.2：28×28 / 圆角 8 / 1px 边框） ---- */
.app-button--icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--radius-md);
  background-color: transparent;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.app-button--icon:hover:not(:disabled) {
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

/* ---- 禁用 ---- */
.app-button:disabled:not(.is-loading) {
  background-color: var(--color-disabled-bg);
  border-color: transparent;
  color: var(--color-disabled-text);
}

.app-button--danger:disabled:not(.is-loading) {
  background-color: transparent;
  border-color: var(--color-border);
  color: var(--color-disabled-text);
}

.app-button.is-loading {
  cursor: wait;
}

.app-button__icon {
  display: inline-flex;
  align-items: center;
}
</style>

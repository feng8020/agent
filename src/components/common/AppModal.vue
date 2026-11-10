<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import AppButton from './AppButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger'
    loading?: boolean
    hideCancel?: boolean
  }>(),
  {
    description: '',
    confirmText: '确认',
    cancelText: '取消',
    variant: 'default',
    loading: false,
    hideCancel: false
  }
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

/** Esc 关闭（UI §6.10） */
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && !props.loading) emit('cancel')
}

const bind = (): void => {
  document.addEventListener('keydown', handleKeydown)
  document.body.style.overflow = 'hidden'
}

const unbind = (): void => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
}

watch(
  () => props.open,
  (value) => (value ? bind() : unbind()),
  { immediate: true }
)

onBeforeUnmount(unbind)

const onCancel = (): void => {
  if (props.loading) return
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="open" class="app-modal" role="dialog" aria-modal="true">
        <div class="app-modal__overlay" @click="onCancel" />
        <div class="app-modal__dialog">
          <h3 class="app-modal__title">{{ title }}</h3>
          <p v-if="description" class="app-modal__desc">{{ description }}</p>
          <div v-if="$slots.default" class="app-modal__body">
            <slot />
          </div>
          <div class="app-modal__footer">
            <AppButton
              v-if="!hideCancel"
              variant="secondary"
              :disabled="loading"
              @click="onCancel"
            >
              {{ cancelText }}
            </AppButton>
            <AppButton
              :variant="variant === 'danger' ? 'danger' : 'primary'"
              :loading="loading"
              :loading-text="`处理中…`"
              @click="emit('confirm')"
            >
              {{ confirmText }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.app-modal__overlay {
  position: absolute;
  inset: 0;
  background-color: var(--color-overlay);
}

.app-modal__dialog {
  position: relative;
  width: 100%;
  max-width: var(--size-modal);
  padding: var(--space-6);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.app-modal__title {
  font-size: var(--font-size-section);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.app-modal__desc {
  margin-top: var(--space-2);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}

.app-modal__body {
  margin-top: var(--space-4);
}

.app-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

/* 进出动画 160ms（UI §15.5） */
.app-modal-enter-active,
.app-modal-leave-active {
  transition: opacity 160ms var(--easing-standard);
}

.app-modal-enter-active .app-modal__dialog,
.app-modal-leave-active .app-modal__dialog {
  transition: transform 160ms var(--easing-standard);
}

.app-modal-enter-from,
.app-modal-leave-to {
  opacity: 0;
}

.app-modal-enter-from .app-modal__dialog,
.app-modal-leave-to .app-modal__dialog {
  transform: scale(0.96);
}

@media (max-width: 767px) {
  .app-modal {
    align-items: flex-end;
    padding: 0;
  }

  .app-modal__dialog {
    max-width: none;
    border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  }
}
</style>

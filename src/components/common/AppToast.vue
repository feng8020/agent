<script setup lang="ts">
import { toastState, useToast } from '@/composables/useToast'

const { remove } = useToast()
</script>

<template>
  <!-- 轻提示：顶部居中，距顶部 24px（UI §6.9） -->
  <Teleport to="body">
    <div class="app-toast" role="region" aria-live="polite">
      <TransitionGroup name="app-toast">
        <div
          v-for="item in toastState.items"
          :key="item.id"
          class="app-toast__item"
          :class="`is-${item.type}`"
          @click="remove(item.id)"
        >
          {{ item.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.app-toast {
  position: fixed;
  top: var(--space-6);
  left: 50%;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  transform: translateX(-50%);
  pointer-events: none;
}

.app-toast__item {
  max-width: min(90vw, 480px);
  padding: 12px 20px;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-toast-text);
  background-color: var(--color-toast-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  cursor: pointer;
  word-break: break-word;
}

.app-toast__item.is-error {
  background-color: var(--color-error);
  color: #ffffff;
}

/* Slide Down + Fade In（UI §15.5） */
.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity 200ms var(--easing-standard), transform 200ms var(--easing-standard);
}

.app-toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.app-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

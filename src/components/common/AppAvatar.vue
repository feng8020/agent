<script setup lang="ts">
import { computed } from 'vue'
import { getInitial } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    name?: string
    size?: number
    /** AI 助手头像样式（黑底白字「AI」） */
    variant?: 'user' | 'assistant'
  }>(),
  {
    name: '',
    size: 32,
    variant: 'user'
  }
)

const label = computed(() => (props.variant === 'assistant' ? 'AI' : getInitial(props.name)))

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(11, Math.round(props.size * 0.4))}px`
}))
</script>

<template>
  <span class="app-avatar" :class="`is-${variant}`" :style="style" aria-hidden="true">
    {{ label }}
  </span>
</template>

<style scoped>
.app-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  user-select: none;
}

.app-avatar.is-user {
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
}

/* AI 头像在深色主题下反色，保证对比度 */
.app-avatar.is-assistant {
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
}
</style>

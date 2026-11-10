<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: IconName
  }>(),
  {
    description: '',
    icon: 'chat'
  }
)
</script>

<template>
  <!-- 空状态（UI §6.14）：线性图标 + 主文案 + 辅助文案 -->
  <div class="app-empty">
    <div class="app-empty__icon">
      <AppIcon :name="icon" :size="28" :stroke-width="1.2" />
    </div>
    <p class="app-empty__title">{{ title }}</p>
    <p v-if="description" class="app-empty__desc">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.app-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
  color: var(--color-border-strong);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.app-empty__title {
  font-size: var(--font-size-form);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.app-empty__desc {
  font-size: var(--font-size-caption);
  color: var(--color-text-tertiary);
}
</style>

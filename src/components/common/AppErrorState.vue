<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    message?: string
    description?: string
  }>(),
  {
    message: '加载失败',
    description: ''
  }
)

const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <!-- 错误态（UI §6.14、§10.3）：图标 + 文案 + 重试 -->
  <div class="app-error">
    <div class="app-error__icon">
      <AppIcon name="warning" :size="26" :stroke-width="1.2" />
    </div>
    <p class="app-error__title">{{ message }}</p>
    <p v-if="description" class="app-error__desc">{{ description }}</p>
    <AppButton variant="secondary" size="sm" @click="emit('retry')">重试</AppButton>
  </div>
</template>

<style scoped>
.app-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.app-error__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.app-error__title {
  font-size: var(--font-size-form);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.app-error__desc {
  font-size: var(--font-size-caption);
  color: var(--color-text-tertiary);
}
</style>

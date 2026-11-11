<script setup lang="ts">
/**
 * 产物块公共外壳
 *
 * 统一 6 类产物块的外框与 header，避免每个块各写一套（UI：ui/components/artifact-blocks.md §2）。
 * 结构固定为：`[图标] [名称] [类型徽标] [占位] [actions]`。
 *
 * variant='dark' 供代码块使用：贴齐现有 Markdown 代码块的深色语汇。
 *
 * 说明：body 内的共享样式（.artifact-row / .artifact-hint / .artifact-empty）
 * 写在本组件的 `:deep()` 里统一提供，避免在 4 个块组件里重复。
 */
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'

withDefaults(
  defineProps<{
    /** 产物名称（header 主标题，单行省略） */
    name: string
    /** 类型徽标文案，例如「网页」「后端」 */
    kindLabel?: string
    icon?: IconName
    /** 外观变体：dark 用于代码块 */
    variant?: 'default' | 'dark'
  }>(),
  { kindLabel: '', icon: 'file', variant: 'default' }
)
</script>

<template>
  <section class="artifact" :class="`is-${variant}`">
    <header class="artifact__header">
      <AppIcon :name="icon" :size="16" class="artifact__icon" />
      <span class="artifact__name" :title="name">{{ name }}</span>
      <span v-if="kindLabel" class="artifact__badge">{{ kindLabel }}</span>
      <span class="artifact__spacer" />
      <div v-if="$slots.actions" class="artifact__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="artifact__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.artifact {
  max-width: 100%;
  overflow: hidden;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.artifact.is-dark {
  background-color: var(--color-code-block-bg);
  border-color: var(--color-code-block-border);
}

.artifact__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--size-artifact-header-height);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.artifact.is-dark .artifact__header {
  background-color: var(--color-code-block-bg);
  border-bottom-color: var(--color-code-block-border);
}

.artifact__icon {
  flex: none;
  color: var(--color-text-secondary);
}

.artifact__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-list);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact__badge {
  flex: none;
  height: var(--size-artifact-badge-height);
  padding: 0 8px;
  font-size: 11px;
  line-height: var(--size-artifact-badge-height);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
  border-radius: var(--radius-full);
}

.artifact__spacer {
  flex: 1;
  min-width: var(--space-1);
}

.artifact__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.artifact__body {
  padding: 0;
}

/* ---- 代码块深色外观下的 header 元素 ---- */
.artifact.is-dark .artifact__icon {
  color: var(--color-text-tertiary);
}

.artifact.is-dark .artifact__name {
  font-family: var(--font-family-mono);
  font-size: 12.5px;
  color: var(--color-code-text);
}

.artifact.is-dark .artifact__badge {
  font-family: var(--font-family-mono);
  color: var(--color-text-tertiary);
  background-color: var(--color-code-block-border);
}

/* ---- body 内共享元素（供各块使用，避免重复定义） ---- */
.artifact__body :deep(.artifact-row) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
}

.artifact__body :deep(.artifact-hint) {
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
}

.artifact__body :deep(.artifact-warn) {
  flex: none;
  color: var(--color-warning);
}

.artifact__body :deep(.artifact-empty) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.artifact__body :deep(.artifact-empty__title) {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.artifact__body :deep(.artifact-empty__desc) {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}
</style>

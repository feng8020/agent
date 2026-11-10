<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { Conversation } from '@/types'

defineProps<{
  conversation: Conversation
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'rename'): void
  (e: 'delete'): void
}>()
</script>

<template>
  <!-- 会话列表项（UI §6.3）：高 38 / 圆角 9，hover 显示操作 -->
  <div class="conversation" :class="{ 'is-active': active }">
    <button
      type="button"
      class="conversation__main"
      :title="conversation.title"
      @click="emit('select')"
    >
      <AppIcon name="chat" :size="14" class="conversation__icon" />
      <span class="conversation__title">{{ conversation.title }}</span>
    </button>

    <div class="conversation__actions">
      <button
        type="button"
        class="conversation__action"
        title="重命名"
        aria-label="重命名会话"
        @click.stop="emit('rename')"
      >
        <AppIcon name="rename" :size="14" />
      </button>
      <button
        type="button"
        class="conversation__action"
        title="删除"
        aria-label="删除会话"
        @click.stop="emit('delete')"
      >
        <AppIcon name="delete" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.conversation {
  position: relative;
  display: flex;
  align-items: center;
  height: var(--size-list-item);
  border-radius: 9px;
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.conversation:hover {
  background-color: var(--color-hover);
}

.conversation.is-active {
  background-color: var(--color-active-bg);
}

.conversation__main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 14px;
  text-align: left;
}

.conversation__icon {
  color: var(--color-text-tertiary);
}

.conversation.is-active .conversation__icon {
  color: var(--color-text-primary);
}

.conversation__title {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-list);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation.is-active .conversation__title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.conversation__actions {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--easing-standard);
}

.conversation:hover .conversation__actions,
.conversation:focus-within .conversation__actions {
  opacity: 1;
}

.conversation__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.conversation__action:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}
</style>

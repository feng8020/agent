<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import type { MessageRole, MessageStatus } from '@/types'

const props = defineProps<{
  role: MessageRole
  status: MessageStatus
}>()

const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'regenerate'): void
  (e: 'stop'): void
  (e: 'edit'): void
  (e: 'resend'): void
}>()

/** 生成中：AI 消息的复制 / 重新生成禁用，仅「停止」可用（UI §6.5） */
const busy = computed(() => props.status === 'streaming' || props.status === 'sending')
</script>

<template>
  <div class="message-actions" :class="{ 'is-busy': busy }">
    <template v-if="role === 'assistant'">
      <!-- 停止：实心方块（与输入框的停止按钮一致，不用描边图标） -->
      <button
        v-if="busy"
        type="button"
        class="message-actions__button is-primary"
        @click="emit('stop')"
      >
        <span class="message-actions__stop-glyph" aria-hidden="true" />
        <span>停止</span>
      </button>

      <template v-else>
        <button type="button" class="message-actions__button" @click="emit('copy')">
          <AppIcon name="copy" :size="13" />
          <span>复制</span>
        </button>
        <button type="button" class="message-actions__button" @click="emit('regenerate')">
          <AppIcon name="regenerate" :size="13" />
          <span>重新生成</span>
        </button>
      </template>
    </template>

    <template v-else>
      <button type="button" class="message-actions__button" @click="emit('edit')">
        <AppIcon name="edit" :size="13" />
        <span>编辑</span>
      </button>
      <button type="button" class="message-actions__button" @click="emit('resend')">
        <AppIcon name="regenerate" :size="13" />
        <span>重新发送</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.message-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.message-actions__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}

.message-actions__button:hover:not(:disabled) {
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

.message-actions__button.is-primary {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.message-actions__button.is-primary:hover {
  color: var(--color-text-inverse);
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

/* 停止图标：实心圆角方块，取代描边方框 */
.message-actions__stop-glyph {
  display: block;
  width: 9px;
  height: 9px;
  background-color: currentColor;
  border-radius: 2px;
}

/* 桌面端默认隐藏，hover 消息时显示；生成中常驻；移动端常驻（UI §6.5、§12） */
@media (min-width: 768px) {
  .message-actions {
    opacity: 0;
    transition: opacity var(--duration-fast) var(--easing-standard);
  }

  .message-actions.is-busy {
    opacity: 1;
  }

  .message:hover .message-actions,
  .message:focus-within .message-actions {
    opacity: 1;
  }
}
</style>

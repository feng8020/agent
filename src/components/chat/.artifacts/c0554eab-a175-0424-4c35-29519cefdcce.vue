<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import AppAuthedImage from '@/components/common/AppAuthedImage.vue'
import type { PendingAttachment } from '@/types'
import { formatFileSize } from '@/utils/format'

defineProps<{ attachment: PendingAttachment }>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'retry'): void
}>()
</script>

<template>
  <!-- 附件预览项（UI §6.6、§9.5：上传中 / 成功 / 失败三态） -->
  <div class="attachment" :class="`is-${attachment.status}`">
    <template v-if="attachment.type === 'image'">
      <!--
        图片走 AppAuthedImage：<img src> 无法携带 Authorization 头，
        后端文件路由只认请求头 → 直接用 src 会 401（BUG-02）。
      -->
      <AppAuthedImage
        v-if="attachment.url"
        class="attachment__thumb"
        :src="attachment.url"
        :alt="attachment.name"
      />
      <div v-else class="attachment__thumb attachment__thumb--placeholder">
        <AppIcon name="image" :size="18" />
      </div>
    </template>

    <div v-else class="attachment__file">
      <AppIcon name="file" :size="18" />
    </div>

    <div class="attachment__meta">
      <span class="attachment__name">{{ attachment.name }}</span>
      <span class="attachment__size">
        <template v-if="attachment.status === 'uploading'">上传中 {{ attachment.progress }}%</template>
        <template v-else-if="attachment.status === 'error'">上传失败</template>
        <template v-else>{{ formatFileSize(attachment.size) }}</template>
      </span>
    </div>

    <button
      v-if="attachment.status === 'error'"
      type="button"
      class="attachment__action attachment__retry"
      title="重试"
      aria-label="重试上传"
      @click="emit('retry')"
    >
      <AppIcon name="regenerate" :size="14" />
    </button>

    <button
      type="button"
      class="attachment__action"
      title="移除"
      aria-label="移除附件"
      @click="emit('remove')"
    >
      <AppIcon name="close" :size="14" />
    </button>

    <div v-if="attachment.status === 'uploading'" class="attachment__progress">
      <span :style="{ width: `${attachment.progress}%` }" />
    </div>
  </div>
</template>

<style scoped>
.attachment {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 180px;
  max-width: 260px;
  padding: 8px 38px 8px 8px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.attachment.is-error {
  border-color: var(--color-error);
}

.attachment__thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.attachment__thumb--placeholder,
.attachment__file {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--color-text-tertiary);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.attachment__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.attachment__name {
  font-size: var(--font-size-micro);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment__size {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.attachment.is-error .attachment__size {
  color: var(--color-error);
}

.attachment__action {
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.attachment__action:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.attachment__retry {
  right: 32px;
  color: var(--color-error);
}

.attachment__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background-color: var(--color-hover);
}

.attachment__progress span {
  display: block;
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--duration-fast) linear;
}
</style>

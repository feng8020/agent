<script setup lang="ts">
/**
 * 图片产物块 —— 在消息流中直接把图片显示出来（不再是 40×40 缩略图卡片）
 *
 * 与其它块的差异（有意为之，见 ui/components/artifact-blocks.md §3）：
 * 不使用 44px header，让图片本身成为主体，元信息压缩为底部 28px 的细条。
 *
 * 点击放大复用现有 FilePreviewModal（用户要求「图片放大用现有的」），
 * 不新增第二套图片预览弹窗。
 *
 * 图片加载走 AppAuthedImage（fetch + 令牌 → object URL）：
 * <img src> 无法携带 Authorization 头，而后端文件路由只认请求头，
 * 直接用 src 会稳定 401（BUG-02）。
 */
import { computed, ref } from 'vue'
import AppAuthedImage from '@/components/common/AppAuthedImage.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import FilePreviewModal from '@/components/chat/FilePreviewModal.vue'
import type { Attachment } from '@/types'
import { formatFileSize } from '@/utils/format'
import { downloadAuthedFile } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const toast = useToast()

const previewOpen = ref(false)
/** 图片加载失败 → 退化为文件行 */
const loadFailed = ref(false)

/** 图片地址：优先预览地址，其次下载地址 */
const imageUrl = computed(() => props.attachment.previewUrl || props.attachment.url)

/** 放大弹窗使用的附件（FilePreviewModal 内部用 fetch 带请求头拉取） */
const previewAttachment = computed<Attachment>(() => ({
  ...props.attachment,
  url: props.attachment.downloadUrl || props.attachment.url
}))

const sizeText = computed(() => formatFileSize(props.attachment.size))

const canDownload = computed(() => Boolean(props.attachment.downloadUrl || props.attachment.url))

const openPreview = (): void => {
  if (!imageUrl.value) {
    toast.error('图片地址无效，暂时无法预览')
    return
  }
  previewOpen.value = true
}

const handleDownload = async (): Promise<void> => {
  const target = props.attachment.downloadUrl || props.attachment.url
  if (!target) {
    toast.error('图片地址无效，暂时无法下载')
    return
  }

  try {
    await downloadAuthedFile(target, props.attachment.name)
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}
</script>

<template>
  <div class="image-block">
    <button
      v-if="!loadFailed"
      type="button"
      class="image-block__trigger"
      :aria-label="`放大查看 ${attachment.name}`"
      @click="openPreview"
    >
      <AppAuthedImage
        class="image-block__img"
        :src="imageUrl"
        :alt="attachment.name"
        @error="loadFailed = true"
      />
    </button>

    <!-- 图片加载失败：退化为文件信息行 + 下载入口 -->
    <div v-else class="image-block__fallback">
      <AppIcon name="image" :size="16" />
      <span class="image-block__name" :title="attachment.name">{{ attachment.name }}</span>
      <span v-if="sizeText" class="image-block__size">{{ sizeText }}</span>
      <button
        type="button"
        class="image-block__download"
        :disabled="!canDownload"
        title="下载"
        aria-label="下载图片"
        @click="handleDownload"
      >
        <AppIcon name="download" :size="14" />
      </button>
    </div>

    <div v-if="!loadFailed" class="image-block__meta">
      <span class="image-block__name" :title="attachment.name">{{ attachment.name }}</span>
      <span v-if="sizeText" class="image-block__size">{{ sizeText }}</span>
      <span class="image-block__hint">点击放大</span>
      <button
        type="button"
        class="image-block__download"
        :disabled="!canDownload"
        title="下载"
        aria-label="下载图片"
        @click="handleDownload"
      >
        <AppIcon name="download" :size="14" />
      </button>
    </div>

    <FilePreviewModal
      :open="previewOpen"
      :attachment="previewAttachment"
      @close="previewOpen = false"
    />
  </div>
</template>

<style scoped>
.image-block {
  display: inline-flex;
  flex-direction: column;
  max-width: min(var(--size-artifact-image-max-width), 100%);
  overflow: hidden;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.image-block__trigger {
  display: block;
  width: 100%;
  padding: 0;
  cursor: zoom-in;
  background-color: var(--color-surface);
  border: 0;
}

.image-block__img {
  display: block;
  width: 100%;
  max-height: var(--size-artifact-image-max-height);
  object-fit: contain;
  transition: opacity var(--duration-fast) var(--easing-standard);
}

.image-block__trigger:hover .image-block__img {
  opacity: 0.96;
}

.image-block__trigger:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.image-block__meta,
.image-block__fallback {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 28px;
  padding: 0 var(--space-3);
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.image-block__fallback {
  color: var(--color-text-secondary);
  border-top: 0;
}

.image-block__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-block__size {
  flex: none;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.image-block__hint {
  flex: none;
  margin-left: auto;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.image-block__download {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.image-block__download:hover:not(:disabled) {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.image-block__download:disabled {
  color: var(--color-disabled-text);
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .image-block {
    max-width: 100%;
  }
}
</style>

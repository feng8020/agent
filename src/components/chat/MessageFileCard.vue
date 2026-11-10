<script setup lang="ts">
/**
 * 文件产物卡片（挂在对应 AI 消息下方）
 *
 * 数据来源：
 *   1) 流式生成时后端 SSE 下发的 `event: artifact`，例如
 *      {"id":"22","messageId":231,"name":"8.txt",
 *       "type":"text/plain; charset=utf-8","size":37,
 *       "url":"/api/chat/files/22/download"}
 *   2) 打开历史会话时历史消息接口返回的 `files` 字段（结构同上）
 *
 * 卡片完全由附件数据驱动（不做「正文里出现 .txt 就当文件」这类猜测）：
 *   - 图标：按扩展名 / MIME 区分格式（文本 / 代码 / 表格 / 压缩包 / 图片 /
 *           PDF / 文档 / 演示文稿 / 音频 / 视频 / 通用）
 *   - 名称：name
 *   - 类型 · 大小：扩展名大写 + size（例如 TXT · 37 B）
 *   - 下载：点击直接请求后端给的 url（自动携带登录令牌）
 *   - 预览：优先 previewUrl，后端未提供则回退用 url
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import FilePreviewModal from './FilePreviewModal.vue'
import type { Attachment } from '@/types'
import { formatFileSize } from '@/utils/format'
import { downloadAuthedFile, withAuthToken } from '@/utils/file'
import { getFileIcon, getFileKind, getFileTypeLabel } from '@/utils/fileType'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const toast = useToast()
const previewOpen = ref(false)
/** 图片缩略图加载失败时退回图标 */
const thumbFailed = ref(false)

/** 格式大类（图片 / 文本 / 代码 / 表格 / 压缩包 / PDF / 文档 / 音频 / 视频 / 通用） */
const kind = computed(() => getFileKind(props.attachment.name, props.attachment.type))

const isImage = computed(() => kind.value === 'image')

/** 预览地址：优先使用后端提供的预览接口地址 */
const previewTarget = computed(
  () => props.attachment.previewUrl || props.attachment.url
)

/** 预览弹窗使用的附件（统一指向预览地址） */
const previewAttachment = computed<Attachment>(() => ({
  ...props.attachment,
  url: previewTarget.value
}))

/** 缩略图地址（浏览器直接请求，需带上登录令牌） */
const thumbSrc = computed(() =>
  props.attachment.url || props.attachment.previewUrl
    ? withAuthToken(previewTarget.value)
    : ''
)

/** 有访问地址才可预览 / 下载 */
const canAccess = computed(() =>
  Boolean(props.attachment.url || props.attachment.previewUrl)
)

/** 卡片标题：文件名 */
const title = computed(() => props.attachment.name || '未命名文件')

/** 依据格式大类选择图标 */
const iconName = computed(() =>
  getFileIcon(props.attachment.name, props.attachment.type)
)

/** 类型文案：扩展名大写（例如 TXT）；无扩展名时按格式大类兜底 */
const typeLabel = computed(() =>
  getFileTypeLabel(props.attachment.name, props.attachment.type)
)

/** 类型 · 大小（例如「TXT · 37 B」） */
const meta = computed(() => {
  const size = formatFileSize(props.attachment.size)
  return size ? `${typeLabel.value} · ${size}` : typeLabel.value
})

const openPreview = (): void => {
  if (!canAccess.value) {
    toast.error('文件地址无效，暂时无法预览')
    return
  }
  previewOpen.value = true
}

/** 下载：调用后端下发的 url；失败时给出用户可理解的错误 */
const handleDownload = async (): Promise<void> => {
  if (!props.attachment.url) {
    toast.error('文件地址无效，暂时无法下载')
    return
  }

  try {
    await downloadAuthedFile(props.attachment.url, props.attachment.name)
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}
</script>

<template>
  <div class="file-card">
    <div class="file-card__icon" :class="`is-${kind}`">
      <img
        v-if="isImage && thumbSrc && !thumbFailed"
        class="file-card__thumb"
        :src="thumbSrc"
        :alt="title"
        @error="thumbFailed = true"
      />
      <AppIcon v-else :name="iconName" :size="18" />
    </div>

    <div class="file-card__info">
      <span class="file-card__title" :title="title">{{ title }}</span>
      <span class="file-card__meta">{{ meta }}</span>
    </div>

    <div class="file-card__actions">
      <button
        type="button"
        class="file-card__action"
        :disabled="!canAccess"
        title="在线预览"
        aria-label="在线预览"
        @click="openPreview"
      >
        <AppIcon name="eye" :size="14" />
        <span>预览</span>
      </button>
      <button
        type="button"
        class="file-card__action"
        :disabled="!attachment.url"
        title="下载"
        aria-label="下载"
        @click="handleDownload"
      >
        <AppIcon name="download" :size="14" />
        <span>下载</span>
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
.file-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 100%;
  padding: 10px 12px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--duration-fast) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard);
}

.file-card:hover {
  background-color: var(--color-surface);
  border-color: var(--color-border-strong);
}

.file-card__icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  color: var(--color-text-tertiary);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

/* 按格式给图标做轻微色值区分（同一套图标下更快识别格式） */
.file-card__icon.is-image {
  color: var(--color-text-secondary);
}

.file-card__icon.is-code,
.file-card__icon.is-text {
  color: var(--color-text-secondary);
}

.file-card__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-card__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-card__title {
  overflow: hidden;
  font-size: var(--font-size-list);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__meta {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.file-card__actions {
  display: flex;
  flex: none;
  gap: var(--space-2);
}

.file-card__action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.file-card__action:hover:not(:disabled) {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
}

.file-card__action:disabled {
  color: var(--color-disabled-text);
  cursor: not-allowed;
}

/* 移动端：操作按钮换行铺满，避免横向溢出 */
@media (max-width: 480px) {
  .file-card {
    flex-wrap: wrap;
  }

  .file-card__actions {
    width: 100%;
  }

  .file-card__action {
    flex: 1;
    justify-content: center;
    height: 36px;
  }
}
</style>

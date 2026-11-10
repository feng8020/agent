<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import type { Attachment } from '@/types'
import { downloadFile, fetchFileBlob } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  /** 要预览的附件；为空表示不展示 */
  attachment: Attachment | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const toast = useToast()

const loading = ref(false)
const error = ref('')
/** 图片类型：blob 对象地址 */
const objectUrl = ref('')
/** 文本 / Markdown 类型：文本内容 */
const textContent = ref('')

const name = computed(() => props.attachment?.name ?? '')
const fileUrl = computed(() => props.attachment?.url ?? '')

const extension = computed(() => {
  const value = name.value
  const index = value.lastIndexOf('.')
  return index > -1 ? value.slice(index + 1).toLowerCase() : ''
})

type PreviewKind = 'image' | 'markdown' | 'text' | 'unsupported'

const TEXT_EXTENSIONS: readonly string[] = [
  'txt',
  'json',
  'csv',
  'log',
  'xml',
  'yml',
  'yaml',
  'js',
  'ts',
  'css',
  'html',
  'sql',
  'sh',
  'py',
  'java',
  'go'
]

/** 依据附件类型与扩展名判断预览方式 */
const kind = computed<PreviewKind>(() => {
  const item = props.attachment
  if (!item) return 'unsupported'
  if (item.type === 'image') return 'image'
  const ext = extension.value
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (TEXT_EXTENSIONS.includes(ext)) return 'text'
  return 'unsupported'
})

const releaseObjectUrl = (): void => {
  if (!objectUrl.value) return
  URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
}

const reset = (): void => {
  releaseObjectUrl()
  textContent.value = ''
  error.value = ''
  loading.value = false
}

/** 加载预览内容（图片取 blob，文本类取文本） */
const load = async (): Promise<void> => {
  reset()

  const item = props.attachment
  if (!item || !item.url) {
    error.value = '文件地址无效，无法预览'
    return
  }
  if (kind.value === 'unsupported') return

  loading.value = true
  try {
    const blob = await fetchFileBlob(item.url)
    if (kind.value === 'image') {
      objectUrl.value = URL.createObjectURL(blob)
    } else {
      textContent.value = await blob.text()
    }
  } catch {
    error.value = '预览加载失败，请重试或下载后查看'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.attachment?.id] as const,
  ([open]) => {
    if (open) void load()
    else reset()
  },
  { immediate: true }
)

const close = (): void => emit('close')

const handleDownload = async (): Promise<void> => {
  if (!fileUrl.value) {
    toast.error('文件地址无效，无法下载')
    return
  }
  await downloadFile(fileUrl.value, name.value)
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') close()
}

/** 当前是否由本弹窗锁定了页面滚动，避免误解除其它组件的锁定 */
let bodyLocked = false

const lockBody = (): void => {
  if (bodyLocked) return
  document.body.style.overflow = 'hidden'
  bodyLocked = true
}

const unlockBody = (): void => {
  if (!bodyLocked) return
  document.body.style.overflow = ''
  bodyLocked = false
}

watch(
  () => props.open,
  (value) => {
    if (value) {
      document.addEventListener('keydown', handleKeydown)
      lockBody()
    } else {
      document.removeEventListener('keydown', handleKeydown)
      unlockBody()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  unlockBody()
  releaseObjectUrl()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="file-preview">
      <div v-if="open" class="file-preview" role="dialog" aria-modal="true">
        <div class="file-preview__overlay" @click="close" />

        <div class="file-preview__dialog">
          <header class="file-preview__header">
            <div class="file-preview__title">
              <AppIcon name="file" :size="16" />
              <span class="file-preview__name" :title="name">{{ name || '文件预览' }}</span>
            </div>
            <button
              type="button"
              class="file-preview__close"
              title="关闭预览"
              aria-label="关闭预览"
              @click="close"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </header>

          <div class="file-preview__body">
            <!-- Loading -->
            <div v-if="loading" class="file-preview__state">
              <AppSpinner :size="20" />
              <span>正在加载预览…</span>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="file-preview__state is-error">
              <AppIcon name="warning" :size="22" :stroke-width="1.3" />
              <p class="file-preview__state-text">{{ error }}</p>
              <AppButton variant="secondary" size="sm" @click="load">重试</AppButton>
            </div>

            <!-- 不支持在线预览的类型 -->
            <div v-else-if="kind === 'unsupported'" class="file-preview__state">
              <AppIcon name="file" :size="22" :stroke-width="1.3" />
              <p class="file-preview__state-text">该文件类型暂不支持在线预览，请下载后查看</p>
            </div>

            <!-- 图片 -->
            <img
              v-else-if="kind === 'image' && objectUrl"
              class="file-preview__image"
              :src="objectUrl"
              :alt="name"
            />

            <!-- Markdown -->
            <MarkdownRenderer
              v-else-if="kind === 'markdown'"
              class="file-preview__markdown"
              :content="textContent"
            />

            <!-- 纯文本 -->
            <pre v-else class="file-preview__text">{{ textContent }}</pre>
          </div>

          <footer class="file-preview__footer">
            <AppButton variant="secondary" size="sm" @click="close">关闭</AppButton>
            <AppButton size="sm" @click="handleDownload">
              <template #icon>
                <AppIcon name="download" :size="14" />
              </template>
              下载
            </AppButton>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.file-preview {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.file-preview__overlay {
  position: absolute;
  inset: 0;
  background-color: var(--color-overlay);
}

.file-preview__dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: 84vh;
  overflow: hidden;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.file-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.file-preview__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-text-secondary);
}

.file-preview__name {
  overflow: hidden;
  font-size: var(--font-size-section);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-preview__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.file-preview__close:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.file-preview__body {
  flex: 1;
  min-height: 0;
  padding: var(--space-5);
  overflow: auto;
}

.file-preview__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 220px;
  color: var(--color-text-tertiary);
}

.file-preview__state.is-error {
  color: var(--color-error);
}

.file-preview__state-text {
  font-size: var(--font-size-caption);
  text-align: center;
}

.file-preview__image {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  margin: 0 auto;
  border-radius: var(--radius-lg);
  object-fit: contain;
}

.file-preview__markdown {
  width: 100%;
}

.file-preview__text {
  margin: 0;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code);
  line-height: var(--line-height-code);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.file-preview__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.file-preview-enter-active,
.file-preview-leave-active {
  transition: opacity 160ms var(--easing-standard);
}

.file-preview-enter-active .file-preview__dialog,
.file-preview-leave-active .file-preview__dialog {
  transition: transform 160ms var(--easing-standard);
}

.file-preview-enter-from,
.file-preview-leave-to {
  opacity: 0;
}

.file-preview-enter-from .file-preview__dialog,
.file-preview-leave-to .file-preview__dialog {
  transform: scale(0.96);
}

@media (max-width: 767px) {
  .file-preview {
    align-items: flex-end;
    padding: 0;
  }

  .file-preview__dialog {
    max-width: none;
    max-height: 88vh;
    border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;
  }
}
</style>

<script setup lang="ts">
/**
 * 代码产物块 —— 内联只读代码，超出 100 行时截断并提示
 *
 * 需求（products/artifact-render-product.md §5.3）：
 * - 内联展示上限 100 行；超出时显示「仅显示前 100 行（共 N 行）」
 * - 默认不触发下载，用户点击下载时才请求完整文件
 * - 视觉区再限高 + 内部滚动（100 行 × 24px = 2400px 会吞掉对话流）
 *
 * 为什么用文件地址拉取内容，而不是 /api/project/{id}/content：
 * 内容接口需要「相对会话工作区的 path」，而产物 DTO 只带文件名（不含目录），
 * 因此按产物自身的下载地址取文本，在前端截断行数（与 FilePreviewModal 同一条取数路径）。
 * 大小上限 2MB，超过直接提示下载，避免为看 100 行拉取超大文件。
 */
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import ArtifactShell from './ArtifactShell.vue'
import type { Attachment } from '@/types'
import {
  artifactLanguageLabel,
  MAX_INLINE_CODE_BYTES,
  MAX_INLINE_CODE_LINES
} from '@/utils/artifact'
import { copyText } from '@/utils/clipboard'
import { downloadAuthedFile, fetchFileBlob } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const toast = useToast()

const loading = ref(true)
const failed = ref(false)
/** 文件过大：与「加载失败」区分，提示改为下载查看 */
const tooLarge = ref(false)
const content = ref('')

const languageLabel = computed(() => artifactLanguageLabel(props.attachment))

const fileName = computed(() => props.attachment.name || '代码')

/** 行数：优先使用本次拉到的完整内容，否则退回后端预计算值 */
const totalLines = computed(() => {
  if (!content.value) return props.attachment.lineCount ?? 0
  return content.value.split('\n').length
})

const visibleContent = computed(() =>
  content.value ? content.value.split('\n').slice(0, MAX_INLINE_CODE_LINES).join('\n') : ''
)

const truncated = computed(() => totalLines.value > MAX_INLINE_CODE_LINES)

const isEmpty = computed(() => !loading.value && !failed.value && !content.value.trim())

const downloadTarget = computed(
  () => props.attachment.downloadUrl || props.attachment.url
)

const load = async (): Promise<void> => {
  tooLarge.value = false
  failed.value = false

  const url = props.attachment.url
  if (!url) {
    failed.value = true
    loading.value = false
    return
  }

  if ((props.attachment.size ?? 0) > MAX_INLINE_CODE_BYTES) {
    tooLarge.value = true
    failed.value = true
    loading.value = false
    return
  }

  loading.value = true
  try {
    const blob = await fetchFileBlob(url)
    if (blob.size > MAX_INLINE_CODE_BYTES) {
      tooLarge.value = true
      failed.value = true
      return
    }
    content.value = await blob.text()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

const handleCopy = async (): Promise<void> => {
  const ok = await copyText(content.value)
  if (ok) toast.success('已复制')
  else toast.error('复制失败，请重试')
}

const handleDownload = async (): Promise<void> => {
  if (!downloadTarget.value) {
    toast.error('文件地址无效，暂时无法下载')
    return
  }

  try {
    await downloadAuthedFile(downloadTarget.value, props.attachment.name)
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}

onMounted(load)
</script>

<template>
  <ArtifactShell :name="fileName" :kind-label="'代码'" icon="code" variant="dark">
    <template #actions>
      <span v-if="languageLabel" class="code-block__lang">{{ languageLabel }}</span>
      <button
        type="button"
        class="code-block__action"
        :disabled="loading || !content"
        aria-label="复制代码"
        @click="handleCopy"
      >
        复制
      </button>
      <button
        type="button"
        class="code-block__action"
        :disabled="!downloadTarget"
        aria-label="下载文件"
        @click="handleDownload"
      >
        下载
      </button>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="code-block__state">
      <AppSpinner :size="20" />
      <span>正在加载代码…</span>
    </div>

    <!-- Error -->
    <div v-else-if="failed" class="code-block__state is-error">
      <AppIcon name="warning" :size="14" class="code-block__warn" />
      <span>{{ tooLarge ? '文件过大，请下载后查看' : '代码加载失败' }}</span>
      <AppButton v-if="!tooLarge" variant="ghost" size="sm" @click="load">重试</AppButton>
    </div>

    <!-- Empty -->
    <div v-else-if="isEmpty" class="code-block__state">空文件</div>

    <!-- Code -->
    <template v-else>
      <pre class="code-block__pre" tabindex="0" :aria-label="`${fileName} 代码（前 100 行）`"><code class="code-block__code">{{ visibleContent }}</code></pre>

      <div v-if="truncated" class="code-block__truncated">
        <AppIcon name="warning" :size="12" class="code-block__truncated-icon" />
        <span>仅显示前 {{ MAX_INLINE_CODE_LINES }} 行（共 {{ totalLines }} 行）</span>
        <AppButton size="sm" variant="secondary" @click="handleDownload">下载完整文件</AppButton>
      </div>
    </template>
  </ArtifactShell>
</template>

<style scoped>
.code-block__lang {
  flex: none;
  font-family: var(--font-family-mono);
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.code-block__action {
  flex: none;
  padding: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: transparent;
  border: 0;
  transition: color var(--duration-fast) var(--easing-standard);
}

.code-block__action:hover:not(:disabled) {
  color: var(--color-code-text);
}

.code-block__action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.code-block__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 120px;
  font-size: var(--font-size-caption);
  color: var(--color-text-tertiary);
}

.code-block__state.is-error {
  min-height: 96px;
  color: var(--color-error);
}

.code-block__warn {
  color: var(--color-error);
}

.code-block__pre {
  margin: 0;
  padding: var(--space-4) var(--space-5);
  overflow: auto;
  max-height: var(--size-artifact-code-max-height);
}

.code-block__pre:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -2px;
}

.code-block__code {
  display: block;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code);
  line-height: var(--line-height-code);
  color: var(--color-code-text);
  white-space: pre;
}

.code-block__truncated {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 4px var(--space-3);
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-code-block-border);
}

.code-block__truncated-icon {
  flex: none;
  color: var(--color-warning);
}

.code-block__truncated :deep(.app-button) {
  margin-left: auto;
}

@media (max-width: 767px) {
  .code-block__pre {
    padding: var(--space-3) var(--space-4);
  }

  .code-block__code {
    font-size: 12px;
  }

  .code-block__truncated {
    flex-wrap: wrap;
  }
}
</style>

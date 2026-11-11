<script setup lang="ts">
/**
 * 前端项目产物块
 *
 * 完整项目的诉求是「先预览效果，再决定下载 ZIP」（需求 §5.4），
 * 所以主操作是「在右侧预览」，下载 ZIP 放 header 次要位置。
 *
 * 未构建（无 dist/index.html）时：不给预览入口，但**保留下载 ZIP**，
 * 并明确提示「尚未构建，暂不可预览」。
 *
 * 注：由逐文件产物聚合而来的「交付卡」没有独立 previewUrl（预览地址来自
 * 会话级探测），此时不显示「新窗口」按钮，避免点了报错。
 */
import { computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ArtifactShell from './ArtifactShell.vue'
import type { Attachment } from '@/types'
import { resolveProjectUrl, withToken } from '@/api/project'
import { canPreviewInPanel, zipFileName } from '@/utils/artifact'
import { downloadAuthedFile } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const emit = defineEmits<{ (e: 'preview'): void }>()

const toast = useToast()

const previewable = computed(() => canPreviewInPanel(props.attachment))

/** 交付卡没有独立 previewUrl，只有真实产物才可「新窗口打开」 */
const canOpenInNewWindow = computed(() => Boolean(props.attachment.previewUrl))

const downloadTarget = computed(
  () => props.attachment.downloadUrl || props.attachment.url
)

/** 新窗口打开：iframe / 新标签都无法带 Authorization 头，用 ?token= 鉴权 */
const openInNewWindow = (): void => {
  const url = props.attachment.previewUrl
  if (!url) return
  window.open(withToken(resolveProjectUrl(url)), '_blank', 'noopener')
}

const handleDownload = async (): Promise<void> => {
  if (!downloadTarget.value) {
    toast.error('暂无可下载的项目源码')
    return
  }

  try {
    // 交付卡名称是展示名（如「前端项目」），需补 .zip 才能正常解压
    await downloadAuthedFile(downloadTarget.value, zipFileName(props.attachment.name))
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}
</script>

<template>
  <ArtifactShell
    :name="attachment.name || '前端项目'"
    kind-label="前端项目"
    icon="file"
  >
    <template #actions>
      <AppButton
        size="sm"
        variant="secondary"
        aria-label="下载 ZIP"
        @click="handleDownload"
      >
        <template #icon>
          <AppIcon name="zip" :size="14" />
        </template>
        下载 ZIP
      </AppButton>
    </template>

    <div class="artifact-row">
      <template v-if="previewable">
        <span class="artifact-hint">可在线预览效果</span>
        <AppButton size="sm" @click="emit('preview')">在右侧预览</AppButton>
        <AppButton v-if="canOpenInNewWindow" size="sm" variant="ghost" @click="openInNewWindow">
          <template #icon>
            <AppIcon name="external" :size="14" />
          </template>
          新窗口
        </AppButton>
      </template>
      <template v-else>
        <AppIcon name="warning" :size="14" class="artifact-warn" />
        <span class="artifact-hint">尚未构建，暂不可预览</span>
      </template>
    </div>
  </ArtifactShell>
</template>

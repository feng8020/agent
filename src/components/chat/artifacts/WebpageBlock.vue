<script setup lang="ts">
/**
 * 网页产物块
 *
 * 网页不做「消息内 iframe」：右侧面板才是预览位（用户确认：右侧开小窗，占 30%+）。
 * 因此块内只给一个明确的预览入口 + 未构建时的降级提示。
 *
 * hasPreview=false 时**绝不显示预览入口**（需求 §9 业务规则 2/3），
 * 避免用户点了才报 404。
 */
import { computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ArtifactShell from './ArtifactShell.vue'
import type { Attachment } from '@/types'
import { canPreviewInPanel } from '@/utils/artifact'
import { downloadAuthedFile } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const emit = defineEmits<{ (e: 'preview'): void }>()

const toast = useToast()

const previewable = computed(() => canPreviewInPanel(props.attachment))

const downloadTarget = computed(
  () => props.attachment.downloadUrl || props.attachment.url
)

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
</script>

<template>
  <ArtifactShell
    :name="attachment.name || '网页'"
    kind-label="网页"
    icon="external"
  >
    <template #actions>
      <AppButton
        v-if="previewable"
        size="sm"
        variant="secondary"
        aria-label="在右侧预览"
        @click="emit('preview')"
      >
        <template #icon>
          <AppIcon name="external" :size="14" />
        </template>
        在右侧预览
      </AppButton>
    </template>

    <div class="artifact-row">
      <template v-if="previewable">
        <span class="artifact-hint">可直接在右侧查看页面效果</span>
      </template>
      <template v-else>
        <AppIcon name="warning" :size="14" class="artifact-warn" />
        <span class="artifact-hint">尚未构建，暂不可预览</span>
        <AppButton size="sm" variant="secondary" @click="handleDownload">下载文件</AppButton>
      </template>
    </div>
  </ArtifactShell>
</template>

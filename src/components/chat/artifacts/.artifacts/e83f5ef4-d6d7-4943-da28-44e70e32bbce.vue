<script setup lang="ts">
/**
 * 前后端完整项目产物块
 *
 * 需求 §5.6：前端可预览 + 后端信息 Tab + 一起打包下载。
 * 上半部分是前端预览入口，下半部分复用 BackendTabs，
 * header 放测试状态与下载 ZIP（打包内容同时包含前端与后端）。
 */
import { computed, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ArtifactShell from './ArtifactShell.vue'
import BackendTabs from './BackendTabs.vue'
import StatusBadge from './StatusBadge.vue'
import type { Attachment } from '@/types'
import { canPreviewInPanel, zipFileName } from '@/utils/artifact'
import { downloadAuthedFile } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const emit = defineEmits<{ (e: 'preview'): void }>()

const toast = useToast()

const testStatus = ref('untested')

const previewable = computed(() => canPreviewInPanel(props.attachment))

const downloadTarget = computed(
  () => props.attachment.downloadUrl || props.attachment.url
)

const handleStatus = (value: string): void => {
  testStatus.value = value
}

const handleDownload = async (): Promise<void> => {
  if (!downloadTarget.value) {
    toast.error('暂无可下载的项目源码')
    return
  }

  try {
    // 交付卡名称是展示名（如「前后端项目」），需补 .zip 才能正常解压
    await downloadAuthedFile(downloadTarget.value, zipFileName(props.attachment.name))
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}
</script>

<template>
  <ArtifactShell
    :name="attachment.name || '前后端项目'"
    kind-label="前后端项目"
    icon="file"
  >
    <template #actions>
      <StatusBadge :status="testStatus" />
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
        <span class="artifact-hint">可在线预览前端效果</span>
        <AppButton size="sm" @click="emit('preview')">在右侧预览</AppButton>
      </template>
      <template v-else>
        <AppIcon name="warning" :size="14" class="artifact-warn" />
        <span class="artifact-hint">前端尚未构建，暂不可预览</span>
      </template>
    </div>

    <div class="fullstack-block__divider" />

    <BackendTabs :conversation-id="attachment.conversationId" @status="handleStatus" />
  </ArtifactShell>
</template>

<style scoped>
.fullstack-block__divider {
  border-top: 1px solid var(--color-border);
}
</style>

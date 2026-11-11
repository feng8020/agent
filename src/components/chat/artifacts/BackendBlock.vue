<script setup lang="ts">
/**
 * 后端产物块
 *
 * 纯后端**不给网页式预览入口**（需求 §5.5）：
 * header = 测试状态 + 「下载源码」（会话级 ZIP），
 * 主体 = 4 个信息 Tab（API / 接口文档 / 测试结果 / 运行日志）。
 */
import { computed, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ArtifactShell from './ArtifactShell.vue'
import BackendTabs from './BackendTabs.vue'
import StatusBadge from './StatusBadge.vue'
import type { Attachment } from '@/types'
import { zipFileName } from '@/utils/artifact'
import { downloadAuthedFile } from '@/utils/file'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ attachment: Attachment }>()

const toast = useToast()

/** 测试状态由 BackendTabs 拉取后回传，避免重复请求 */
const testStatus = ref('untested')

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
    // 交付卡名称是展示名（如「后端服务」），需补 .zip 才能正常解压
    await downloadAuthedFile(downloadTarget.value, zipFileName(props.attachment.name))
    toast.success('已开始下载')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '下载失败，请重试')
  }
}
</script>

<template>
  <ArtifactShell
    :name="attachment.name || '后端服务'"
    kind-label="后端"
    icon="file"
  >
    <template #actions>
      <StatusBadge :status="testStatus" />
      <AppButton
        size="sm"
        variant="secondary"
        aria-label="下载源码"
        @click="handleDownload"
      >
        <template #icon>
          <AppIcon name="download" :size="14" />
        </template>
        下载源码
      </AppButton>
    </template>

    <BackendTabs :conversation-id="attachment.conversationId" @status="handleStatus" />
  </ArtifactShell>
</template>

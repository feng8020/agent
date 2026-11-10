/**
 * 会话项目交付（在线预览 / 下载源码）
 *
 * 职责：
 * - 查询当前会话的产出状态（是否可预览 / 可下载）
 * - 提供带令牌的预览地址与下载入口
 *
 * 预览用 <iframe> 打开、下载用 <a> 触发，二者都无法携带请求头，
 * 因此地址统一通过 `?token=` 传递鉴权信息（见 api/project）。
 *
 * 说明：这里只保留「交付能力探测」本身。原先用于 iframe 弹窗的
 * previewOpen / openPreview / closePreview 已被右侧预览面板取代，
 * 面板开关归 useArtifactPreview，避免两处各存一份开关状态。
 */
import { computed, ref } from 'vue'
import * as projectApi from '@/api/project'
import { downloadFile } from '@/utils/file'
import { isDraftConversationId } from '@/utils/conversation'
import { useToast } from '@/composables/useToast'
import type { ProjectStatus } from '@/types'

export const useProjectDelivery = () => {
  const toast = useToast()

  const status = ref<ProjectStatus | null>(null)

  /** 递增序号：会话快速切换时用于丢弃过期响应，避免状态错乱 */
  let requestSeq = 0

  /** 带令牌的预览地址 */
  const previewUrl = computed(() => {
    const raw = status.value?.previewUrl
    return raw ? projectApi.withToken(projectApi.resolveProjectUrl(raw)) : ''
  })

  /** 带令牌的下载地址（会话级源码 ZIP） */
  const downloadUrl = computed(() => {
    const raw = status.value?.downloadUrl
    return raw ? projectApi.withToken(projectApi.resolveProjectUrl(raw)) : ''
  })

  /** 是否显示「在线预览」按钮 */
  const canPreview = computed(() => Boolean(status.value?.hasPreview && previewUrl.value))

  /** 是否显示「下载源码」按钮 */
  const canDownload = computed(() => Boolean(status.value?.hasSource && downloadUrl.value))

  /** 清空状态（切换到本地草稿会话 / 未选中会话时） */
  const reset = (): void => {
    requestSeq += 1
    status.value = null
  }

  /**
   * 查询会话产出状态
   *
   * 属于「能力探测」：失败时静默清空（按钮不显示），
   * 不打断聊天主流程，也不弹出错误提示。
   */
  const refresh = async (conversationId: string | null): Promise<void> => {
    if (!conversationId || isDraftConversationId(conversationId)) {
      reset()
      return
    }

    const seq = (requestSeq += 1)
    try {
      const result = await projectApi.fetchProjectStatus(conversationId)
      if (seq !== requestSeq) return
      status.value = result
    } catch {
      if (seq === requestSeq) status.value = null
    }
  }

  const download = async (): Promise<void> => {
    if (!downloadUrl.value) {
      toast.error('暂无可下载的项目源码')
      return
    }
    const conversationId = status.value?.conversationId ?? ''
    await downloadFile(downloadUrl.value, `conversation-${conversationId}-source.zip`)
    toast.success('源码下载已开始')
  }

  return {
    previewUrl,
    downloadUrl,
    canPreview,
    canDownload,
    refresh,
    download
  }
}

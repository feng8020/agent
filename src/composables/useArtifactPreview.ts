/**
 * 产物预览面板状态（右侧 aside 的 artifact 模式）
 *
 * 为什么需要独立的 composable，而不是放进 store：
 * - 「在右侧预览」按钮在消息流深处（MessageItem → ArtifactRenderer → 各块），
 *   而面板挂在布局层（ChatView → ChatLayout 的 preview slot）。
 * - 这份状态只服务于当前会话页，没有跨页面共享需求，
 *   放进全局 store 只会让 store 变大、并让其他页面跟着做无用重算。
 *
 * 两条抑制规则（对应 ui/components/preview-panel.md §6）：
 * - seen：已出现过的产物 id。历史会话加载时先批量 markSeen，
 *   保证「打开旧会话不自动弹出面板」，只有新到达的产物才自动打开。
 * - dismissed：用户手动关闭过的产物 id。同一条产物不重复自动打开，
 *   出现新的产物 id 才允许再次自动打开。
 *
 * 两者都只在内部使用，不对外暴露，避免调用方绕过规则。
 */
import { ref, type Ref } from 'vue'
import type { Attachment } from '@/types'

export interface UseArtifactPreviewResult {
  /** 面板是否展开（artifact 模式） */
  open: Ref<boolean>
  /** 当前展示的产物 */
  active: Ref<Attachment | null>
  /** 批量标记为已出现（不打开面板，用于历史会话） */
  markSeen: (ids: string[]) => void
  /** 打开并展示指定产物（用户主动点击） */
  show: (attachment: Attachment) => void
  /** 自动打开（会跳过被用户关闭过的产物） */
  autoShow: (attachment: Attachment) => void
  /** 关闭面板（记录 dismissed，便于抑制重复自动打开） */
  hide: () => void
  /** 会话切换时重置全部状态 */
  reset: () => void
}

export const useArtifactPreview = (): UseArtifactPreviewResult => {
  const open = ref(false)
  const active = ref<Attachment | null>(null)

  /** 用数组而不是 Set：Set 的增删在 Vue 3.2 里需要手动触发更新 */
  const seen = ref<string[]>([])
  const dismissed = ref<string[]>([])

  const markSeen = (ids: string[]): void => {
    const next = ids.filter((id) => Boolean(id) && !seen.value.includes(id))
    if (next.length === 0) return
    seen.value = [...seen.value, ...next]
  }

  const show = (attachment: Attachment): void => {
    active.value = attachment
    if (!seen.value.includes(attachment.id)) {
      seen.value = [...seen.value, attachment.id]
    }
    open.value = true
  }

  const autoShow = (attachment: Attachment): void => {
    if (dismissed.value.includes(attachment.id)) return
    show(attachment)
  }

  const hide = (): void => {
    const current = active.value
    if (current && !dismissed.value.includes(current.id)) {
      dismissed.value = [...dismissed.value, current.id]
    }
    open.value = false
    active.value = null
  }

  const reset = (): void => {
    open.value = false
    active.value = null
    seen.value = []
    dismissed.value = []
  }

  return { open, active, markSeen, show, autoShow, hide, reset }
}

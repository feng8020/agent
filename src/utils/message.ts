/**
 * 消息工具 —— 与「消息」相关的纯逻辑
 *
 * 这些函数不需要任何响应式状态，之前放在 chat store 里会把 store 撑大，
 * 抽出来后 store 只负责状态与副作用，纯规则集中在这里便于单独验证。
 */
import type { Attachment, Message } from '@/types'
import type { StreamFileArtifact } from '@/api/message'

/**
 * 判断两条 AI 消息是否为同一条
 *
 * 流式结束后需要从服务端同步「AI 生成的文件」（附件兜底），
 * 但本地消息使用前端生成的 id，服务端使用自己的 id，二者无法直接比对，
 * 因此以「内容是否一致」作为匹配依据（允许尾随空白 / 截断等轻微差异）。
 */
export const isSameMessageContent = (a: string, b: string): boolean => {
  const left = a.trim()
  const right = b.trim()
  if (!left || !right) return false
  if (left === right) return true

  const length = Math.min(left.length, right.length)
  return length >= 40 && left.slice(0, length) === right.slice(0, length)
}

/** 向上查找最近一条用户消息内容（重新生成时作为 prompt） */
export const findPreviousUserContent = (list: Message[], fromIndex: number): string => {
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    if (list[i].role === 'user') return list[i].content
  }

  return ''
}

/**
 * SSE artifact 事件 → 消息附件
 *
 * 必须把后端下发的 kind / previewKind / language / lineCount /
 * hasPreview / hasBackend / downloadUrl 一并带过去，
 * 否则产物会被当成「无法识别类型」退回普通文件卡片。
 */
export const streamFileToAttachment = (file: StreamFileArtifact): Attachment => ({
  id: file.id,
  conversationId: file.conversationId,
  type: file.type,
  name: file.name,
  url: file.url,
  previewUrl: file.previewUrl,
  size: file.size,
  created_at: file.created_at,
  kind: file.kind,
  previewKind: file.previewKind,
  language: file.language,
  lineCount: file.lineCount,
  hasPreview: file.hasPreview,
  hasBackend: file.hasBackend,
  downloadUrl: file.downloadUrl
})

/**
 * 在服务端消息列表中，为本地 AI 消息找到对应的附件
 *
 * 用于「SSE 未下发 artifact」时的兜底同步：按内容一致匹配到服务端那条
 * 带附件的助手消息，返回它的附件；找不到时返回 null。
 */
export const findSyncedAttachments = (
  list: Message[],
  content: string
): Attachment[] | null => {
  const matched = list.find(
    (item) =>
      item.role === 'assistant' &&
      item.attachments.length > 0 &&
      isSameMessageContent(item.content, content)
  )

  return matched ? matched.attachments : null
}

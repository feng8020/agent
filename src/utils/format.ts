/**
 * 格式化工具
 */
import type { Conversation, ConversationGroup } from '@/types'

/** 文件大小格式化：1536 -> 1.5 KB */
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/** 取用户名首字母作为头像占位（UI §17 avatar-default） */
export const getInitial = (name?: string): string => {
  if (!name) return 'U'
  const trimmed = name.trim()
  if (!trimmed) return 'U'
  return trimmed.charAt(0).toUpperCase()
}

/** 判断是否同一天 */
const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * 按更新时间分组：今天 / 昨天 / 更早（UI §6.3、§8.1）
 */
export const groupConversations = (conversations: Conversation[]): ConversationGroup[] => {
  const today: Conversation[] = []
  const yesterday: Conversation[] = []
  const earlier: Conversation[] = []

  const now = new Date()
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 按 updated_at 倒序（产品书 §13 聊天记录按时间管理）
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  sorted.forEach((item) => {
    const date = new Date(item.updated_at)
    if (isSameDay(date, now)) {
      today.push(item)
    } else if (isSameDay(date, yesterdayDate)) {
      yesterday.push(item)
    } else {
      earlier.push(item)
    }
  })

  const groups: ConversationGroup[] = []
  if (today.length) groups.push({ label: '今天', items: today })
  if (yesterday.length) groups.push({ label: '昨天', items: yesterday })
  if (earlier.length) groups.push({ label: '更早', items: earlier })
  return groups
}

/** 由首条用户消息生成会话标题（产品书未规定，取前 20 字符） */
export const buildConversationTitle = (content: string): string => {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (!clean) return '新对话'
  return clean.length > 20 ? `${clean.slice(0, 20)}…` : clean
}

/** 简单防抖 */
export const debounce = <T extends (...args: never[]) => void>(fn: T, wait = 300): T => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<T>): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(undefined, args), wait)
  }
  return debounced as T
}

/**
 * 会话管理接口（产品书 §9.2、§13 聊天历史）
 *
 * 后端返回的会话 id 为 number，这里统一归一化为 string 后再进入应用层，
 * 保证前端内部 id 类型一致（详见 request.normalizeId）。
 */
import type { ApiResponse, Conversation, ConversationListResult, CreateConversation } from '@/types'
import { http, normalizeId } from './request'

/** 后端会话 → 前端会话（统一 id / user_id 为 string） */
const normalizeConversation = (raw: Conversation): Conversation => ({
  id: normalizeId(raw.id),
  user_id: normalizeId(raw.user_id),
  title: raw.title || '新对话',
  created_at: raw.created_at || '',
  updated_at: raw.updated_at || ''
})

/** 获取会话列表（按更新时间倒序） */
export const listConversations = async (): Promise<ConversationListResult> => {
  const { data } = await http.get<ApiResponse<ConversationListResult>>('/chat/list/conversations')
  const result = data.data
  return {
    ...result,
    list: (result.list ?? []).map(normalizeConversation)
  }
}

/** 新建会话 */
export const createConversation = async (): Promise<CreateConversation> => {
  const { data } = await http.post<ApiResponse<CreateConversation>>('/chat/conversation')
  return {
    id: normalizeId(data.data.id),
    title: data.data.title || '新对话'
  }
}

/** 重命名会话 */
export const renameConversation = async (id: string, title: string): Promise<Conversation> => {
  const { data } = await http.patch<Conversation>(`/conversations/${id}`, { title })
  return normalizeConversation(data)
}

/** 删除会话 */
export const deleteConversation = async (id: string): Promise<void> => {
  await http.delete(`/conversations/${id}`)
}

/**
 * 搜索会话
 * TODO(待确认)：产品书 §12 第 8 条 —— 匹配范围（仅标题 / 含消息内容）待需求方确认。
 * 当前按「标题包含关键词」实现。
 */
export const searchConversations = async (keyword: string): Promise<Conversation[]> => {
  const trimmed = keyword.trim()
  if (!trimmed) {
    const result = await listConversations()
    return result.list
  }

  const { data } = await http.get<Conversation[]>('/conversations', {
    params: { keyword: trimmed }
  })
  return data.map(normalizeConversation)
}

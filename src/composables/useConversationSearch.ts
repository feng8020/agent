/**
 * 会话搜索（侧边栏搜索框）
 *
 * 为什么不做成 store：搜索关键词只服务侧边栏这一个视图，
 * 没有任何跨页面共享需求。放进全局 store 会让每次输入都触发
 * 全应用响应式更新（聊天区、头部、面板都会跟着重算），毫无必要。
 * 因此这里做成「视图级 composable」：状态随 ChatView 生命周期存在。
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { Conversation, ConversationGroup } from '@/types'
import { groupConversations } from '@/utils/format'

export interface UseConversationSearchResult {
  /** 搜索关键词（侧边栏输入框） */
  keyword: Ref<string>
  /** 过滤后按时间分组的结果（今天 / 昨天 / 更早） */
  groups: ComputedRef<ConversationGroup[]>
  setKeyword: (value: string) => void
}

/**
 * @param source 会话来源。传 getter 而不是 ref：
 *               Pinia setup store 暴露的 state 已被自动解包，
 *               传 `() => chat.conversations` 才能保持响应式。
 */
export const useConversationSearch = (
  source: () => Conversation[]
): UseConversationSearchResult => {
  const keyword = ref('')

  const filtered = computed<Conversation[]>(() => {
    const kw = keyword.value.trim().toLowerCase()
    const list = source()
    if (!kw) return list

    // TODO(待确认)：产品书 §12 第 8 条 —— 搜索匹配范围（当前按标题匹配）
    return list.filter((item) => item.title.toLowerCase().includes(kw))
  })

  const groups = computed<ConversationGroup[]>(() => groupConversations(filtered.value))

  const setKeyword = (value: string): void => {
    keyword.value = value
  }

  return { keyword, groups, setKeyword }
}

/**
 * 聊天 store —— 产品书 §7、§9.2、§9.3、§13
 *
 * 只在 store 里保留「跨视图共享 + 需要跨组件协调」的状态：
 *   - 会话列表 / 当前会话 / 消息列表 / 生成中状态
 *   - 与之配套的加载与错误状态
 *
 * 明确**不放在这里**的东西（避免 store 膨胀）：
 *   - 侧边栏搜索关键词与过滤分组 → composables/useConversationSearch（视图局部状态）
 *   - 右侧预览面板开关 / 当前产物 → composables/useArtifactPreview（视图局部状态）
 *   - 项目交付状态（能否预览 / 下载） → composables/useProjectDelivery
 *   - 纯函数（内容比对 / 上一条用户消息 / 草稿 id 判定） → utils/message、utils/conversation
 *
 * 「新建聊天」约定：点击后只在本地插入一条空白会话并选中（不调用任何接口），
 * 直到用户发出第一条消息时才真正写入服务端。
 *
 * 文件产物：流式接口的 artifact 事件会把「本轮 Agent 真实生成的文件」
 * 追加到对应助手消息的附件列表上，并保留后端下发的 kind 等渲染字段，
 * 由 ArtifactRenderer 按类型渲染（前端=在线预览 / 后端=压缩包）。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as conversationApi from '@/api/conversation'
import * as messageApi from '@/api/message'
import type { StreamFileArtifact } from '@/api/message'
import { getErrorMessage, isAbortError } from '@/api/request'
import type { Conversation, Message, PendingAttachment } from '@/types'
import { createDraftConversationId, isDraftConversationId } from '@/utils/conversation'
import {
  findPreviousUserContent,
  findSyncedAttachments,
  streamFileToAttachment
} from '@/utils/message'
import { useToast } from '@/composables/useToast'

export const useChatStore = defineStore('chat', () => {
  const toast = useToast()

  /* ---------------- state ---------------- */
  const conversations = ref<Conversation[]>([])
  const currentId = ref<string | null>(null)
  const messages = ref<Message[]>([])

  const listLoading = ref(false)
  const listError = ref<string | null>(null)
  const messagesLoading = ref(false)
  const messagesError = ref<string | null>(null)

  /** 正在流式生成的 AI 消息 id */
  const generatingId = ref<string | null>(null)

  /** 当前流的取消句柄（非响应式，不需要进 state） */
  let abortController: AbortController | null = null

  /** 进行中的会话落库请求（并发上传/发送时复用同一请求，避免重复创建会话） */
  let persistTask: Promise<string | null> | null = null

  /* ---------------- getters ---------------- */
  const isGenerating = computed(() => generatingId.value !== null)

  /** 内部使用：当前会话对象（对外只暴露标题，避免外部直接依赖该对象） */
  const currentConversation = computed<Conversation | null>(
    () => conversations.value.find((item) => item.id === currentId.value) ?? null
  )

  const currentTitle = computed(() => currentConversation.value?.title ?? '新对话')

  /* ---------------- actions：会话 ---------------- */

  const loadConversations = async (): Promise<void> => {
    listLoading.value = true
    listError.value = null
    try {
      conversations.value = (await conversationApi.listConversations()).list
    } catch (error) {
      listError.value = getErrorMessage(error)
    } finally {
      listLoading.value = false
    }
  }

  /**
   * 本地新建聊天（不调用接口）
   *
   * 立即插入一条空白会话并选中，直接展示欢迎态；
   * 若当前已存在未发送内容的空白会话则复用它，避免列表堆积多个「新对话」。
   */
  const startNewConversation = (): void => {
    const draft = conversations.value.find((item) => isDraftConversationId(item.id))

    if (draft) {
      currentId.value = draft.id
    } else {
      const timestamp = new Date().toISOString()
      const created: Conversation = {
        id: createDraftConversationId(),
        user_id: '',
        title: '新对话',
        created_at: timestamp,
        updated_at: timestamp
      }
      conversations.value = [created, ...conversations.value]
      currentId.value = created.id
    }

    messages.value = []
    messagesError.value = null
    messagesLoading.value = false
  }

  /**
   * 确保当前会话已写入服务端，并返回其 id
   *
   * 调用方（必须保持对外暴露）：
   *   - Composer：上传附件前要先拿到真实 conversationId
   *     （附件接口路径是 /chat/conversations/:conversationId/files，
   *      草稿 id 后端无法解析，会直接 400）
   *   - sendMessage：发送第一条消息前落库
   *
   * 并发调用（如同时上传多个附件）会复用同一个创建请求，避免重复建会话。
   */
  const persistCurrentConversation = async (): Promise<string | null> => {
    const id = currentId.value
    if (id && !isDraftConversationId(id)) return id
    if (persistTask) return persistTask

    persistTask = (async (): Promise<string | null> => {
      try {
        const created = await conversationApi.createConversation()
        // 服务端仅返回 id / title，这里补全为完整会话结构
        const timestamp = new Date().toISOString()
        const conversation: Conversation = {
          id: created.id,
          user_id: '',
          title: created.title || '新对话',
          created_at: timestamp,
          updated_at: timestamp
        }

        const index = conversations.value.findIndex((item) => item.id === id)
        if (index > -1) conversations.value[index] = { ...conversations.value[index], ...conversation }
        else conversations.value = [conversation, ...conversations.value]

        currentId.value = conversation.id
        return conversation.id
      } catch (error) {
        toast.error(getErrorMessage(error))
        return null
      } finally {
        persistTask = null
      }
    })()

    return persistTask
  }

  const loadMessages = async (conversationId: string): Promise<void> => {
    messagesLoading.value = true
    messagesError.value = null
    messages.value = []
    try {
      const list = await messageApi.listMessages(conversationId)
      // 兜底：只接受数组，避免异常响应结构被当成消息列表渲染
      messages.value = Array.isArray(list) ? list : []
    } catch (error) {
      messagesError.value = getErrorMessage(error)
    } finally {
      messagesLoading.value = false
    }
  }

  /** 打开某个会话（相同会话重复点击不重复请求；本地新建的空白会话无历史消息） */
  const selectConversation = async (conversationId: string): Promise<void> => {
    if (isDraftConversationId(conversationId)) {
      currentId.value = conversationId
      messages.value = []
      messagesError.value = null
      messagesLoading.value = false
      return
    }

    if (currentId.value === conversationId && messages.value.length > 0) return
    currentId.value = conversationId
    await loadMessages(conversationId)
  }

  const renameConversation = async (conversationId: string, title: string): Promise<boolean> => {
    const index = conversations.value.findIndex((item) => item.id === conversationId)
    if (index === -1) return false

    // 本地新建的空白会话：仅改本地标题，不调用接口
    if (isDraftConversationId(conversationId)) {
      conversations.value[index] = { ...conversations.value[index], title }
      toast.success('已重命名')
      return true
    }

    try {
      const updated = await conversationApi.renameConversation(conversationId, title)
      conversations.value[index] = updated
      toast.success('已重命名')
      return true
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
    }
  }

  const removeConversation = async (conversationId: string): Promise<void> => {
    /** 从本地列表移除，并在删除的是当前会话时切换到最近一个（无则回到空态） */
    const removeLocal = async (): Promise<void> => {
      conversations.value = conversations.value.filter((item) => item.id !== conversationId)

      if (currentId.value !== conversationId) return

      const next = conversations.value[0]
      if (next) await selectConversation(next.id)
      else {
        currentId.value = null
        messages.value = []
      }
    }

    // 本地新建的空白会话没有服务端记录，直接本地移除
    if (isDraftConversationId(conversationId)) {
      await removeLocal()
      return
    }

    try {
      await conversationApi.deleteConversation(conversationId)
      await removeLocal()
      toast.success('已删除')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /* ---------------- actions：消息 ---------------- */

  /**
   * 把 SSE 下发的文件产物追加到对应消息的附件列表
   *
   * 按文件 id 去重，避免重复的 file 事件产生重复卡片；
   * 只追加到「当前正在生成的那条消息」上，避免不同会话之间文件串台。
   */
  const appendAttachment = (messageId: string, file: StreamFileArtifact): void => {
    const target = messages.value.find((item) => item.id === messageId)
    if (!target) return

    const attachments = Array.isArray(target.attachments) ? target.attachments : []
    if (attachments.some((item) => item.id === file.id)) {
      target.attachments = attachments
      return
    }

    target.attachments = [...attachments, streamFileToAttachment(file)]
  }

  /** 发送消息：用户消息立即上屏 → 流式获取 AI 回复 */
  const sendMessage = async (
    content: string,
    attachments: PendingAttachment[]
  ): Promise<void> => {
    if (isGenerating.value) return

    // 本地新建的空白会话在此刻落地（没有会话时才创建）
    const conversationId = await persistCurrentConversation()
    if (!conversationId) return

    let userMessage: Message
    let assistantMessage: Message

    try {
      const result = await messageApi.sendMessage({ conversationId, content, attachments })
      userMessage = result.userMessage
      assistantMessage = result.assistantMessage

      const index = conversations.value.findIndex((item) => item.id === result.conversation.id)
      if (index > -1) {
        const current = conversations.value[index]
        // 已重命名的会话保留原标题，默认标题时才采用首条消息生成的新标题
        const title = current.title && current.title !== '新对话' ? current.title : result.conversation.title
        conversations.value[index] = { ...current, ...result.conversation, title }
      }
      // 让当前会话排到最前
      conversations.value = [...conversations.value].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
      return
    }

    messages.value.push(userMessage, assistantMessage)
    // 注意：第一个参数必须是「AI 占位消息的 id」，用于定位写入流式内容的目标消息
    await runStream(assistantMessage.id, content, attachments)
  }

  /**
   * 流式完成后，从服务端同步「AI 生成的文件」（附件兜底）
   *
   * 正常情况下文件已由 SSE 的 artifact 事件即时上屏，这里仅作为兜底：
   * 若事件缺失（网络中断 / 旧版本后端），重新拉取消息列表，
   * 按「内容一致」匹配到服务端对应的 AI 消息并回填其附件。
   * 只做「补全附件」，不改动已生成的内容，失败时静默忽略。
   */
  const syncGeneratedAttachments = async (assistantMessageId: string): Promise<void> => {
    const target = messages.value.find((item) => item.id === assistantMessageId)
    if (!target || target.role !== 'assistant') return
    // 已有附件（事件已上屏 / 重新生成 / 打开历史会话）时无需同步
    if (target.attachments.length > 0) return

    const conversationId = target.conversationId
    if (!conversationId) return

    const content = target.content
    if (!content.trim()) return

    try {
      const list = await messageApi.listMessages(conversationId)
      const synced = findSyncedAttachments(list, content)
      if (!synced) return

      // 回填前再次确认目标消息仍是当前会话中的同一条（避免会话切换后错写）
      const current = messages.value.find((item) => item.id === assistantMessageId)
      if (!current || current.attachments.length > 0) return
      current.attachments = synced
    } catch {
      // 同步失败不影响主流程；附件会在重新进入会话时由 listMessages 正常返回
    }
  }

  /**
   * 流式生成：写入 assistantMessageId 对应消息的 content，结束后更新 status
   *
   * @param assistantMessageId 目标 AI 消息 id
   * @param prompt 本次请求的提示内容
   * @param attachments 本次消息附带的附件（已上传成功）
   */
  const runStream = async (
    assistantMessageId: string,
    prompt: string,
    attachments: PendingAttachment[] = []
  ): Promise<void> => {
    const target = messages.value.find((item) => item.id === assistantMessageId)
    if (!target) return

    target.content = ''
    target.status = 'streaming'
    generatingId.value = assistantMessageId
    abortController = new AbortController()

    try {
      const result = await messageApi.streamReply({
        prompt,
        conversationId: target.conversationId,
        attachments,
        signal: abortController.signal,
        onChunk: (_delta, fullText) => {
          target.content = fullText
        },
        // 本轮真实生成的文件：立即挂到当前助手消息下方
        onFile: (file) => {
          appendAttachment(assistantMessageId, file)
        }
      })
      target.status = result.status === 'stopped' ? 'stopped' : 'done'
    } catch (error) {
      if (isAbortError(error)) {
        // 用户主动停止：保留已生成内容（产品书 §10）
        target.status = 'stopped'
      } else {
        target.status = 'failed'
        toast.error(getErrorMessage(error))
      }
    } finally {
      generatingId.value = null
      abortController = null
    }

    // 生成完成后同步 AI 生成的文件（附件），作为 artifact 事件缺失时的兜底
    if (target.status === 'done') void syncGeneratedAttachments(assistantMessageId)
  }

  /** 停止生成（产品书 §9.3） */
  const stopGeneration = (): void => {
    if (abortController) abortController.abort()
  }

  /** 重新生成 AI 回复（产品书 §9.4） */
  const regenerate = async (assistantMessageId: string): Promise<void> => {
    if (isGenerating.value) return

    const index = messages.value.findIndex((item) => item.id === assistantMessageId)
    if (index < 1) return

    const prompt = findPreviousUserContent(messages.value, index)
    if (!prompt) return

    // 重新生成前清空旧附件，避免新旧文件卡片混杂
    messages.value[index].attachments = []

    await runStream(assistantMessageId, prompt)
  }

  /**
   * 编辑已发送的用户消息并重新生成
   * TODO(待确认)：产品书 §12 第 16 条 —— 编辑后是否清除后续消息未定义。
   * 当前实现：保留到被编辑消息为止，删除其后的消息并重新请求 AI。
   */
  const editUserMessage = async (messageId: string, content: string): Promise<void> => {
    if (isGenerating.value) return

    const index = messages.value.findIndex((item) => item.id === messageId)
    if (index === -1) return

    const conversationId = messages.value[index].conversationId

    try {
      const updated = await messageApi.updateMessage(messageId, content)
      messages.value[index] = { ...messages.value[index], content: updated.content }

      await messageApi.deleteMessagesAfter(conversationId, messageId)
      messages.value.splice(index + 1)

      const assistantMessage = await messageApi.createAssistantMessage(conversationId)
      messages.value.push(assistantMessage)

      await runStream(assistantMessage.id, content)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /** 重新发送用户消息（内容不变，重新请求 AI） */
  const resendUserMessage = async (messageId: string): Promise<void> => {
    if (isGenerating.value) return

    const index = messages.value.findIndex((item) => item.id === messageId)
    if (index === -1) return

    const conversationId = messages.value[index].conversationId
    const content = messages.value[index].content

    try {
      await messageApi.deleteMessagesAfter(conversationId, messageId)
      messages.value.splice(index + 1)

      const assistantMessage = await messageApi.createAssistantMessage(conversationId)
      messages.value.push(assistantMessage)

      await runStream(assistantMessage.id, content)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /** 退出登录时清空状态 */
  const reset = (): void => {
    if (abortController) abortController.abort()
    abortController = null
    persistTask = null
    generatingId.value = null
    conversations.value = []
    currentId.value = null
    messages.value = []
    listLoading.value = false
    listError.value = null
    messagesLoading.value = false
    messagesError.value = null
  }

  return {
    // state
    conversations,
    currentId,
    messages,
    listLoading,
    listError,
    messagesLoading,
    messagesError,
    generatingId,
    // getters
    isGenerating,
    currentTitle,
    // actions
    loadConversations,
    startNewConversation,
    // 必须暴露：Composer 上传附件前要拿真实 conversationId
    persistCurrentConversation,
    loadMessages,
    selectConversation,
    renameConversation,
    removeConversation,
    sendMessage,
    stopGeneration,
    regenerate,
    editUserMessage,
    resendUserMessage,
    reset
  }
})

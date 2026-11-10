/**
 * 会话 id 工具 —— 本地草稿会话的统一判定
 *
 * 背景：点击「新建聊天」只在前端插入一条空白会话，不调用接口，
 * 直到用户发出第一条消息才真正落库。这类会话的 id 带 `draft_` 前缀，
 * 任何「要不要请求后端」的判断都必须与这里保持一致。
 *
 * 之前 `stores/chat.ts`、`api/artifact.ts`、`composables/useProjectDelivery.ts`
 * 各自写了一份前缀判断，共享后只保留这里一份，避免再次分叉。
 */

/** 本地新建会话的 id 前缀：仅存在于前端，尚未写入服务端 */
export const DRAFT_CONVERSATION_PREFIX = 'draft_'

/** 判断是否为本地新建、尚未写入服务端的会话 */
export const isDraftConversationId = (id: string | null | undefined): boolean =>
  Boolean(id && id.startsWith(DRAFT_CONVERSATION_PREFIX))

/** 生成一条本地草稿会话 id */
export const createDraftConversationId = (): string =>
  `${DRAFT_CONVERSATION_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

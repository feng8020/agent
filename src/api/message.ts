/**
 * 消息接口（产品书 §9.3）
 *
 * 发送消息 → 用户消息 + AI 占位消息；AI 内容通过 streamReply 流式返回。
 * 流式回复接口：POST /chat/stream，请求体为 { message }（接口保持不变）。
 *
 * 响应解析说明（真实接口兼容）：
 * 后端可能返回「裸数据」或「统一包装」两种结构（如 { code, msg, data }）。
 * 所有解析统一经过 unwrapPayload + 归一化函数，保证进入应用层的消息一定是
 * 结构合法的 Message，避免包装对象被当成消息列表渲染出幽灵气泡。
 *
 * 附件字段命名说明（重要）：
 *   历史消息接口 GET /chat/conversations/{id}/messages 返回的附件字段名是 `files`，
 *   而 SSE 流式事件与前端内部统一使用 `attachments`。
 *   归一化时两者都识别（见 pickAttachmentList），
 *   否则「打开历史会话」时附件恒为空 —— 表现为历史消息里没有文件卡片。
 *
 * 产物渲染字段说明（重要）：
 *   后端在产物上新增 kind / previewKind / language / lineCount /
 *   hasPreview / hasBackend / downloadUrl（见 backend/API-artifact-render.md）。
 *   这些是「按类型渲染」的唯一依据，**必须原样透传**到应用层：
 *   在此处漏掉任何一项，SSE 与历史消息两条通道的产物都会退化成普通文件卡片。
 *
 * SSE 事件协议（与后端实际实现一致）：
 *
 *   event: message
 *   data: {"text":"文件"}                       ← 普通 AI 文本增量，累加到 message.content
 *
 *   event: artifact
 *   data: {"id":"22","messageId":231,"name":"8.txt",
 *          "type":"text/plain; charset=utf-8","size":37,
 *          "url":"/api/chat/files/22/download",
 *          "kind":"code","previewKind":"code","language":"text",
 *          "lineCount":12,"hasPreview":false,"hasBackend":false} ← 文件产物
 *
 *   event: error
 *   data: <错误信息>                             ← 抛错，不写入正文
 *
 *   event: done
 *   data: {"status":"done","conversationId":"7"} ← 本轮结束
 *
 * 兼容策略：
 *   - 事件名同时接受 `artifact` 与 `file`（历史客户端/后端命名）；
 *   - 无事件名的裸 data 按普通文本处理；
 *   - 未识别的事件类型一律丢弃，绝不混入聊天正文。
 */
import type {
  ArtifactKind,
  Attachment,
  AttachmentType,
  Conversation,
  Message,
  MessageStatus,
  PendingAttachment,
  PreviewKind
} from '@/types'
import { API_BASE_URL, createApiError, http, normalizeId } from './request'
import { getToken } from '@/utils/session'

export interface SendMessagePayload {
  conversationId: string
  content: string
  attachments: PendingAttachment[]
}

export interface SendMessageResult {
  userMessage: Message
  assistantMessage: Message
  conversation: Conversation
}

/** 前端本地消息 id（真实接口下由前端生成，用于列表渲染与流式定位） */
const createLocalId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/**
 * 会话 id 归一化为后端接口期望的类型（number）
 *
 * 前端内部统一以 string 作为 id 契约（便于本地草稿 id、路由参数、URL 拼接），
 * 但后端 /chat/stream、/messages/assistant 等接口要求 conversationId 为 int。
 * 这里在提交前把纯数字 id 显式转成 number，避免后端收到字符串导致类型校验失败。
 * 若 id 非纯数字（如本地草稿 id），保留原值不做破坏性转换。
 */
const toRequestId = (id: string): number | string => {
  const trimmed = id.trim()
  if (!trimmed) return id
  return /^\d+$/.test(trimmed) ? Number(trimmed) : id
}

/** 用首条消息生成会话标题 */
const buildTitle = (content: string): string => {
  const text = content.replace(/\s+/g, ' ').trim()
  if (!text) return '新对话'
  return text.length > 20 ? `${text.slice(0, 20)}…` : text
}

/** 取文件名扩展名（小写，不含点） */
const extOf = (name: string): string => {
  const value = name || ''
  const index = value.lastIndexOf('.')
  return index > -1 ? value.slice(index + 1).toLowerCase() : ''
}

/** 图片扩展名（MIME 缺失时兜底判断） */
const IMAGE_EXTENSIONS: readonly string[] = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'
]

/**
 * 推断附件类型
 *
 * 后端下发的 `type` 是 MIME（例如 "text/plain; charset=utf-8"），
 * 这里把 image/* 识别为 image，其余归为 file；MIME 缺失时用扩展名兜底。
 * 更细的格式区分（文本 / 代码 / 表格 / 压缩包 / 图片 / PDF / 文档 / 音视频）
 * 由卡片组件按扩展名 + MIME 决定（见 @/utils/fileType）。
 */
const resolveAttachmentType = (rawType: unknown, name: string): AttachmentType => {
  const value = typeof rawType === 'string' ? rawType.trim().toLowerCase() : ''

  if (value === 'image' || value.startsWith('image/')) return 'image'
  if (IMAGE_EXTENSIONS.includes(extOf(name))) return 'image'

  return 'file'
}

/** 合法的产物交付形态白名单（后端给什么就用什么，不猜） */
const ARTIFACT_KINDS: readonly string[] = [
  'webpage', 'image', 'code', 'project', 'backend', 'fullstack'
]

/** 合法的预览方式白名单 */
const PREVIEW_KINDS: readonly string[] = ['iframe', 'image', 'code', 'zip', 'none']

const toArtifactKind = (value: unknown): ArtifactKind | undefined => {
  const kind = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return ARTIFACT_KINDS.includes(kind) ? (kind as ArtifactKind) : undefined
}

const toPreviewKind = (value: unknown): PreviewKind | undefined => {
  const kind = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return PREVIEW_KINDS.includes(kind) ? (kind as PreviewKind) : undefined
}

/**
 * 从后端产物对象中抽取渲染字段
 *
 * 统一在这里取，保证 SSE 事件与历史消息两条通道字段一致。
 */
const pickArtifactMeta = (record: Record<string, unknown>): Pick<
  Attachment,
  'kind' | 'previewKind' | 'language' | 'lineCount' | 'hasPreview' | 'hasBackend' | 'downloadUrl'
> => ({
  kind: toArtifactKind(record.kind),
  previewKind: toPreviewKind(record.previewKind),
  language: typeof record.language === 'string' ? record.language : undefined,
  lineCount: typeof record.lineCount === 'number' ? record.lineCount : undefined,
  hasPreview: record.hasPreview === true,
  hasBackend: record.hasBackend === true,
  downloadUrl: typeof record.downloadUrl === 'string' ? record.downloadUrl : undefined
})

/**
 * 待发送附件 → 消息附件
 *
 * 附件 id 优先使用「上传接口返回的服务端文件 id（fileId）」，只有未拿到 fileId
 * （本地新建、后端未返回）时才退回本地临时 uid，保证上屏的用户消息附件与服务端
 * 已存储的文件一一对应。
 *
 * 用户上传的文件没有产物渲染字段（kind 等），因此按普通文件卡片展示。
 */
const toAttachments = (
  conversationId: string,
  attachments: PendingAttachment[],
  createdAt: string
): Attachment[] =>
  attachments.map((item) => ({
    id: item.fileId ? String(item.fileId) : item.uid,
    conversationId: conversationId,
    type: item.type,
    name: item.name,
    url: item.url ?? '',
    size: item.size,
    created_at: createdAt
  }))

/* ---------------- 响应解析 ---------------- */

/**
 * 解包响应体
 *
 * - 裸数据（数组 / 消息对象）：原样返回
 * - 统一包装（{ code, msg, data }）：返回其中的 data
 */
const unwrapPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const record = payload as Record<string, unknown>
  return 'data' in record ? record.data : payload
}

/** 从响应中取出列表（兼容裸数组与 { list } / { messages } 等分页包装） */
const toArrayList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  const keys = ['list', 'messages', 'records', 'items', 'rows']
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return []
}

const MESSAGE_STATUSES: readonly string[] = ['sending', 'streaming', 'done', 'stopped', 'failed']

/** 归一化消息状态：历史消息默认视为已完成，避免误显示「正在思考」 */
const normalizeStatus = (value: unknown): MessageStatus => {
  const status = typeof value === 'string' ? value : ''
  return MESSAGE_STATUSES.includes(status) ? (status as MessageStatus) : 'done'
}

/** 归一化单条附件（兼容 id / fileId / file_id / uid 多种 id 字段命名） */
const normalizeAttachment = (raw: unknown, conversationId: string): Attachment | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const record = raw as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name : '附件'
  const messageId = record.messageId ?? record.message_id

  return {
    id: normalizeId(record.id ?? record.fileId ?? record.file_id ?? record.uid),
    message_id: messageId ? normalizeId(messageId) : undefined,
    conversationId,
    type: resolveAttachmentType(record.type, name),
    name,
    url: typeof record.url === 'string' ? record.url : '',
    previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
    size: typeof record.size === 'number' ? record.size : undefined,
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
    ...pickArtifactMeta(record)
  }
}

/**
 * 取出消息的附件数组
 *
 * 历史消息接口返回的字段名是 `files`（见文件头说明），
 * 流式事件与前端内部使用 `attachments`，这里两者都兼容，
 * 并额外兼容 fileList / file_list 两种常见命名。
 *
 * 取值策略：优先返回「第一个非空数组」，都为空时返回第一个空数组，
 * 避免 `attachments: []` 遮蔽掉真正有数据的 `files`。
 */
const pickAttachmentList = (record: Record<string, unknown>): unknown[] => {
  const keys = ['attachments', 'files', 'fileList', 'file_list']

  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value) && value.length > 0) return value
  }

  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }

  return []
}

/**
 * 归一化单条消息
 *
 * 解析不出合法对象时返回 null，由调用方过滤掉，
 * 保证渲染层拿到的永远是具备渲染所需字段的 Message。
 */
const normalizeMessage = (
  raw: unknown,
  conversationId: string,
  index = 0
): Message | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const record = raw as Record<string, unknown>
  const content =
    typeof record.content === 'string'
      ? record.content
      : typeof record.message === 'string'
        ? record.message
        : ''

  const attachments: Attachment[] = pickAttachmentList(record)
    .map((item) => normalizeAttachment(item, conversationId))
    .filter((item): item is Attachment => item !== null)

  const id = normalizeId(record.id ?? record.messageId ?? record.message_id)

  return {
    id: id || `msg_${index}`,
    conversationId: normalizeId(record.conversationId ?? record.conversation_id) || conversationId,
    role: record.role === 'user' ? 'user' : 'assistant',
    content,
    status: normalizeStatus(record.status),
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
    attachments
  }
}

/** 归一化消息列表：结构异常时退化为空列表（宁可显示空态，也不渲染幽灵气泡） */
const toMessageList = (payload: unknown, conversationId: string): Message[] => {
  const list = toArrayList(unwrapPayload(payload))
  return list
    .map((item, index) => normalizeMessage(item, conversationId, index))
    .filter((item): item is Message => item !== null)
}

/**
 * 发送消息：用户消息 + AI 占位消息
 *
 * 后端未提供「创建消息」接口，先在前端生成两条消息（乐观上屏），
 * AI 内容随后由 /chat/stream 流式返回
 */
export const sendMessage = async (payload: SendMessagePayload): Promise<SendMessageResult> => {
  const createdAt = new Date().toISOString()

  const conversation: Conversation = {
    id: payload.conversationId,
    user_id: '',
    title: buildTitle(payload.content),
    created_at: createdAt,
    updated_at: createdAt
  }

  const userMessage: Message = {
    id: createLocalId('msg'),
    conversationId: payload.conversationId,
    role: 'user',
    content: payload.content,
    status: 'done',
    created_at: createdAt,
    attachments: toAttachments(payload.conversationId, payload.attachments, createdAt)
  }

  const assistantMessage: Message = {
    id: createLocalId('msg'),
    conversationId: payload.conversationId,
    role: 'assistant',
    content: '',
    status: 'streaming',
    created_at: createdAt,
    attachments: []
  }

  return { userMessage, assistantMessage, conversation }
}

/**
 * 打开会话：获取历史消息列表（无历史消息时返回空数组）
 *
 * 历史消息里的文件产物字段名为 `files`，经 normalizeMessage 归一化后
 * 统一挂到 message.attachments，并保留 kind 等渲染字段。
 */
export const listMessages = async (conversationId: string): Promise<Message[]> => {
  const { data } = await http.get<unknown>(`/chat/conversations/${conversationId}/messages`)
  return toMessageList(data, conversationId)
}

/** 单独创建一条 AI 占位消息（编辑用户消息后重新生成使用） */
export const createAssistantMessage = async (conversationId: string): Promise<Message> => {
  const { data } = await http.post<unknown>('/messages/assistant', {
    conversationId: toRequestId(conversationId)
  })

  const message = normalizeMessage(unwrapPayload(data), conversationId)
  // 新建的占位消息一定处于流式生成状态
  if (message) return { ...message, status: 'streaming' }

  // 后端未返回可用结构时退回本地占位消息，保证流式生成仍可继续
  return {
    id: createLocalId('msg'),
    conversationId,
    role: 'assistant',
    content: '',
    status: 'streaming',
    created_at: new Date().toISOString(),
    attachments: []
  }
}

/** SSE artifact 事件下发的文件产物 */
export interface StreamFileArtifact {
  id: string
  conversationId: string
  type: AttachmentType
  name: string
  /** 下载地址（返回真实文件字节） */
  url: string
  /** 预览地址（后端未提供时为空，此时预览回退用 url） */
  previewUrl: string
  size?: number
  created_at: string

  /** 产物交付形态（后端判定） */
  kind?: ArtifactKind
  /** 预览方式 */
  previewKind?: PreviewKind
  /** 代码语言标识 */
  language?: string
  /** 代码总行数 */
  lineCount?: number
  /** 是否真的可预览 */
  hasPreview?: boolean
  /** 是否含后端工程 */
  hasBackend?: boolean
  /** 工程级下载地址（ZIP） */
  downloadUrl?: string
}

export interface StreamReplyOptions {
  /** 本次请求的提示内容（编辑 / 重新生成时为对应文本） */
  prompt: string
  /** 所属会话 id（随消息一并提交，供后端归档） */
  conversationId: string
  /** 本次消息携带的附件（已上传成功、含服务端返回的 fileId 与 url） */
  attachments?: PendingAttachment[]
  signal: AbortSignal
  onChunk: (delta: string, fullText: string) => void
  /** 本轮 Agent 真实生成的文件（来自 SSE 的 artifact 事件） */
  onFile?: (file: StreamFileArtifact) => void
}

export interface StreamReplyResult {
  status: 'done' | 'stopped'
  content: string
}

/** 上传成功的附件 → 提交给后端的结构 */
interface StreamAttachment {
  /** 服务端返回的文件 id（fileId，int），后端据此关联已上传文件 */
  fileId: number
  type: string
  name: string
  url: string
  size: number
}

/**
 * 已上传成功的附件 → 提交给后端的结构
 *
 * 后端以「上传接口返回的 fileId」关联已存储文件，并不一定会回传可访问 url
 * （例如上传 .txt 时只返回 { fileId, originalName, size }）。
 * 因此这里以 fileId 作为判断依据，只要上传成功且有 fileId（或 url）就提交，
 * 不能强制要求附件必须带 url，否则「上传成功但无 url」的附件会被整体丢弃，
 * 导致 /chat/stream 的 attachments 恒为空、后端永远收不到 fileId。
 *
 * fileId 为后端返回的 int，这里原样以 number 提交（不做 String 转换），
 * 避免后端收到字符串导致类型校验失败。
 */
const toStreamAttachments = (attachments?: PendingAttachment[]): StreamAttachment[] =>
  (attachments ?? [])
    .filter((item) => item.status === 'success' && Boolean(item.fileId || item.url))
    .map((item) => ({
      fileId: item.fileId ?? 0,
      type: item.type,
      name: item.name,
      url: item.url ?? '',
      size: item.size
    }))

/**
 * 从 JSON 分片中取出增量文本
 *
 * 本项目的 message 事件为 { "text": "..." }；
 * 同时兼容其它常见结构：
 * - OpenAI 风格：{ choices: [{ delta: { content } }] }
 * - 扁平字段：{ content } / { delta } / { answer } / { output } / { result } / { reply }
 * - 包一层 data：{ code: 0, data: { content } }
 */
const pickDeltaFromJson = (parsed: unknown): string => {
  if (typeof parsed === 'string') return parsed
  if (!parsed || typeof parsed !== 'object') return ''

  const record = parsed as Record<string, unknown>

  const choices = record.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | null
    if (first) {
      const delta = first.delta as Record<string, unknown> | undefined
      if (delta && typeof delta.content === 'string') return delta.content
      const message = first.message as Record<string, unknown> | undefined
      if (message && typeof message.content === 'string') return message.content
      if (typeof first.text === 'string') return first.text
    }
  }

  // text 优先（本项目 message 事件即 { text }）
  const keys = ['text', 'content', 'delta', 'answer', 'output', 'result', 'reply', 'message']
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const nested = pickDeltaFromJson(value)
      if (nested) return nested
    }
  }

  const data = record.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const nested = pickDeltaFromJson(data)
    if (nested) return nested
  }

  return ''
}

/**
 * 解析普通文本帧的负载
 *
 * 兼容「纯文本增量」与「JSON 增量（{"text":"..."} / {"content":"..."}）」两种实现：
 * 纯文本直接返回，避免形如 "123" 的内容被当成 JSON 解析后丢失。
 */
const resolveTextPayload = (payload: string): string => {
  const trimmed = payload.trim()
  if (!trimmed) return ''

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return payload

  try {
    const parsed = JSON.parse(trimmed) as unknown
    return pickDeltaFromJson(parsed)
  } catch {
    return payload
  }
}

/**
 * 归一化 SSE artifact 事件负载
 *
 * 后端结构：{ id, messageId, name, type(MIME), size, url, kind, previewKind, ... }
 * 没有 id 或没有可访问地址的事件直接丢弃（不伪造文件卡片）。
 */
const normalizeFileArtifact = (
  raw: unknown,
  conversationId: string
): StreamFileArtifact | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const record = raw as Record<string, unknown>
  const id = normalizeId(record.id ?? record.fileId ?? record.file_id)
  const url = typeof record.url === 'string' ? record.url : ''

  if (!id || !url) return null

  const name =
    typeof record.name === 'string' && record.name ? record.name : '文件'

  return {
    id,
    conversationId:
      normalizeId(record.conversationId ?? record.conversation_id) || conversationId,
    type: resolveAttachmentType(record.type, name),
    name,
    url,
    previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
    size: typeof record.size === 'number' ? record.size : undefined,
    created_at:
      typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
    ...pickArtifactMeta(record)
  }
}

/**
 * 流式获取 AI 回复：POST /chat/stream
 *
 * 请求体携带 message（保持既有契约）+ conversationId 与 attachments，
 * 让后端能够收到「哪个会话、带哪些已上传文件」的消息。
 * attachments 中每一项都携带上传接口返回的 fileId（int），供后端关联已存储的文件；
 * fileId 以 number 原样提交，不做字符串化，避免后端类型校验失败。
 * 其中 conversationId 会通过 toRequestId 转成后端要求的 number（int），
 * 避免前端内部的 string id 直接透传导致后端类型校验失败。
 * 相对 API_BASE_URL（默认 /api）请求，开发环境由 vite proxy 转发到后端服务。
 * 停止生成通过 AbortController 触发：中止后保留已生成内容并标记为「已停止」（产品书 §10）
 */
export const streamReply = async (options: StreamReplyOptions): Promise<StreamReplyResult> => {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    signal: options.signal,
    body: JSON.stringify({
      message: options.prompt,
      conversationId: toRequestId(options.conversationId),
      attachments: toStreamAttachments(options.attachments)
    })
  })

  if (!response.ok || !response.body) {
    throw createApiError('AI 回复失败，请重试', response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  let accumulated = ''
  let ended = false
  let errorMessage = ''

  // 当前 SSE 帧：event 名 + 若干 data 行
  let frameEvent = ''
  let frameData: string[] = []

  const appendText = (text: string): void => {
    accumulated += text
    options.onChunk(text, accumulated)
  }

  /** 派发一个完整的 SSE 帧 */
  const dispatchFrame = (): void => {
    const event = frameEvent
    const data = frameData.join('\n')
    frameEvent = ''
    frameData = []

    if (!data) return

    // ① 文件产物：后端只在「文件真实落盘并校验成功」后才下发，绝不混入正文
    //    事件名同时接受 artifact 与 file（兼容两种命名）
    if (event === 'artifact' || event === 'file') {
      try {
        const parsed = JSON.parse(data) as unknown
        const artifact = normalizeFileArtifact(parsed, options.conversationId)
        if (artifact) options.onFile?.(artifact)
      } catch {
        // 非法文件事件：忽略，避免污染聊天正文
      }
      return
    }

    // ② 错误事件：记录并终止，不作为 AI 文本展示
    if (event === 'error') {
      errorMessage = data
      ended = true
      return
    }

    // ③ 结束事件
    if (event === 'done' || data.trim() === '[DONE]' || data.trim() === 'DONE') {
      ended = true
      return
    }

    // ④ 普通文本：event: message，或历史后端的无事件名裸 data
    if (event === '' || event === 'message') {
      const text = resolveTextPayload(data)
      if (text) appendText(text)
      return
    }

    // ⑤ 其它未知事件（工具日志 / ADK 元数据等）：一律丢弃，绝不写进聊天正文
  }

  /** 处理一行流数据（符合 SSE 规范 + 兼容 NDJSON / 纯文本流） */
  const consumeLine = (line: string, hasEol: boolean): void => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line

    // 空行 = 一个事件结束
    if (normalized === '') {
      dispatchFrame()
      return
    }
    // 注释行
    if (normalized.startsWith(':')) return
    if (normalized.startsWith('event:')) {
      frameEvent = normalized.slice(6).trim()
      return
    }
    if (normalized.startsWith('data:')) {
      frameData.push(normalized.slice(5).replace(/^\s/, ''))
      return
    }
    if (normalized.startsWith('id:') || normalized.startsWith('retry:')) return

    // 非 SSE 规范行：兼容 NDJSON / 纯文本流
    if (frameEvent === '' && frameData.length === 0) {
      appendText(hasEol ? `${line}\n` : line)
    }
  }

  while (!ended) {
    const { done, value } = await reader.read()
    if (done) break

    // stream: true —— 保证中文等多字节字符跨 chunk 时不被截断
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      consumeLine(line, true)
      if (ended) break
    }
  }

  // 流结束：冲掉解码器与最后一段（后端结尾可能没有换行）
  buffer += decoder.decode()
  if (!ended && buffer) consumeLine(buffer, false)
  if (!ended) dispatchFrame()

  try {
    await reader.cancel()
  } catch {
    // 忽略取消异常
  }

  // 后端通过 error 事件报错：抛出统一的 ApiError，由上层标记为「生成失败」并提示
  if (errorMessage) {
    throw createApiError(errorMessage, 'STREAM_ERROR')
  }

  return { status: 'done', content: accumulated }
}

/** 编辑已发送的用户消息（产品书 §9.3） */
export const updateMessage = async (messageId: string, content: string): Promise<Message> => {
  const { data } = await http.patch<unknown>(`/messages/${messageId}`, { content })

  const message = normalizeMessage(unwrapPayload(data), '')
  // 后端未回传完整消息时用本次提交内容兜底，保证界面与提交内容一致
  if (message) return { ...message, content: message.content || content }

  return {
    id: messageId,
    conversationId: '',
    role: 'user',
    content,
    status: 'done',
    created_at: new Date().toISOString(),
    attachments: []
  }
}

/** 删除某条消息之后的所有消息（编辑后重新生成使用） */
export const deleteMessagesAfter = async (
  conversationId: string,
  messageId: string
): Promise<void> => {
  await http.delete(`/conversations/${conversationId}/messages`, {
    params: { after: messageId }
  })
}

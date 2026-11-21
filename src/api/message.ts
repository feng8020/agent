/**
 * 消息接口（产品书 §9.3）
 *
 * 发送消息 → 用户消息 + AI 占位消息；AI 内容通过 streamReply 流式返回。
 *
 * ── 任务化改造（对应 backend/API-run.md）────────────────────────────
 *
 * 后端已把「Agent 执行」与「HTTP 请求」解耦：
 *   - POST /chat/stream 创建任务，SSE **首帧** 下发 `event: started {runId, messageId}`；
 *   - 该会话已有任务在跑时返回 409 + data.runId，**不启动新 Agent**；
 *   - GET  /chat/run/{runId}/events?lastEventId=N 断点续传；
 *   - POST /chat/run/{runId}/stop 真正取消任务。
 *
 * 因此前端不再用「abort() 断开连接」当成停止（那样后端任务会继续跑）。
 *
 * ── 一个必须说明的限制 ────────────────────────────────────────────
 *
 * 后端 `service.WriteSSE` 只写 `event:` 与 `data:`，**没有写 `id:` 行**，
 * 所以前端无法从 SSE 帧里读到事件 ID、不能自己推进游标。
 *
 * 应对方式：每次重连前先调 `fetchActiveRun` 拿快照（已有 content + lastEventId），
 * 再按该 lastEventId 续传。这样即使没有帧内 ID，也能做到不重复、不遗漏。
 *
 * ── 附件与产物字段（保持不变）──────────────────────────────────────
 *
 * 历史消息接口返回的附件字段名是 `files`，SSE 与前端内部使用 `attachments`，
 * 归一化时两者都识别（见 pickAttachmentList）。
 * 产物渲染字段 kind / previewKind / language / lineCount / hasPreview /
 * hasBackend / downloadUrl 必须原样透传，否则产物会退化成普通文件卡片。
 *
 * ── SSE 事件协议（与后端实际实现一致）──────────────────────────────
 *
 *   event: started
 *   data: {"runId":"7f3a...","messageId":"231"}     ← 建任务回执（新增首帧）
 *
 *   event: message
 *   data: {"text":"文件"}                            ← 文本增量
 *
 *   event: artifact
 *   data: {"id":"22","name":"8.txt",...}             ← 文件产物
 *
 *   event: error
 *   data: {"message":"..."}                          ← 抛错，不写入正文
 *
 *   event: done
 *   data: {"runId":"7f3a...","status":"succeeded"}    ← 任务终态
 *
 * 兼容策略：事件名同时接受 `artifact` 与 `file`；未识别的事件一律丢弃。
 */
import type {
  ActiveRunSnapshot,
  ApiResponse,
  ArtifactKind,
  Attachment,
  AttachmentType,
  Conversation,
  Message,
  MessageStatus,
  PendingAttachment,
  PreviewKind,
  RunStatus
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
 * 但后端接口要求 conversationId 为 int。这里在提交前把纯数字 id 显式转成 number，
 * 避免后端收到字符串导致类型校验失败。非纯数字（如本地草稿 id）保留原值。
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

/** 推断附件类型（image / file） */
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

/** 合法的任务状态白名单 */
const RUN_STATUSES: readonly string[] = [
  'running', 'succeeded', 'failed', 'cancelled', 'interrupted'
]

const toArtifactKind = (value: unknown): ArtifactKind | undefined => {
  const kind = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return ARTIFACT_KINDS.includes(kind) ? (kind as ArtifactKind) : undefined
}

const toPreviewKind = (value: unknown): PreviewKind | undefined => {
  const kind = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return PREVIEW_KINDS.includes(kind) ? (kind as PreviewKind) : undefined
}

const toRunStatus = (value: unknown): RunStatus | '' => {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return RUN_STATUSES.includes(status) ? (status as RunStatus) : ''
}

/** 从后端产物对象中抽取渲染字段（SSE 与历史消息两条通道共用） */
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

/** 待发送附件 → 消息附件（用户上传的文件没有产物字段，按普通卡片展示） */
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
 * 历史消息接口返回的字段名是 `files`，流式事件与前端内部使用 `attachments`，
 * 这里两者都兼容，并额外兼容 fileList / file_list。
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

/** 归一化单条消息；解析不出合法对象时返回 null，由调用方过滤 */
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
 * AI 内容随后由 /chat/stream 流式返回。
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

/** 打开会话：获取历史消息列表（含 status，刷新后可识别「仍在生成中」的消息） */
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
  if (message) return { ...message, status: 'streaming' }

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

/** `event: started` 首帧负载 */
export interface RunStartedPayload {
  runId: string
  messageId: string
}

export interface StreamReplyOptions {
  /** 本次请求的提示内容 */
  prompt: string
  /** 所属会话 id */
  conversationId: string
  /** 本次消息携带的附件 */
  attachments?: PendingAttachment[]
  signal: AbortSignal
  onChunk: (delta: string, fullText: string) => void
  /** 本轮 Agent 真实生成的文件（来自 SSE 的 artifact 事件） */
  onFile?: (file: StreamFileArtifact) => void
  /** 建任务回执：拿到 runId 后才能调 stop（需求二.3） */
  onStarted?: (payload: RunStartedPayload) => void
}

export interface StreamReplyResult {
  /**
   * done     ：流正常结束
   * stopped  ：本地中断（切换会话 / 退出登录）
   * conflict ：该会话已有任务在跑，未启动新 Agent（需求五.7）
   */
  status: 'done' | 'stopped' | 'conflict'
  content: string
  /** conflict 时返回已存在任务的 runId */
  runId?: string
  /** done 时后端下发的任务终态（succeeded / failed / cancelled / interrupted） */
  runStatus?: string
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
 * 后端以 fileId 关联文件，不一定会回传 url（如上传 .txt 只返回
 * { fileId, originalName, size }）。因此只要上传成功且有 fileId 或 url 就提交，
 * 不能强制要求带 url，否则附件会被整体丢弃、后端永远收不到 fileId。
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

/** 从 JSON 分片中取出增量文本（兼容 OpenAI 风格与多种扁平字段） */
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

/** 解析普通文本帧的负载（纯文本 / JSON 增量两种实现都兼容） */
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

/** 归一化 SSE artifact 事件负载（没有 id 或没有地址的直接丢弃，不伪造卡片） */
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

/** 从 done 帧中取任务终态 */
const pickRunStatusFromDone = (data: string): string => {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>
    return typeof parsed.status === 'string' ? parsed.status : ''
  } catch {
    return ''
  }
}

/* ---------------- SSE 消费（建任务 / 续传共用） ---------------- */

interface SseHandlers {
  conversationId: string
  onChunk: (delta: string, fullText: string) => void
  onFile?: (file: StreamFileArtifact) => void
  onStarted?: (payload: RunStartedPayload) => void
  onDone?: (status: string) => void
}

interface SseConsumeResult {
  content: string
  errorMessage: string
}

/**
 * 消费一个 SSE 响应流
 *
 * 建任务（POST）与断点续传（GET）共用这一份解析逻辑，
 * 避免两处协议解析出现偏差。
 */
const consumeSse = async (
  response: Response,
  handlers: SseHandlers
): Promise<SseConsumeResult> => {
  const body = response.body
  if (!body) return { content: '', errorMessage: 'AI 回复失败，请重试' }

  const reader = body.getReader()
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
    handlers.onChunk(text, accumulated)
  }

  /** 派发一个完整的 SSE 帧 */
  const dispatchFrame = (): void => {
    const event = frameEvent
    const data = frameData.join('\n')
    frameEvent = ''
    frameData = []

    if (!data) return

    // ⓪ 建任务回执：拿到 runId（旧后端没有这一帧，忽略即可）
    if (event === 'started') {
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>
        handlers.onStarted?.({
          runId: normalizeId(parsed.runId),
          messageId: normalizeId(parsed.messageId)
        })
      } catch {
        // 解析失败不影响后续流
      }
      return
    }

    // ① 文件产物：后端只在文件真实落盘并校验成功后才下发
    //    事件名同时接受 artifact 与 file
    if (event === 'artifact' || event === 'file') {
      try {
        const parsed = JSON.parse(data) as unknown
        const artifact = normalizeFileArtifact(parsed, handlers.conversationId)
        if (artifact) handlers.onFile?.(artifact)
      } catch {
        // 非法文件事件：忽略，避免污染聊天正文
      }
      return
    }

    // ② 错误事件：记录并终止
    if (event === 'error') {
      errorMessage = data
      ended = true
      return
    }

    // ③ 结束事件（新增 status：任务终态）
    if (event === 'done' || data.trim() === '[DONE]' || data.trim() === 'DONE') {
      if (event === 'done') handlers.onDone?.(pickRunStatusFromDone(data))
      ended = true
      return
    }

    // ④ 普通文本：event: message，或无事件名的裸 data
    if (event === '' || event === 'message') {
      const text = resolveTextPayload(data)
      if (text) appendText(text)
      return
    }

    // ⑤ 其它未知事件：一律丢弃，绝不写进聊天正文
  }

  /** 处理一行流数据（符合 SSE 规范 + 兼容 NDJSON / 纯文本流） */
  const consumeLine = (line: string, hasEol: boolean): void => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line

    if (normalized === '') {
      dispatchFrame()
      return
    }
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

  return { content: accumulated, errorMessage }
}

/**
 * 流式获取 AI 回复：POST /chat/stream（创建任务）
 *
 * - 首帧 `event: started` 会带回 runId（onStarted 回调），停止时必须用它；
 * - 该会话已有任务在跑时后端返回 409，这里**不抛错**，而是返回 conflict +
 *   已有 runId，由上层转为订阅（避免重发消息导致重复执行）。
 */
export const streamReply = async (
  options: StreamReplyOptions
): Promise<StreamReplyResult> => {
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

  // 409：该会话已有任务在跑 → 不启动新 Agent，交给上层转订阅
  if (response.status === 409) {
    let runId = ''

    try {
      const payload = (await response.json()) as {
        data?: { runId?: unknown }
      }
      runId = normalizeId(payload?.data?.runId)
    } catch {
      runId = ''
    }

    return { status: 'conflict', content: '', runId }
  }

  if (!response.ok || !response.body) {
    throw createApiError('AI 回复失败，请重试', response.status)
  }

  let runStatus = ''

  const result = await consumeSse(response, {
    conversationId: options.conversationId,
    onChunk: options.onChunk,
    onFile: options.onFile,
    onStarted: options.onStarted,
    onDone: (status) => {
      runStatus = status
    }
  })

  // 后端通过 error 事件报错：抛出统一 ApiError，由上层标记「生成失败」并提示
  if (result.errorMessage) {
    throw createApiError(result.errorMessage, 'STREAM_ERROR')
  }

  return { status: 'done', content: result.content, runStatus }
}

/* ---------------- 任务恢复与停止 ---------------- */

interface RawActiveRun {
  conversationId?: unknown
  runId?: unknown
  status?: unknown
  messageId?: unknown
  lastEventId?: unknown
  content?: unknown
}

/**
 * 查询会话当前的活动任务
 *
 * 页面初始化 / 刷新 / 切换会话时调用：
 * 有 runId 就去续传事件流，**不要重新发送消息**（需求五.2）。
 */
export const fetchActiveRun = async (
  conversationId: string
): Promise<ActiveRunSnapshot> => {
  const { data } = await http.get<ApiResponse<RawActiveRun>>(
    `/chat/conversations/${encodeURIComponent(conversationId)}/active-run`
  )

  const payload: RawActiveRun = data?.data ?? {}

  return {
    conversationId,
    runId: normalizeId(payload.runId),
    status: toRunStatus(payload.status),
    messageId: normalizeId(payload.messageId),
    lastEventId: typeof payload.lastEventId === 'number' ? payload.lastEventId : 0,
    content: typeof payload.content === 'string' ? payload.content : ''
  }
}

export interface ResumeRunOptions {
  runId: string
  /** 用于归一化产物里的 conversationId（续传事件的 artifact 可能不带该字段） */
  conversationId: string
  /** 已渲染到的最大事件 id；0 表示从头回放 */
  lastEventId: number
  signal?: AbortSignal
  onChunk: (delta: string, fullText: string) => void
  onFile?: (file: StreamFileArtifact) => void
  onDone?: (status: string) => void
}

/**
 * 断点续传任务事件：GET /chat/run/{runId}/events?lastEventId=N
 *
 * 注意：`onChunk` 的 fullText 只包含 **lastEventId 之后** 的增量，
 * 调用方需要把它拼在快照 content 之后。
 *
 * 返回任务终态（来自 done 帧）；流被本地中断时抛出取消错误。
 */
export const resumeRunEvents = async (options: ResumeRunOptions): Promise<string> => {
  const token = getToken()
  const query = options.lastEventId > 0 ? `?lastEventId=${options.lastEventId}` : ''
  const url = `${API_BASE_URL}/chat/run/${encodeURIComponent(options.runId)}/events${query}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    signal: options.signal
  })

  if (!response.ok || !response.body) {
    throw createApiError('恢复任务失败', response.status)
  }

  let runStatus = ''

  const result = await consumeSse(response, {
    conversationId: options.conversationId,
    onChunk: options.onChunk,
    onFile: options.onFile,
    onDone: (status) => {
      runStatus = status
    }
  })

  if (result.errorMessage) {
    throw createApiError(result.errorMessage, 'STREAM_ERROR')
  }

  return runStatus
}

/**
 * 停止任务：POST /chat/run/{runId}/stop
 *
 * 必须走这个接口真正取消后端任务；
 * 仅前端 abort 只是断开事件流，后端任务会继续跑（需求二.8 明确禁止）。
 */
export const stopRun = async (runId: string): Promise<void> => {
  await http.post(`/chat/run/${encodeURIComponent(runId)}/stop`)
}

/** 编辑已发送的用户消息（产品书 §9.3） */
export const updateMessage = async (messageId: string, content: string): Promise<Message> => {
  const { data } = await http.patch<unknown>(`/messages/${messageId}`, { content })

  const message = normalizeMessage(unwrapPayload(data), '')
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

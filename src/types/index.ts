/**
 * 领域模型类型 —— 对应产品需求说明书 §8 数据需求
 */

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/**
 * 消息状态（产品书 §8.3）
 * sending   发送中
 * streaming 流式生成中
 * done      完成
 * stopped   已停止
 * failed    失败
 */
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'stopped' | 'failed'

/** 附件类型 */
export type AttachmentType = 'image' | 'file'

/**
 * 产物交付形态（由后端判定，前端不得用扩展名猜测）
 *
 * 对应 products/artifact-render-product.md §4：
 * webpage   网页（有可直接托管的构建产物，无工程标识）
 * image     图片
 * code      代码 / 文本
 * project   前端工程（有 dist 可预览 + 工程源码）
 * backend   后端工程（无前端可预览产物）
 * fullstack 前后端完整项目
 */
export type ArtifactKind = 'webpage' | 'image' | 'code' | 'project' | 'backend' | 'fullstack'

/** 产物预览方式 */
export type PreviewKind = 'iframe' | 'image' | 'code' | 'zip' | 'none'

/** 主题偏好（产品书 §7.6） */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 实际生效的主题 */
export type ResolvedTheme = 'light' | 'dark'

/** 附件上传状态 */
export type UploadStatus = 'uploading' | 'success' | 'error'

/** 用户 */
export interface User {
  id: string
  username: string
  email: string
  /** 昵称 / 显示名（产品书 §8.1） */
  nickname: string
  /** 主题偏好 */
  theme: ThemeMode
  created_at: string
  updated_at: string
}

/** 登录入参：仅用户名 + 密码 */
export interface LoginPayload {
  username: string
  password: string
}

/** 注册入参 */
export interface RegisterPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
}

/** 登录结果：服务端返回的令牌 + 用户信息 */
export interface LoginResult {
  token: string
  user: User
}

/** 会话 */
export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface ConversationListResult {
  list: Conversation[]
  total: number
  page: number
  pageSize: number
}
export interface CreateConversation {
  id: string
  title: string
}
export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

/** 消息 */
export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  /** 内容，支持 Markdown（产品书 §12） */
  content: string
  status: MessageStatus
  created_at: string
  attachments: Attachment[]
}

/**
 * 附件（服务端已存储）
 *
 * 既包含用户上传的文件，也包含 Agent 在对话中真实生成的文件产物。
 * url / previewUrl 指向后端文件接口（相对地址），不包含服务器磁盘路径。
 *
 * kind / previewKind / language / lineCount / hasPreview / hasBackend / downloadUrl
 * 是「产物按类型内联渲染」新增的渲染元信息，全部由后端判定下发；
 * 缺失时前端回退渲染普通文件卡片（不得自行猜测类型）。
 */
export interface Attachment {
  id: string
  message_id?: string
  conversationId: string
  type: AttachmentType
  name: string
  /** 下载地址（返回文件字节） */
  url: string
  /** 预览地址（可内联展示的类型返回 inline） */
  previewUrl?: string
  size?: number
  created_at: string

  /** 产物交付形态 */
  kind?: ArtifactKind
  /** 预览方式 */
  previewKind?: PreviewKind
  /** 代码语言标识（仅 kind = code） */
  language?: string
  /** 代码总行数（仅 kind = code，用于显示「仅显示前 100 行」） */
  lineCount?: number
  /** 是否真的可预览（后端没有 dist/index.html 时为 false） */
  hasPreview?: boolean
  /** 是否含后端工程 */
  hasBackend?: boolean
  /** 工程级下载地址（ZIP）；单文件产物与 url 一致 */
  downloadUrl?: string
}

/**
 * 输入区待发送附件（本地态）
 * 上传成功后由服务端返回 url 与文件 id 填充
 */
export interface PendingAttachment {
  /** 本地临时 id */
  uid: string
  type: AttachmentType
  name: string
  size: number
  status: UploadStatus
  /** 0 - 100 */
  progress: number
  /** 上传成功后的访问地址 */
  url?: string
  /**
   * 上传成功后服务端返回的文件 id（fileId）
   *
   * 后端该字段为 int（number），因此这里必须保持 number 类型，
   * 不做 String() 转换；发送消息时以 number 原样回传后端，
   * 后端据此关联本次消息引用的已上传文件。
   * 本地新建、尚未上传成功的附件没有该值。
   */
  fileId?: number
  /** 上传失败原因 */
  error?: string
}

/** 会话按时间分组（UI §6.3 今天 / 昨天 / 更早） */
export interface ConversationGroup {
  label: string
  items: Conversation[]
}

/**
 * 会话产出状态（项目交付：在线预览 / 下载源码）
 *
 * 对应后端 `GET /api/project/{conversationId}/status`（见 backend/API.md），
 * 前端据此决定是否显示「在线预览 / 下载源码」两个按钮。
 * 每个用户、每个会话的产出目录互相独立，因此状态按会话维度返回。
 */
export interface ProjectStatus {
  /** 会话 id（进入应用层前统一归一化为 string） */
  conversationId: string
  /** 该会话是否已产出过内容（不含用户上传的附件） */
  hasOutput: boolean
  /** 是否存在前端工程源码（可「下载源码」） */
  hasSource: boolean
  /** 是否存在构建产物 dist/index.html（可「在线预览」） */
  hasPreview: boolean
  /** 预览地址（相对路径，必须以 / 结尾）；不可预览时为空字符串 */
  previewUrl: string
  /** 下载地址（相对路径）；不可下载时为空字符串 */
  downloadUrl: string
}

/** 统一的接口错误结构 */
export interface ApiError extends Error {
  code: string | number
  field?: string
}

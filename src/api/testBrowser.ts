/**
 * 测试浏览器实时画面（SSE）
 *
 * 后端契约（见 backend/API.md 第七节）：
 *
 *   GET /api/test/browser/events?conversationId=1&testRunId=2
 *   event: test_browser_frame
 *   data: {"conversationId":1,"testRunId":2,"frame":"<base64 jpeg>",
 *          "mime":"image/jpeg","width":960,"height":540,"timestamp":123.45}
 *
 * 注意：必须使用 fetch + ReadableStream 订阅，不能用 EventSource ——
 * EventSource 无法携带 Authorization 头，会被后端 401 拒绝。
 */
import { API_BASE_URL, createApiError, isAbortError } from './request'
import { getToken } from '@/utils/session'

/** 一帧浏览器画面 */
export interface BrowserFrame {
  /** 可直接赋给 <img src> 的 data URL */
  dataUrl: string
  width: number
  height: number
  timestamp: number
}

/** 后端原始帧负载 */
interface FramePayload {
  frame?: unknown
  mime?: unknown
  width?: unknown
  height?: unknown
  timestamp?: unknown
}

/** 后端固定使用的事件名 */
const FRAME_EVENT = 'test_browser_frame'

/** 默认 MIME（后端推 JPEG） */
const DEFAULT_MIME = 'image/jpeg'

/**
 * 归一化帧负载
 *
 * 没有图像数据的帧直接丢弃，绝不伪造画面（避免面板显示空白/破图）。
 */
const normalizeFrame = (payload: unknown): BrowserFrame | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const record = payload as FramePayload
  const base64 = typeof record.frame === 'string' ? record.frame.trim() : ''

  if (!base64) return null

  const mime = typeof record.mime === 'string' && record.mime ? record.mime : DEFAULT_MIME
  const width = typeof record.width === 'number' && record.width > 0 ? record.width : 0
  const height = typeof record.height === 'number' && record.height > 0 ? record.height : 0
  const timestamp = typeof record.timestamp === 'number' ? record.timestamp : Date.now()

  return {
    dataUrl: `data:${mime};base64,${base64}`,
    width,
    height,
    timestamp
  }
}

export interface SubscribeBrowserFramesOptions {
  /** 会话 ID（画面按会话维度推送） */
  conversationId: string
  /** 用于中止订阅 */
  signal: AbortSignal
  /** 收到一帧画面 */
  onFrame: (frame: BrowserFrame) => void
}

/**
 * 订阅测试浏览器画面
 *
 * 该函数在中止（signal.aborted）或后端结束流时返回；
 * 网络/鉴权异常会抛出 ApiError，由调用方决定是否重连。
 */
export const subscribeBrowserFrames = async (
  options: SubscribeBrowserFramesOptions
): Promise<void> => {
  const token = getToken()
  const params = new URLSearchParams({ conversationId: options.conversationId })

  const response = await fetch(
    `${API_BASE_URL}/test/browser/events?${params.toString()}`,
    {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: options.signal
    }
  )

  // 401 交给统一未授权处理（createApiError 会通知跳转登录页）
  if (response.status === 401) {
    throw createApiError('登录已失效，请重新登录', 401)
  }

  if (!response.ok || !response.body) {
    throw createApiError(
      `无法连接测试画面（${response.status}）`,
      response.status
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  let frameEvent = ''
  let frameData: string[] = []

  /** 派发一个完整 SSE 帧 */
  const dispatch = (): void => {
    const event = frameEvent
    const data = frameData.join('\n')
    frameEvent = ''
    frameData = []

    if (!event || !data) return

    // 只处理画面帧，其它事件（测试进度等）由各自的订阅负责
    if (event !== FRAME_EVENT) return

    try {
      const frame = normalizeFrame(JSON.parse(data) as unknown)
      if (frame) options.onFrame(frame)
    } catch {
      // 非法帧丢弃，不影响后续帧
    }
  }

  /** 处理一行流数据 */
  const consumeLine = (line: string): void => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line

    // 空行 = 一个事件结束
    if (normalized === '') {
      dispatch()
      return
    }

    // 注释行（keep-alive）
    if (normalized.startsWith(':')) return

    if (normalized.startsWith('event:')) {
      frameEvent = normalized.slice(6).trim()
      return
    }

    if (normalized.startsWith('data:')) {
      frameData.push(normalized.slice(5).replace(/^\s/, ''))
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true —— 保证多字节字符跨 chunk 不被截断
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) consumeLine(line)
    }

    // 冲掉解码器与最后一段
    buffer += decoder.decode()
    if (buffer) consumeLine(buffer)
    dispatch()
  } catch (error) {
    // 主动中止不算错误
    if (isAbortError(error)) return
    throw error
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 忽略取消异常
    }
  }
}

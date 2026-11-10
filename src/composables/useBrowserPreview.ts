/**
 * 测试浏览器画面预览状态
 *
 * 需求：「把前端右侧区域变成预览区域，平时不显示，只有测试的时候才显示」
 *
 * 实现策略（避免依赖额外接口）：
 *   - 订阅后端画面流（test_browser_frame）
 *   - 收到第一帧 → 自动显示面板，状态变为 live
 *   - 超过 IDLE_TIMEOUT 没有新帧 → 自动隐藏（说明测试已结束或浏览器已关闭）
 *
 * 因为只有 Tester Agent 真正驱动浏览器时后端才会推流，
 * "平时不显示" 天然成立，不需要额外的开关接口。
 */
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { isAbortError } from '@/api/request'
import { subscribeBrowserFrames } from '@/api/testBrowser'
import type { BrowserFrame } from '@/api/testBrowser'

/** 连接状态 */
export type BrowserPreviewStatus = 'idle' | 'connecting' | 'live' | 'error'

/** 多久没有新帧就认为测试结束（毫秒） */
const IDLE_TIMEOUT = 10000

/** 断线重连间隔（毫秒） */
const RECONNECT_DELAY = 3000

export interface UseBrowserPreviewResult {
  /** 面板是否可见 */
  visible: Ref<boolean>
  /** 当前帧的 data URL（空串表示还没有画面） */
  frame: Ref<string>
  status: Ref<BrowserPreviewStatus>
  error: Ref<string>
  /** 画面分辨率（用于保持宽高比，0 表示未知） */
  width: Ref<number>
  height: Ref<number>
  /** 开始订阅某个会话的画面 */
  start: (conversationId: string) => void
  /** 停止订阅并重置状态 */
  stop: () => void
  /** 用户手动关闭面板（本次测试内不再自动弹出） */
  hide: () => void
}

export const useBrowserPreview = (): UseBrowserPreviewResult => {
  const visible = ref(false)
  // 帧是很大的 base64 字符串，用 shallowRef 避免深层响应式开销
  const frame = shallowRef('')
  const status = ref<BrowserPreviewStatus>('idle')
  const error = ref('')
  const width = ref(0)
  const height = ref(0)

  let controller: AbortController | null = null
  let idleTimer: number | null = null
  let reconnectTimer: number | null = null

  /** 当前订阅的会话 ID */
  let currentId = ''
  /** 是否处于订阅循环中 */
  let running = false
  /** 用户是否手动关闭了面板 */
  let dismissed = false

  const clearIdle = (): void => {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const clearReconnect = (): void => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const resetFrame = (): void => {
    frame.value = ''
    width.value = 0
    height.value = 0
  }

  /** 收到新帧后重新计时：长时间无帧即视为测试结束 */
  const armIdleTimer = (): void => {
    clearIdle()

    idleTimer = window.setTimeout(() => {
      idleTimer = null

      // 测试结束：允许下次测试重新弹窗
      dismissed = false
      visible.value = false
      status.value = 'idle'
      resetFrame()
    }, IDLE_TIMEOUT)
  }

  const applyFrame = (incoming: BrowserFrame): void => {
    frame.value = incoming.dataUrl

    if (incoming.width > 0) width.value = incoming.width
    if (incoming.height > 0) height.value = incoming.height

    status.value = 'live'
    error.value = ''

    // 用户手动关闭后，本次测试内保持隐藏；下一轮测试（idle 后）会重新弹出
    if (!dismissed) visible.value = true

    armIdleTimer()
  }

  const scheduleReconnect = (conversationId: string): void => {
    clearReconnect()

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null

      if (!running || currentId !== conversationId) return

      void connect(conversationId)
    }, RECONNECT_DELAY)
  }

  const connect = async (conversationId: string): Promise<void> => {
    controller = new AbortController()
    const signal = controller.signal

    status.value = 'connecting'

    try {
      await subscribeBrowserFrames({
        conversationId,
        signal,
        onFrame: applyFrame
      })

      // 后端正常结束流（例如测试结束主动断开）
      if (running && !signal.aborted) {
        status.value = 'idle'
        scheduleReconnect(conversationId)
      }
    } catch (err) {
      if (!running || signal.aborted || isAbortError(err)) return

      status.value = 'error'
      error.value = err instanceof Error ? err.message : '测试画面连接失败'

      // 连接失败时继续重试，避免一次网络抖动导致预览永久失效
      scheduleReconnect(conversationId)
    }
  }

  const stop = (): void => {
    running = false
    currentId = ''
    dismissed = false

    clearIdle()
    clearReconnect()

    controller?.abort()
    controller = null

    resetFrame()
    visible.value = false
    status.value = 'idle'
    error.value = ''
  }

  const start = (conversationId: string): void => {
    // 清掉上一次订阅
    stop()

    // 只有服务端会话才有画面流：
    // 前端本地草稿会话（draft_xxx）尚未落库，后端无法定位会话。
    if (!/^\d+$/.test(conversationId)) return

    running = true
    currentId = conversationId

    void connect(conversationId)
  }

  const hide = (): void => {
    dismissed = true
    visible.value = false
  }

  // 组件卸载时释放连接，避免 SSE 悬挂
  onBeforeUnmount(stop)

  return {
    visible,
    frame,
    status,
    error,
    width,
    height,
    start,
    stop,
    hide
  }
}

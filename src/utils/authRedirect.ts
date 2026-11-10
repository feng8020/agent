/**
 * 未授权（401）统一处理
 *
 * 需求：token 失效时不能停留在任何需要登录的内部页面，
 * 必须立即 `replace` 到登录页。
 *
 * 设计说明（避免循环依赖）：
 *   request.ts → stores/auth.ts → api/auth.ts → request.ts 会形成循环，
 *   因此本模块只负责「登记 / 触发」，不 import store 与 router；
 *   真正的会话清理与跳转由 main.ts 注册的 handler 完成。
 *
 * 并发控制：
 *   一个页面往往同时发起多个请求（会话列表 + 消息列表 + 上传等），
 *   它们会同时收到 401。这里用短时间窗去重，保证只跳转一次，
 *   避免重复 `router.replace` 与重复提示。
 */

/** 401 处理器接收的参数 */
export interface UnauthorizedPayload {
  /** 登录成功后需要回跳的路径（当前页面） */
  redirect: string
}

export type UnauthorizedHandler = (payload: UnauthorizedPayload) => void

/** 处理器注册表（应用启动时由 main.ts 注入） */
let handler: UnauthorizedHandler | null = null

/** 是否正在处理（并发 401 去重） */
let handling = false

/** 去重时间窗（毫秒）：窗口内的重复 401 直接忽略 */
const DEDUPE_WINDOW = 1000

/** 注册 401 处理器 */
export const setUnauthorizedHandler = (fn: UnauthorizedHandler): void => {
  handler = fn
}

/** 读取当前浏览器路径（hash 路由下取 # 之后的部分） */
const currentPath = (): string => {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace(/^#/, '') || ''
}

/**
 * 触发未授权处理
 *
 * @param redirect 登录后需要回跳的路径，默认取当前地址
 */
export const handleUnauthorized = (redirect?: string): void => {
  if (handling) return

  handling = true

  const target = (redirect ?? currentPath()).trim()

  try {
    handler?.({ redirect: target })
  } finally {
    // 允许后续再次触发（例如换账号后再次失效）
    if (typeof window === 'undefined') {
      handling = false
    } else {
      window.setTimeout(() => {
        handling = false
      }, DEDUPE_WINDOW)
    }
  }
}

/**
 * Axios 实例与统一错误处理（产品书 §9.6 错误展示原则）
 *
 * 全项目共用此唯一实例，不要新建第二套封装。
 * 登录令牌通过请求拦截器写入 Authorization 头。
 *
 * 401 处理：
 *   401 有两种完全不同的含义，必须区分（BUG-01）：
 *   1. 登录态失效  → 立即离开内部页面，由 utils/authRedirect 通知应用层
 *                    执行 `router.replace('/login')`，文案「登录已失效，请重新登录」
 *   2. 业务鉴权失败（登录时账号或密码错误、令牌已失效时的登出）
 *                  → 属于业务失败，必须**原样保留后端 message**，
 *                    既不跳转登录页，也不能套用「登录已失效」的文案，
 *                    否则用户会误以为自己的会话过期了。
 */
import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '@/types'
import { getToken } from '@/utils/session'
import { handleUnauthorized } from '@/utils/authRedirect'

/** 后端 API 基础地址，默认走 /api（开发环境由 vite proxy 转发） */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * 认证接口白名单
 *
 * 这些接口的 401 是「业务失败」而非「登录失效」：
 * - /auth/user/login  用户名或密码错误
 * - /auth/register    注册被拒绝
 * - /auth/logout      令牌已失效时的登出，本地清理已足够
 *
 * 命中白名单时：使用后端返回的 message，且不触发跳转登录页。
 */
const AUTH_EXEMPT_PATHS: readonly string[] = [
  '/auth/user/login',
  '/auth/register',
  '/auth/logout'
]

/** 判断请求地址是否属于认证豁免接口 */
const isAuthExemptPath = (url?: string): boolean => {
  if (!url) return false
  return AUTH_EXEMPT_PATHS.some((path) => url.includes(path))
}

/**
 * 归一化 ID
 *
 * 后端可能返回 number 或 string 类型的 ID，而前端内部统一以 string 作为 ID 契约
 * （本地草稿 ID 带 `draft_` 前缀、路由参数、URL 拼接均按 string 处理）。
 * 所有来自后端的 ID 在进入应用层之前都必须经过这里归一化，避免：
 * - number 调用字符串方法（如 startsWith）直接抛错 TypeError
 * - number 与 string 用 === 比较恒为 false，导致选中 / 去重 / 匹配失效
 */
export const normalizeId = (id: unknown): string =>
  id === null || id === undefined ? '' : String(id)

/** createApiError 的可选行为 */
export interface ApiErrorOptions {
  /**
   * 是否按「登录态失效」处理（仅对 code === 401 生效）
   *
   * 默认 true；认证接口（登录 / 注册 / 退出）显式传 false 豁免。
   */
  unauthorized?: boolean
}

/**
 * 构造统一错误对象
 *
 * 这里是所有请求通道（axios / fetch 流式请求）的唯一错误构造入口，
 * 因此也作为「401 统一处理」的唯一入口：
 * 只要构造出的错误是 401 且未被豁免，就会通知应用层立即跳转登录页。
 */
export const createApiError = (
  message: string,
  code: string | number = 'UNKNOWN',
  field?: string,
  options?: ApiErrorOptions
): ApiError => {
  const error = new Error(message) as ApiError
  error.code = code
  error.field = field

  if (code === 401 && options?.unauthorized !== false) {
    handleUnauthorized()
  }

  return error
}

/** 判断是否为统一错误对象 */
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof Error && 'code' in error
}

/** 从任意异常中提取用户可读的错误信息 */
export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return '请求失败，请重试'
}

/** 判断是否被主动取消（停止生成时会产生） */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (axios.isCancel(error)) return true
  return error instanceof Error && error.name === 'AbortError'
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json'
  }
})

/** 请求拦截：携带登录令牌（登录接口返回的 token → Authorization 头） */
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/** 响应拦截：直接返回业务数据，并把异常归一化为 ApiError */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(createApiError('请求已取消', 'CANCELLED'))
    }

    if (error instanceof AxiosError) {
      // 网络异常 / 超时（产品书 §10 网络请求失败）
      if (!error.response) {
        return Promise.reject(createApiError('网络异常，请重试', 'NETWORK_ERROR'))
      }

      const { status, data } = error.response as {
        status: number
        data?: { message?: string; code?: string | number; field?: string }
      }

      // 401：区分「登录态失效」与「业务鉴权失败」（BUG-01）
      if (status === 401) {
        const exempt = isAuthExemptPath(error.config?.url)

        // 认证接口：保留后端原文（例如「用户名或密码错误」），
        // 不能覆盖成「登录已失效」，否则用户会误判为会话过期。
        const message = exempt
          ? data?.message || '用户名或密码错误'
          : '登录已失效，请重新登录'

        return Promise.reject(
          createApiError(message, 401, data?.field, { unauthorized: !exempt })
        )
      }

      return Promise.reject(
        createApiError(data?.message || `请求失败（${status}）`, data?.code ?? status, data?.field)
      )
    }

    return Promise.reject(createApiError('请求失败，请重试'))
  }
)

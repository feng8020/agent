/**
 * 认证接口（产品书 §9.1）
 *
 * - 登录：POST /auth/user/login（用户名 + 密码）→ 返回 token 与用户信息
 * - token 由 store 写入本地并在后续请求中通过 Authorization 头携带
 */
import type { LoginPayload, LoginResult, RegisterPayload, User } from '@/types'
import { createApiError, http, isApiError } from './request'

export type { LoginPayload, LoginResult, RegisterPayload } from '@/types'

/** 登录接口中用户信息的数据结构（兼容服务端把业务数据包在 data 字段中） */
interface LoginUserData extends Partial<User> {
  token?: string
  user?: Partial<User>
}

interface LoginResponseBody extends LoginUserData {
  data?: LoginUserData
}

/** 归一化登录响应：提取 token 与用户信息 */
const normalizeLogin = (body: LoginResponseBody): LoginResult => {
  const inner = body.data ?? body
  const token = inner.token ?? ''

  if (!token) {
    throw createApiError('登录失败：服务端未返回登录令牌', 'INVALID_LOGIN_RESPONSE')
  }

  const raw = inner.user ?? inner
  const user: User = {
    id: raw.id ?? '',
    username: raw.username ?? '',
    email: raw.email ?? '',
    nickname: raw.nickname ?? raw.username ?? '',
    theme: raw.theme ?? 'system',
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? ''
  }

  return { token, user }
}

/** 注册：提交用户名、邮箱、密码、确认密码 → 返回创建的用户 */
export const register = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await http.post<User>('/auth/register', payload)
  return data
}

/** 登录：用户名 + 密码 → 返回 token 与用户信息（产品书 §5、§7.2） */
export const login = async (payload: LoginPayload): Promise<LoginResult> => {
  const { data } = await http.post<LoginResponseBody>('/auth/user/login', payload)
  return normalizeLogin(data)
}

/**
 * 退出登录：通知服务端失效令牌（本地会话由 store 清理）
 *
 * BUG-04：当前后端没有实现 /auth/logout，会返回 404。
 * 退出登录的本质是「清掉本地会话」，服务端不支持时绝不能让用户卡在已登录状态，
 * 因此 404（接口不存在）与 401（令牌本来就已失效）都视为「服务端已无有效会话」，
 * 直接按成功处理；其它错误仍然抛出，由调用方提示。
 */
export const logout = async (): Promise<void> => {
  try {
    await http.post('/auth/logout')
  } catch (error) {
    if (isApiError(error)) {
      const code = Number(error.code)
      if (code === 404 || code === 401) return
    }
    throw error
  }
}

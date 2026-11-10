/**
 * 登录会话存储（token + 用户信息）
 *
 * - 登录成功后由服务端返回 token，存入 localStorage，并附加到后续请求的 Authorization 头
 * - 用户信息仅用于刷新页面后恢复展示，不作为权限依据
 */

import type { User } from '@/types'

const TOKEN_KEY = 'ai-chat:token'
const USER_KEY = 'ai-chat:user'

/** 读取登录令牌 */
export const getToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

/** 写入登录令牌 */
export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // 忽略存储异常（隐私模式等）
  }
}

/** 读取缓存的用户信息 */
export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

/** 缓存用户信息 */
export const setStoredUser = (user: User | null): void => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // 忽略存储异常
  }
}

/** 清理登录会话（退出登录） */
export const clearSession = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // 忽略存储异常
  }
}

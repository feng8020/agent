/**
 * 认证 store —— 产品书 §5、§6、§7.1、§7.2
 *
 * 登录成功后持久化 token（用于请求鉴权）与用户信息（用于刷新恢复展示）。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import type { LoginPayload, RegisterPayload, User } from '@/types'
import { clearSession, getStoredUser, getToken, setStoredUser, setToken } from '@/utils/session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  /** 是否已完成一次「恢复登录态」的尝试 */
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const displayName = computed(() => user.value?.nickname || user.value?.username || '')

  let initPromise: Promise<void> | null = null

  /** 应用启动 / 路由守卫时调用：存在 token 时恢复本地缓存的用户信息 */
  const ensureInitialized = async (): Promise<void> => {
    if (initialized.value) return
    if (!initPromise) {
      initPromise = Promise.resolve().then(() => {
        user.value = getToken() ? getStoredUser() : null
        initialized.value = true
      })
    }
    await initPromise
  }

  /** 登录：保存 token 与用户信息，失败时抛出 ApiError 由页面展示（产品书 §9.6） */
  const login = async (payload: LoginPayload): Promise<User> => {
    loading.value = true
    try {
      const result = await authApi.login(payload)
      setToken(result.token)
      setStoredUser(result.user)
      user.value = result.user
      initialized.value = true
      return result.user
    } finally {
      loading.value = false
    }
  }

  /** 注册：成功后由页面跳转登录页 */
  const register = async (payload: RegisterPayload): Promise<User> => {
    loading.value = true
    try {
      return await authApi.register(payload)
    } finally {
      loading.value = false
    }
  }

  /**
   * 本地清理登录态（不请求服务端）
   *
   * 用于 401 全局处理：token 已失效时再调用 /auth/logout 没有意义，
   * 而且可能再次收到 401 造成递归。
   *
   * 必须同时清掉 localStorage 与内存中的 user，
   * 否则路由守卫会认为仍处于登录态，把 /login 又重定向回 /chat。
   */
  const resetSession = (): void => {
    clearSession()
    user.value = null
    // 保持 initialized = true：已完成过一次恢复尝试，
    // 不需要再从 localStorage 读回（此时已无 token）。
    initialized.value = true
  }

  /** 退出登录：无论服务端是否成功都清理本地会话 */
  const signOut = async (): Promise<void> => {
    loading.value = true
    try {
      await authApi.logout()
    } catch {
      // 服务端退出失败不影响本地登出
    } finally {
      clearSession()
      user.value = null
      loading.value = false
    }
  }

  /** 本地更新用户信息并同步缓存 */
  const patchUser = (patch: Partial<User>): void => {
    if (!user.value) return
    user.value = { ...user.value, ...patch }
    setStoredUser(user.value)
  }

  return {
    user,
    loading,
    initialized,
    isAuthenticated,
    displayName,
    ensureInitialized,
    login,
    register,
    resetSession,
    signOut,
    patchUser
  }
})

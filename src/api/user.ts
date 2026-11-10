/**
 * 个人设置接口（产品书 §9.5）
 */
import type { ThemeMode, User } from '@/types'
import { http, normalizeId } from './request'

export interface UpdateProfilePayload {
  nickname: string
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/** 后端用户 → 前端用户（统一 id 为 string） */
const normalizeUser = (raw: User): User => ({ ...raw, id: normalizeId(raw.id) })

/**
 * 修改个人资料
 * TODO(待确认)：产品书 §12 第 5 条 —— 可修改字段范围（当前仅昵称可编辑）。
 */
export const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
  const { data } = await http.patch<User>('/user/profile', { nickname: payload.nickname })
  return normalizeUser(data)
}

/** 修改密码 */
export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await http.post('/user/password', {
    old_password: payload.oldPassword,
    new_password: payload.newPassword
  })
}

/** 切换主题偏好 */
export const updateTheme = async (theme: ThemeMode): Promise<User> => {
  const { data } = await http.patch<User>('/user/theme', { theme })
  return normalizeUser(data)
}

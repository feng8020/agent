/**
 * 项目交付接口 —— 在线预览 / 下载源码（见 backend/API.md）
 *
 * 后端按「用户 + 会话」隔离产出目录，提供三个接口：
 * - GET /project/{conversationId}/status   查询产出状态（决定按钮显隐）
 * - GET /project/{conversationId}/preview/ 在线预览（iframe / 新窗口打开）
 * - GET /project/{conversationId}/download 下载源码（zip）
 *
 * 注意：preview / download 通常由 <iframe>、<a> 触发，无法自定义请求头，
 * 因此这两个地址需要额外携带 `?token=`（见 withToken）。
 */
import type { ApiResponse, ProjectStatus } from '@/types'
import { getToken } from '@/utils/session'
import { API_BASE_URL, http } from './request'

/** 后端返回的原始结构：conversationId 为 number，布尔字段可能缺省 */
interface ProjectStatusResponse {
  conversationId?: number | string
  hasOutput?: boolean
  hasSource?: boolean
  hasPreview?: boolean
  previewUrl?: string
  downloadUrl?: string
}

/** 归一化：id 统一为 string，布尔字段兜底为 false，地址缺省为空串 */
const normalizeStatus = (raw: ProjectStatusResponse): ProjectStatus => ({
  conversationId:
    raw.conversationId === null || raw.conversationId === undefined
      ? ''
      : String(raw.conversationId),
  hasOutput: Boolean(raw.hasOutput),
  hasSource: Boolean(raw.hasSource),
  hasPreview: Boolean(raw.hasPreview),
  previewUrl: raw.previewUrl ?? '',
  downloadUrl: raw.downloadUrl ?? ''
})

/**
 * 把后端返回的相对地址解析为浏览器可直接访问的地址
 *
 * 后端固定返回 `/api/project/...` 形式的绝对路径：
 * - API 与页面同源（默认 /api）时，直接使用该路径即可；
 * - API 部署在独立域名时，补上该域名（只取 origin，因为路径本身已含 /api）。
 */
export const resolveProjectUrl = (path: string): string => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    try {
      const origin = new URL(API_BASE_URL).origin
      return origin + (path.startsWith('/') ? path : `/${path}`)
    } catch {
      return path
    }
  }

  return path
}

/**
 * 追加登录令牌
 *
 * <iframe> / <a> 无法设置 Authorization 请求头，
 * 因此 preview / download 支持用 `?token=` 传递鉴权信息（与请求头方式等价）。
 */
export const withToken = (url: string): string => {
  if (!url) return ''
  const token = getToken()
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

/** 查询某个会话的产出状态（供前端决定是否显示「在线预览 / 下载源码」） */
export const fetchProjectStatus = async (
  conversationId: string
): Promise<ProjectStatus> => {
  const { data } = await http.get<ApiResponse<ProjectStatusResponse>>(
    `/project/${encodeURIComponent(conversationId)}/status`
  )
  // data.data 理论上一定存在，这里仍做兜底，避免异常响应结构导致渲染报错
  return normalizeStatus(data?.data ?? {})
}

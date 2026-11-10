/**
 * 文件访问工具 —— 统一处理「携带登录令牌获取文件内容」以及「预览 / 下载」。
 *
 * 背景：
 * 附件地址由后端返回（可能是相对路径 `/api/...`，也可能是绝对地址），
 * 且访问通常需要登录令牌。若直接用 <a> / <img> / window.open 打开，
 * 无法携带 Authorization 头，受保护的文件会返回 401。
 * 因此这里优先用 fetch 显式携带令牌拉取内容，
 * 失败时再回退为按地址直接访问（兼容公开 / 已签名地址）。
 */
import { getToken } from '@/utils/session'

/** 组装带登录令牌的请求头 */
const authHeaders = (): Record<string, string> => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 为地址追加登录令牌（?token=）
 *
 * <img> / <iframe> 这类由浏览器直接发起的请求无法携带 Authorization 头，
 * 因此需要「可直接导航的地址」时（例如文件缩略图），用查询参数补上令牌。
 * 后端 preview / download 接口同时支持请求头与 ?token= 两种鉴权方式。
 */
export const withAuthToken = (url: string): string => {
  if (!url) return ''
  const token = getToken()
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

/** 把 HTTP 状态码翻译成用户可理解的错误文案 */
const describeStatus = (status: number): string => {
  if (status === 401 || status === 403) return '登录已失效或无权访问该文件'
  if (status === 404) return '文件不存在或已被删除'
  if (status >= 500) return '服务器错误，请稍后重试'
  return `文件获取失败（${status}）`
}

/** 携带登录令牌拉取文件内容（失败时抛出可读错误） */
export const fetchFileBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url, { headers: authHeaders() })

  if (!response.ok) {
    throw new Error(describeStatus(response.status))
  }

  return response.blob()
}

/** 使用隐藏锚点触发下载 */
const triggerAnchorDownload = (href: string, filename?: string): void => {
  const link = document.createElement('a')
  link.href = href
  link.download = filename ?? ''
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 下载需要鉴权的文件（严格模式）
 *
 * 与 downloadFile 的区别：失败时**抛出错误**，由调用方提示用户，
 * 不会静默回退成「浏览器直接访问地址」——
 * 后者在需要鉴权时会返回 401/404 的 JSON 页面，用户看到的是坏掉的下载。
 */
export const downloadAuthedFile = async (url: string, filename?: string): Promise<void> => {
  if (!url) {
    throw new Error('文件地址无效，暂时无法下载')
  }

  const blob = await fetchFileBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  triggerAnchorDownload(objectUrl, filename)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

/**
 * 下载文件（兼容模式）
 *
 * 优先携带登录令牌拉取 Blob 后下载（保证需要鉴权的私有文件可用），
 * 拉取失败时退回锚点直接下载（兼容公开 / 已签名地址）。
 * 适用于无法承担错误提示的调用方；需要给用户明确错误时请使用 downloadAuthedFile。
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  if (!url) return

  try {
    const blob = await fetchFileBlob(url)
    const objectUrl = URL.createObjectURL(blob)
    triggerAnchorDownload(objectUrl, filename)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    triggerAnchorDownload(url, filename)
  }
}

/**
 * 剪贴板工具（UI §9.4 复制成功 / 失败反馈）
 */

/**
 * 复制文本到剪贴板
 * 优先使用 Clipboard API，非安全上下文回退到 execCommand
 */
export const copyText = async (text: string): Promise<boolean> => {
  if (!text) return false

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 忽略，走降级方案
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

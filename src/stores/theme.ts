/**
 * 主题 store —— 产品书 §7.6 / UI §13.4
 *
 * - 支持浅色 / 深色 / 跟随系统三种偏好
 * - 通过根元素 data-theme 切换，样式全部来自 CSS 变量
 * - 偏好持久化在 localStorage（刷新后保持）
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ResolvedTheme, ThemeMode } from '@/types'

const STORAGE_KEY = 'ai-chat-theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

const readStoredMode = (): ThemeMode => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // 忽略隐私模式等存储异常
  }
  return 'system'
}

const systemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MEDIA_QUERY).matches
}

const applyToDocument = (theme: ResolvedTheme): void => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const systemDark = ref<boolean>(systemPrefersDark())
  let listening = false

  /** 实际生效的主题 */
  const resolved = computed<ResolvedTheme>(() =>
    mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value
  )

  const apply = (): void => {
    applyToDocument(resolved.value)
  }

  /** 设置主题偏好（本地立即生效，持久化由调用方决定是否同步到服务端） */
  const setMode = (next: ThemeMode): void => {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 忽略
    }
    apply()
  }

  /** 在浅色 / 深色之间切换（顶部操作区快捷入口，UI §6.2） */
  const toggle = (): void => {
    setMode(resolved.value === 'dark' ? 'light' : 'dark')
  }

  /** 监听系统主题变化 */
  const init = (): void => {
    if (listening || typeof window === 'undefined' || !window.matchMedia) return
    listening = true

    const media = window.matchMedia(MEDIA_QUERY)
    const handler = (event: MediaQueryListEvent): void => {
      systemDark.value = event.matches
      if (mode.value === 'system') apply()
    }

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler)
    } else if (typeof media.addListener === 'function') {
      // 兼容旧版浏览器
      media.addListener(handler)
    }
  }

  // store 创建时立即应用，避免首屏闪烁
  apply()

  return { mode, resolved, setMode, toggle, init, apply }
})

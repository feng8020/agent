/**
 * 轻提示（Toast）—— UI §6.9
 * 位置：顶部居中，距顶部 24px
 * 时长：成功 2s，错误 4s
 */
import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

/** 全局共享的 toast 队列 */
export const toastState = reactive<{ items: ToastItem[] }>({ items: [] })

let seed = 0

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 2000,
  error: 4000,
  info: 2000
}

export const useToast = () => {
  const remove = (id: number): void => {
    const index = toastState.items.findIndex((item) => item.id === id)
    if (index > -1) toastState.items.splice(index, 1)
  }

  const show = (message: string, type: ToastType = 'info', duration?: number): number => {
    const id = ++seed
    toastState.items.push({
      id,
      type,
      message,
      duration: duration ?? DEFAULT_DURATION[type]
    })
    // 最多同时展示 3 条
    if (toastState.items.length > 3) {
      toastState.items.splice(0, toastState.items.length - 3)
    }
    window.setTimeout(() => remove(id), duration ?? DEFAULT_DURATION[type])
    return id
  }

  return {
    toasts: toastState.items,
    show,
    success: (message: string, duration?: number) => show(message, 'success', duration),
    error: (message: string, duration?: number) => show(message, 'error', duration),
    info: (message: string, duration?: number) => show(message, 'info', duration),
    remove
  }
}

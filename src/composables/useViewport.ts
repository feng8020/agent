/**
 * 响应式断点检测（UI §12）
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface UseViewportResult {
  matches: Ref<boolean>
}

const initialMatch = (query: string): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

export const useViewport = (query = '(max-width: 767px)'): UseViewportResult => {
  const matches = ref(initialMatch(query))
  let media: MediaQueryList | null = null

  const update = (event: MediaQueryListEvent): void => {
    matches.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    media = window.matchMedia(query)
    matches.value = media.matches

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
    } else if (typeof media.addListener === 'function') {
      media.addListener(update)
    }
  })

  onBeforeUnmount(() => {
    if (!media) return
    if (typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', update)
    } else if (typeof media.removeListener === 'function') {
      media.removeListener(update)
    }
  })

  return { matches }
}

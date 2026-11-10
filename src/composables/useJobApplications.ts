/**
 * 投递记录（前端本地存储）—— 产品书 §9.3 / §9.4
 *
 * 纯前端模拟：
 * - 不进行真实上传与存储，仅记录投递信息，用于「已投递」「重复投递」演示。
 * - localStorage 不可用（隐私模式等）时降级为内存记录，不阻断演示（产品书 §10.12）。
 * - 使用模块级单例 ref，保证多页面共享同一份投递记录。
 */
import { ref } from 'vue'
import type { JobApplication } from '@/types/recruitment'

const STORAGE_KEY = 'novatech-careers-applications'

/** localStorage 不可用时的内存降级数据 */
let memoryFallback: JobApplication[] = []
let storageAvailable = true

const readFromStorage = (): JobApplication[] => {
  if (!storageAvailable) return memoryFallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as JobApplication[]) : []
  } catch {
    storageAvailable = false
    return memoryFallback
  }
}

const writeToStorage = (list: JobApplication[]): void => {
  if (!storageAvailable) {
    memoryFallback = list
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    storageAvailable = false
    memoryFallback = list
  }
}

/** 全局共享的投递记录 */
const applications = ref<JobApplication[]>(readFromStorage())

const createId = (): string =>
  `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** 新增投递记录入参（id / createdAt 由内部生成） */
export type NewApplication = Omit<JobApplication, 'id' | 'createdAt'>

export const useJobApplications = () => {
  const refresh = (): void => {
    applications.value = readFromStorage()
  }

  const hasApplied = (jobId: string): boolean =>
    applications.value.some((item) => item.jobId === jobId)

  const addApplication = (payload: NewApplication): JobApplication => {
    const record: JobApplication = {
      ...payload,
      id: createId(),
      createdAt: new Date().toISOString()
    }
    const next = [record, ...applications.value]
    applications.value = next
    writeToStorage(next)
    return record
  }

  const clearAll = (): void => {
    applications.value = []
    writeToStorage([])
  }

  return {
    applications,
    refresh,
    hasApplied,
    addApplication,
    clearAll
  }
}

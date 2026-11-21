/**
 * 测试域展示工具：状态文案、事件描述、证据解析。
 *
 * 说明：事件负载是 Record<string, unknown>，所有字段读取都必须经过这里的
 * 类型守卫函数，不允许直接 `data.xxx` 取值后当字符串用。
 */
import type { BugReport, TestCase, TestEvent, TestRun, TestStatus } from '@/types/test'

/** 测试状态文案 */
export const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  pending: '待执行',
  running: '执行中',
  passed: '通过',
  failed: '失败',
  blocked: '阻塞',
  skipped: '跳过'
}

/** 视觉语义，映射到组件的 CSS class（is-success / is-error …） */
export type TestTone = 'neutral' | 'running' | 'success' | 'error' | 'warning'

/** 测试状态对应的视觉语义 */
export const TEST_STATUS_TONES: Record<TestStatus, TestTone> = {
  pending: 'neutral',
  running: 'running',
  passed: 'success',
  failed: 'error',
  blocked: 'warning',
  skipped: 'neutral'
}

/** 缺陷严重程度文案 */
export const BUG_SEVERITY_LABELS: Record<string, string> = {
  critical: '致命',
  high: '严重',
  medium: '中等',
  low: '轻微'
}

/** 缺陷类型 / 归属文案（后端为自由字符串，未知值原样展示） */
export const BUG_TYPE_LABELS: Record<string, string> = {
  frontend: '前端',
  backend: '后端',
  api: '接口',
  database: '数据库',
  integration: '集成',
  ui: '界面',
  performance: '性能',
  environment: '环境'
}

/** 测试用例类型文案 */
export const TEST_CASE_TYPE_LABELS: Record<string, string> = {
  ui: '界面',
  api: '接口',
  integration: '集成',
  e2e: '端到端',
  regression: '回归',
  download: '下载'
}

/** 缺陷严重程度对应的视觉语义 */
export const bugSeverityTone = (severity: string): TestTone => {
  if (severity === 'critical') return 'error'
  if (severity === 'high') return 'error'
  if (severity === 'medium') return 'warning'
  return 'neutral'
}

/** 安全读取字符串字段 */
export const readString = (data: Record<string, unknown>, key: string): string => {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

/** 安全读取数值字段 */
export const readNumber = (data: Record<string, unknown>, key: string): number => {
  const value = data[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** 安全读取 ID 字段（后端可能下发 number 或 string） */
export const readId = (data: Record<string, unknown>, key: string): string => {
  const value = data[key]
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return ''
}

const TEST_STATUSES: readonly string[] = [
  'pending',
  'running',
  'passed',
  'failed',
  'blocked',
  'skipped'
]

/** 把任意值归一化为测试状态（未知值按待执行处理，避免界面出现空状态） */
export const parseTestStatus = (value: unknown): TestStatus =>
  typeof value === 'string' && TEST_STATUSES.includes(value) ? (value as TestStatus) : 'pending'

/** 耗时描述：12s / 3m12s；缺少起止时间或时间非法时返回空串 */
export const formatDuration = (startedAt: string, finishedAt: string): string => {
  if (!startedAt || !finishedAt) return ''

  const start = new Date(startedAt).getTime()
  const end = new Date(finishedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return ''

  const totalSeconds = Math.round((end - start) / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m${seconds}s`
}

/** 本地时间展示：2025-01-01 10:00 */
export const formatDateTime = (value: string): string => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (input: number): string => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

/** 解析缺陷的复现步骤（后端存 JSON 数组字符串） */
export const parseBugSteps = (steps: string): string[] => {
  const trimmed = steps.trim()
  if (!trimmed) return []

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
  } catch {
    return []
  }
}

/**
 * 解析证据链 JSON 字符串
 *
 * 解析成功则美化输出；失败时原样返回，让用户看到真实内容而不是「无证据」。
 * 空数组 / 空对象视为无证据。
 */
export const formatEvidence = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '[]' || trimmed === '{}') return ''

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return trimmed
  }
}

/** 一条事件在时间线上的展示形态 */
export interface TestEventView {
  title: string
  detail: string
  tone: TestTone
}

/** 把 SSE 事件转成时间线展示文本 */
export const describeTestEvent = (event: TestEvent): TestEventView => {
  const data = event.data
  const action = readString(data, 'action')
  const caseName = readString(data, 'name')
  const expected = readString(data, 'expected')
  const actual = readString(data, 'actual')

  switch (event.type) {
    case 'test_started': {
      const scope = readString(data, 'scope')
      const total = readNumber(data, 'total')
      return {
        title: '开始测试',
        detail: [scope, total > 0 ? `共 ${total} 个用例` : ''].filter(Boolean).join(' · '),
        tone: 'running'
      }
    }

    case 'test_case_started':
      return {
        title: `用例开始：${caseName || '未命名用例'}`,
        detail: '',
        tone: 'running'
      }

    case 'test_step_started':
      return {
        title: `步骤开始：${action || '未命名步骤'}`,
        detail: '',
        tone: 'running'
      }

    case 'test_step_passed':
      return {
        title: action || '步骤通过',
        detail: actual ? `实际：${actual}` : '',
        tone: 'success'
      }

    case 'test_step_failed':
      return {
        title: action || '步骤失败',
        detail: [expected ? `预期：${expected}` : '', actual ? `实际：${actual}` : '']
          .filter(Boolean)
          .join(' / '),
        tone: 'error'
      }

    case 'test_step_blocked':
      return {
        title: action || '步骤阻塞',
        detail: [expected ? `预期：${expected}` : '', actual ? `实际：${actual}` : '']
          .filter(Boolean)
          .join(' / '),
        tone: 'warning'
      }

    case 'test_case_finished': {
      const status = parseTestStatus(data['status'])
      const errorMessage = readString(data, 'error')
      return {
        title: `用例结束：${caseName || '未命名用例'}`,
        detail: [TEST_STATUS_LABELS[status], errorMessage].filter(Boolean).join(' · '),
        tone: TEST_STATUS_TONES[status]
      }
    }

    case 'bug_found': {
      const severity = readString(data, 'severity')
      const code = readString(data, 'code') || readString(data, 'id')
      const title = readString(data, 'title')
      return {
        title: `发现缺陷：${title || code || '未命名缺陷'}`,
        detail: [code, BUG_SEVERITY_LABELS[severity] ?? severity].filter(Boolean).join(' · '),
        tone: 'error'
      }
    }

    case 'test_artifact_added':
      return {
        title: `生成产物：${readString(data, 'name') || readString(data, 'kind') || '未命名产物'}`,
        detail: '',
        tone: 'neutral'
      }

    case 'test_finished': {
      const status = parseTestStatus(data['status'])
      const total = readNumber(data, 'total')
      const passed = readNumber(data, 'passed')
      const failed = readNumber(data, 'failed')
      return {
        title: `测试结束：${TEST_STATUS_LABELS[status]}`,
        detail:
          total > 0
            ? `共 ${total} 个用例，通过 ${passed}，失败 ${failed}`
            : readString(data, 'summary'),
        tone: TEST_STATUS_TONES[status]
      }
    }

    default:
      return { title: event.type, detail: '', tone: 'neutral' }
  }
}

/** 概览统计项 */
export interface TestRunStat {
  key: string
  label: string
  value: number
  tone: TestTone
}

/** 生成概览统计（顺序固定，避免模板里堆计算） */
export const buildRunStats = (run: TestRun): TestRunStat[] => [
  { key: 'total', label: '用例', value: run.total, tone: 'neutral' },
  { key: 'passed', label: '通过', value: run.passed, tone: 'success' },
  { key: 'failed', label: '失败', value: run.failed, tone: 'error' },
  { key: 'blocked', label: '阻塞', value: run.blocked, tone: 'warning' }
]

/** 用例类型文案（未知类型原样返回） */
export const caseTypeLabel = (type: string): string =>
  type ? TEST_CASE_TYPE_LABELS[type] ?? type : '用例'

/** 缺陷类型文案（未知类型原样返回） */
export const bugTypeLabel = (type: string): string =>
  type ? BUG_TYPE_LABELS[type] ?? type : '未分类'

/** 缺陷是否带缺陷证据（任一项非空即视为有证据） */
export const hasBugEvidence = (bug: BugReport): boolean =>
  Boolean(
    bug.description ||
      bug.expected ||
      bug.actual ||
      bug.url ||
      bug.screenshotPath ||
      formatEvidence(bug.console) ||
      formatEvidence(bug.network) ||
      formatEvidence(bug.backendLog) ||
      parseBugSteps(bug.steps).length > 0
  )

/** 用例是否有可展开内容（步骤或错误信息） */
export const hasCaseDetail = (item: TestCase): boolean =>
  Boolean(item.error) || item.steps.length > 0

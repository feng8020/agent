/**
 * 测试域接口 —— 对应 `backend/API.md` 第一节（测试结果）。
 * 浏览器画面 SSE（`/test/browser/events`）已在 `api/testBrowser.ts` 单独实现。
 *
 * 六条契约（后端 router/test.go 已注册）：
 * - GET /test/runs                          测试历史分页
 * - GET /test/latest-run                    会话最近一次测试
 * - GET /test/runs/:id                      详情（含 cases / steps / bugs）
 * - GET /test/runs/:id/events               测试过程 SSE
 * - GET /test/artifacts/:id/download        测试产物下载
 * - GET /test/browser/events                浏览器画面 SSE（见 testBrowser.ts）
 *
 * 关键约束（对应差异清单 R1~R8）：
 * - R1 后端测试域字段是 camelCase，本文件严格按 camelCase 取值；
 * - R2 ID 为 uint64（JSON number），进入应用层前统一经 normalizeId 归一化为 string；
 * - R3 列表接口不 Preload，cases / bugs 为空，不能当详情用；
 * - R4 latest-run 的 404 表示「暂无测试记录」，属于正常态，返回 null 而不是抛错；
 * - R5 SSE 不能用 EventSource（无法带 Authorization），必须 fetch + ReadableStream；
 * - R6 存在未文档化事件（test_artifact_added），白名单之外的事件静默忽略；
 * - R7 后端建连会补发历史事件，重复事件由调用方按 sequence 去重；
 * - R8 产物 path 不下发（json:"-"），只能按 id 下载。
 */
import type { ApiResponse } from '@/types'
import type {
  BugReport,
  BugSeverity,
  ListTestRunsParams,
  TestCase,
  TestEvent,
  TestEventType,
  TestRun,
  TestRunListResult,
  TestStep
} from '@/types/test'
import {
  API_BASE_URL,
  createApiError,
  http,
  isAbortError,
  isApiError,
  normalizeId
} from './request'
import { getToken } from '@/utils/session'
import { downloadAuthedFile } from '@/utils/file'
import { parseTestStatus } from '@/utils/test'

/** 后端原始 ID 可能是 number 或 string */
type RawId = number | string | null | undefined

/** 后端原始步骤结构 */
interface RawTestStep {
  id?: RawId
  testCaseId?: RawId
  stepIndex?: number
  action?: string
  expected?: string
  actual?: string
  status?: string
  screenshotPath?: string
  createdAt?: string
}

/** 后端原始用例结构 */
interface RawTestCase {
  id?: RawId
  testRunId?: RawId
  name?: string
  type?: string
  status?: string
  error?: string
  createdAt?: string
  updatedAt?: string
  steps?: RawTestStep[] | null
}

/** 后端原始缺陷结构 */
interface RawBugReport {
  id?: RawId
  testRunId?: RawId
  code?: string
  type?: string
  severity?: string
  title?: string
  description?: string
  expected?: string
  actual?: string
  steps?: string
  url?: string
  method?: string
  statusCode?: number
  console?: string
  network?: string
  backendLog?: string
  screenshotPath?: string
  owner?: string
  createdAt?: string
}

/** 后端原始测试运行结构 */
interface RawTestRun {
  id?: RawId
  conversationId?: RawId
  userId?: RawId
  iteration?: number
  status?: string
  summary?: string
  total?: number
  passed?: number
  failed?: number
  blocked?: number
  environment?: string
  scope?: string
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  cases?: RawTestCase[] | null
  bugs?: RawBugReport[] | null
}

/** 后端原始分页结构（service.ListTestRuns 返回 map） */
interface RawTestRunList {
  total?: number
  page?: number
  pageSize?: number
  list?: RawTestRun[] | null
}

/** 安全读取字符串 */
const toText = (value: unknown): string => (typeof value === 'string' ? value : '')

/** 安全读取数字 */
const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const SEVERITIES: readonly string[] = ['critical', 'high', 'medium', 'low']

/** 归一化严重程度（未知值按中等处理） */
const toSeverity = (value: unknown): BugSeverity =>
  typeof value === 'string' && SEVERITIES.includes(value) ? (value as BugSeverity) : 'medium'

/** 归一化步骤 */
const normalizeStep = (raw: RawTestStep): TestStep => ({
  id: normalizeId(raw.id),
  testCaseId: normalizeId(raw.testCaseId),
  stepIndex: toCount(raw.stepIndex),
  action: toText(raw.action),
  expected: toText(raw.expected),
  actual: toText(raw.actual),
  status: parseTestStatus(raw.status),
  screenshotPath: toText(raw.screenshotPath),
  createdAt: toText(raw.createdAt)
})

/** 归一化用例 */
const normalizeCase = (raw: RawTestCase): TestCase => ({
  id: normalizeId(raw.id),
  testRunId: normalizeId(raw.testRunId),
  name: toText(raw.name),
  type: toText(raw.type),
  status: parseTestStatus(raw.status),
  error: toText(raw.error),
  createdAt: toText(raw.createdAt),
  updatedAt: toText(raw.updatedAt),
  steps: Array.isArray(raw.steps) ? raw.steps.map(normalizeStep) : []
})

/** 归一化缺陷 */
const normalizeBug = (raw: RawBugReport): BugReport => ({
  id: normalizeId(raw.id),
  testRunId: normalizeId(raw.testRunId),
  code: toText(raw.code),
  type: toText(raw.type),
  severity: toSeverity(raw.severity),
  title: toText(raw.title),
  description: toText(raw.description),
  expected: toText(raw.expected),
  actual: toText(raw.actual),
  steps: toText(raw.steps),
  url: toText(raw.url),
  method: toText(raw.method),
  statusCode: toCount(raw.statusCode),
  console: toText(raw.console),
  network: toText(raw.network),
  backendLog: toText(raw.backendLog),
  screenshotPath: toText(raw.screenshotPath),
  owner: toText(raw.owner),
  createdAt: toText(raw.createdAt)
})

/** 归一化测试运行（cases / bugs 缺省时补空数组，避免模板判空） */
const normalizeRun = (raw?: RawTestRun | null): TestRun => {
  const source = raw ?? {}

  return {
    id: normalizeId(source.id),
    conversationId: normalizeId(source.conversationId),
    userId: normalizeId(source.userId),
    iteration: toCount(source.iteration),
    status: parseTestStatus(source.status),
    summary: toText(source.summary),
    total: toCount(source.total),
    passed: toCount(source.passed),
    failed: toCount(source.failed),
    blocked: toCount(source.blocked),
    environment: toText(source.environment),
    scope: toText(source.scope),
    startedAt: toText(source.startedAt),
    finishedAt: toText(source.finishedAt),
    createdAt: toText(source.createdAt),
    updatedAt: toText(source.updatedAt),
    cases: Array.isArray(source.cases) ? source.cases.map(normalizeCase) : [],
    bugs: Array.isArray(source.bugs) ? source.bugs.map(normalizeBug) : []
  }
}

/** 查询测试历史（分页；conversationId 不传表示当前用户全部测试） */
export const listTestRuns = async (
  params: ListTestRunsParams = {}
): Promise<TestRunListResult> => {
  const query: Record<string, string | number> = {}

  if (params.conversationId) query.conversationId = params.conversationId
  if (params.page && params.page > 0) query.page = params.page
  if (params.pageSize && params.pageSize > 0) query.pageSize = params.pageSize

  const { data } = await http.get<ApiResponse<RawTestRunList>>('/test/runs', { params: query })
  const payload = data?.data

  return {
    total: toCount(payload?.total),
    page: toCount(payload?.page),
    pageSize: toCount(payload?.pageSize),
    list: Array.isArray(payload?.list) ? payload.list.map((item) => normalizeRun(item)) : []
  }
}

/**
 * 查询某个会话最近一次测试
 *
 * 后端在「暂无测试记录」时返回 404，这是正常业务状态而非错误，
 * 因此这里归一化为 null（R4），调用方不得弹错误提示。
 */
export const getLatestTestRun = async (conversationId: string): Promise<TestRun | null> => {
  try {
    const { data } = await http.get<ApiResponse<RawTestRun>>('/test/latest-run', {
      params: { conversationId }
    })
    return normalizeRun(data?.data)
  } catch (error) {
    if (isApiError(error) && error.code === 404) return null
    throw error
  }
}

/** 查询单次测试详情（含用例、步骤、缺陷） */
export const getTestRun = async (id: string): Promise<TestRun> => {
  const { data } = await http.get<ApiResponse<RawTestRun>>(
    `/test/runs/${encodeURIComponent(id)}`
  )
  return normalizeRun(data?.data)
}

/** 后端事件类型白名单（白名单之外的事件静默忽略，R6） */
const TEST_EVENT_TYPES: readonly TestEventType[] = [
  'test_started',
  'test_case_started',
  'test_case_finished',
  'test_step_started',
  'test_step_passed',
  'test_step_failed',
  'test_step_blocked',
  'bug_found',
  'test_artifact_added',
  'test_finished'
]

const isTestEventType = (value: string): value is TestEventType =>
  (TEST_EVENT_TYPES as readonly string[]).includes(value)

/** 归一化单条事件负载；非法数据返回 null（丢弃，不影响后续事件） */
const normalizeEvent = (payload: unknown): TestEvent | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const record = payload as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''
  if (!type || !isTestEventType(type)) return null

  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {}

  return {
    type,
    testRunId: normalizeId(record.testRunId),
    sequence: toCount(record.sequence),
    timestamp: toCount(record.timestamp) || Date.now(),
    data
  }
}

export interface SubscribeTestEventsOptions {
  /** 测试运行 ID */
  testRunId: string
  /** 用于中止订阅 */
  signal: AbortSignal
  /** 收到一条事件 */
  onEvent: (event: TestEvent) => void
}

/**
 * 订阅测试过程事件（SSE）
 *
 * 必须使用 fetch + ReadableStream：EventSource 无法携带 Authorization 头（R5）。
 * 后端建连后会补发历史事件（上限 500 条），已结束的测试补发后立即断流；
 * 重复事件的去重由调用方按 sequence 处理（R7）。
 */
export const subscribeTestEvents = async (
  options: SubscribeTestEventsOptions
): Promise<void> => {
  const token = getToken()

  const response = await fetch(
    `${API_BASE_URL}/test/runs/${encodeURIComponent(options.testRunId)}/events`,
    {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: options.signal
    }
  )

  // 401 交给统一未授权处理（createApiError 会通知跳转登录页）
  if (response.status === 401) {
    throw createApiError('登录已失效，请重新登录', 401)
  }

  if (!response.ok || !response.body) {
    throw createApiError(`无法连接测试过程（${response.status}）`, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  let eventName = ''
  let dataLines: string[] = []

  /** 派发一个完整 SSE 帧 */
  const dispatch = (): void => {
    const name = eventName
    const raw = dataLines.join('\n')

    eventName = ''
    dataLines = []

    if (!name || !raw) return

    try {
      const event = normalizeEvent(JSON.parse(raw) as unknown)
      if (event) options.onEvent(event)
    } catch {
      // 非法帧丢弃，不影响后续事件
    }
  }

  /** 处理一行流数据 */
  const consumeLine = (line: string): void => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line

    // 空行 = 一个事件结束
    if (normalized === '') {
      dispatch()
      return
    }

    // 注释行（keep-alive）
    if (normalized.startsWith(':')) return

    if (normalized.startsWith('event:')) {
      eventName = normalized.slice(6).trim()
      return
    }

    if (normalized.startsWith('data:')) {
      dataLines.push(normalized.slice(5).replace(/^\s/, ''))
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true —— 保证多字节字符跨 chunk 不被截断
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      lines.forEach(consumeLine)
    }

    // 冲掉解码器与最后一段
    buffer += decoder.decode()
    if (buffer) consumeLine(buffer)
    dispatch()
  } catch (error) {
    // 主动中止不算错误
    if (isAbortError(error)) return
    throw error
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 忽略取消异常
    }
  }
}

/**
 * 下载测试产物（截图 / trace / report）
 *
 * 测试产物 `scope = "test"`，与用户代码产物完全分开，不能混进项目交付下载流程；
 * 后端不下发磁盘 path，只能按 id 走下载接口（R8）。
 */
export const downloadTestArtifact = async (
  artifactId: string,
  filename?: string
): Promise<void> => {
  if (!artifactId) throw new Error('产物 ID 无效，暂时无法下载')

  const url = `${API_BASE_URL}/test/artifacts/${encodeURIComponent(artifactId)}/download`
  await downloadAuthedFile(url, filename || `test-artifact-${artifactId}`)
}

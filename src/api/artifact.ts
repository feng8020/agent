/**
 * 产物信息接口 —— 后端产物的 API / 接口文档 / 测试结果 / 运行日志
 *
 * 对应后端 `backend/API-artifact-render.md`：
 * - GET /project/{id}/apis       接口清单
 * - GET /project/{id}/api-doc    接口文档
 * - GET /project/{id}/logs       运行日志
 * - GET /test/latest-run         最近一次测试（沿用既有接口）
 *
 * 说明：
 * 1. 「缺失」不是错误。文档 / 日志 / 测试在后端都以「200 + exists=false」或
 *    「404（无测试记录）」表达，这里统一归一化成「空」，由组件显示空态文案，
 *    不弹错误提示（产品需求 §5.5）。
 * 2. 本地草稿会话（id 以 draft_ 开头）尚未落库，后端无法定位，直接返回空。
 * 3. 代码内容（前 100 行）不走本模块：内容接口需要「相对会话工作区的 path」，
 *    而产物只带文件名，因此由 CodeBlock 用产物自身地址取文本后截断。
 */
import type { ApiResponse } from '@/types'
import { isDraftConversationId } from '@/utils/conversation'
import { http, isApiError, normalizeId } from './request'

/** 接口清单条目 */
export interface ApiListItem {
  method: string
  path: string
  summary: string
}

/** 接口清单结果 */
export interface ApiListResult {
  list: ApiListItem[]
  /** 解析来源：doc（接口文档）/ route（后端路由）/ empty（未解析到） */
  source: string
  count: number
}

/** 接口文档结果 */
export interface ApiDocResult {
  /** 相对会话工作区的路径；不存在时为空串 */
  path: string
  content: string
  exists: boolean
}

/** 运行日志结果 */
export interface RunLogsResult {
  /** 可用日志文件名列表 */
  files: string[]
  name: string
  content: string
  exists: boolean
  lines: number
}

/** 测试用例摘要 */
export interface TestCaseSummary {
  name: string
  status: string
  error: string
}

/** 最近一次测试摘要；null 表示未测试 */
export interface TestRunSummary {
  id: string
  status: string
  total: number
  passed: number
  failed: number
  blocked: number
  summary: string
  cases: TestCaseSummary[]
}

/** 后端返回的原始结构（字段可能缺省，全部需要归一化） */
interface RawApiList {
  list?: unknown
  source?: unknown
  count?: unknown
}

interface RawApiDoc {
  path?: unknown
  content?: unknown
  exists?: unknown
}

interface RawRunLogs {
  files?: unknown
  name?: unknown
  content?: unknown
  exists?: unknown
  lines?: unknown
}

interface RawTestCase {
  name?: unknown
  status?: unknown
  error?: unknown
}

interface RawTestRun {
  id?: unknown
  status?: unknown
  total?: unknown
  passed?: unknown
  failed?: unknown
  blocked?: unknown
  summary?: unknown
  cases?: unknown
}

const toNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const toText = (value: unknown): string => (typeof value === 'string' ? value : '')

const normalizeApiItems = (raw: unknown): ApiListItem[] => {
  if (!Array.isArray(raw)) return []

  return raw.reduce<ApiListItem[]>((list, entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return list
    const record = entry as Record<string, unknown>
    const method = toText(record.method).toUpperCase()
    const path = toText(record.path)
    if (!method || !path) return list

    list.push({ method, path, summary: toText(record.summary) })
    return list
  }, [])
}

const normalizeTestCases = (raw: unknown): TestCaseSummary[] => {
  if (!Array.isArray(raw)) return []

  return raw.reduce<TestCaseSummary[]>((list, entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return list
    const record = entry as RawTestCase
    const name = toText(record.name)
    if (!name) return list

    list.push({ name, status: toText(record.status), error: toText(record.error) })
    return list
  }, [])
}

/** 查询接口清单（API Tab） */
export const fetchApiList = async (conversationId: string): Promise<ApiListResult> => {
  if (isDraftConversationId(conversationId)) {
    return { list: [], source: 'empty', count: 0 }
  }

  const { data } = await http.get<ApiResponse<RawApiList>>(
    `/project/${encodeURIComponent(conversationId)}/apis`
  )

  const payload: RawApiList = data?.data ?? {}
  const list = normalizeApiItems(payload.list)

  return {
    list,
    source: toText(payload.source) || 'empty',
    count: typeof payload.count === 'number' ? payload.count : list.length
  }
}

/** 查询接口文档（接口文档 Tab） */
export const fetchApiDoc = async (conversationId: string): Promise<ApiDocResult> => {
  if (isDraftConversationId(conversationId)) {
    return { path: '', content: '', exists: false }
  }

  const { data } = await http.get<ApiResponse<RawApiDoc>>(
    `/project/${encodeURIComponent(conversationId)}/api-doc`
  )

  const payload: RawApiDoc = data?.data ?? {}

  return {
    path: toText(payload.path),
    content: toText(payload.content),
    exists: payload.exists === true
  }
}

/** 查询运行日志（运行日志 Tab） */
export const fetchRunLogs = async (
  conversationId: string,
  lines = 200
): Promise<RunLogsResult> => {
  if (isDraftConversationId(conversationId)) {
    return { files: [], name: '', content: '', exists: false, lines }
  }

  const { data } = await http.get<ApiResponse<RawRunLogs>>(
    `/project/${encodeURIComponent(conversationId)}/logs`,
    { params: { lines } }
  )

  const payload: RawRunLogs = data?.data ?? {}
  const files = Array.isArray(payload.files)
    ? payload.files.filter((item): item is string => typeof item === 'string')
    : []

  return {
    files,
    name: toText(payload.name),
    content: toText(payload.content),
    exists: payload.exists === true,
    lines: typeof payload.lines === 'number' ? payload.lines : lines
  }
}

/**
 * 查询该会话最近一次测试结果（测试结果 Tab）
 *
 * 返回 null 表示「未测试」（后端 404）。
 * 其余失败（网络 / 500）继续抛出，由组件显示错误态与重试。
 */
export const fetchLatestTestRun = async (
  conversationId: string
): Promise<TestRunSummary | null> => {
  if (isDraftConversationId(conversationId)) return null

  try {
    const { data } = await http.get<ApiResponse<RawTestRun>>('/test/latest-run', {
      params: { conversationId }
    })

    const payload: RawTestRun | undefined = data?.data
    if (!payload) return null

    return {
      id: normalizeId(payload.id),
      status: toText(payload.status),
      total: toNumber(payload.total),
      passed: toNumber(payload.passed),
      failed: toNumber(payload.failed),
      blocked: toNumber(payload.blocked),
      summary: toText(payload.summary),
      cases: normalizeTestCases(payload.cases)
    }
  } catch (error) {
    // 404 = 该会话从未跑过测试 → 未测试（产品需求 §5.5）
    if (isApiError(error) && Number(error.code) === 404) return null
    throw error
  }
}

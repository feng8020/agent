/**
 * 测试域类型 —— 对应后端 `backend/model/test.go` 的
 * TestRun / TestCase / TestStep / BugReport / TestArtifact。
 *
 * 约定（与 `types/index.ts` 不同，务必注意）：
 * - 后端测试域 JSON 全部使用 camelCase（见 model 的 json tag），本文件严格跟随，
 *   不要套用其它领域类型里的 snake_case 习惯。
 * - 后端 ID 为 uint64（JSON 下发 number），已在 `api/test.ts` 统一归一化为 string，
 *   因此这里所有 id 字段都是 string，应用层不必再做 String() 转换。
 */

/** 测试状态（后端 model.TestStatus）；pending / running 是执行期内部状态 */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'blocked' | 'skipped'

/** 缺陷严重程度（后端 model.BugSeverity） */
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'

/** 测试步骤 */
export interface TestStep {
  id: string
  testCaseId: string
  /** 步骤序号，从 1 开始 */
  stepIndex: number
  action: string
  expected: string
  actual: string
  status: TestStatus
  /**
   * 失败步骤的截图路径
   *
   * 后端只下发工作区相对路径，不提供可直接访问的地址；
   * 前端仅作证据文本展示，禁止自行拼成图片 URL。
   */
  screenshotPath: string
  createdAt: string
}

/** 测试用例 */
export interface TestCase {
  id: string
  testRunId: string
  name: string
  /** ui / api / integration / e2e / regression / download —— 后端为自由字符串 */
  type: string
  status: TestStatus
  /** 失败原因 */
  error: string
  createdAt: string
  updatedAt: string
  steps: TestStep[]
}

/** 缺陷（含证据链） */
export interface BugReport {
  id: string
  testRunId: string
  /** BUG-001 形式编号 */
  code: string
  /** frontend / backend / api / database / integration / ui / performance / environment */
  type: string
  severity: BugSeverity
  title: string
  description: string
  expected: string
  actual: string
  /** 复现步骤：后端存的是 JSON 数组字符串，展示前用 parseBugSteps 解析 */
  steps: string
  url: string
  method: string
  statusCode: number
  /** 证据链，均为 JSON 字符串 */
  console: string
  network: string
  backendLog: string
  screenshotPath: string
  /** 归属判断 */
  owner: string
  createdAt: string
}

/** 一次测试运行 */
export interface TestRun {
  id: string
  conversationId: string
  userId: string
  /** 自动修复闭环中的轮次 */
  iteration: number
  status: TestStatus
  summary: string
  total: number
  passed: number
  failed: number
  blocked: number
  /** 环境检查结果（JSON 字符串） */
  environment: string
  scope: string
  /** 未开始 / 未结束时为空字符串 */
  startedAt: string
  finishedAt: string
  createdAt: string
  updatedAt: string
  /**
   * 用例与缺陷
   *
   * 列表接口（`GET /test/runs`）不做 Preload，返回空数组；
   * 只有详情接口（`GET /test/runs/:id`）才带完整内容。
   */
  cases: TestCase[]
  bugs: BugReport[]
}

/** 测试产物（截图 / trace / video / report），scope 固定为 test */
export interface TestArtifact {
  id: string
  testRunId: string
  scope: string
  kind: string
  name: string
  size: number
  createdAt: string
}

/** 测试历史分页结果 */
export interface TestRunListResult {
  total: number
  page: number
  pageSize: number
  list: TestRun[]
}

/** 分页查询参数 */
export interface ListTestRunsParams {
  /** 会话 ID；不传表示查询当前用户全部测试 */
  conversationId?: string
  page?: number
  pageSize?: number
}

/** SSE 事件类型（后端 service/testhub.go） */
export type TestEventType =
  | 'test_started'
  | 'test_case_started'
  | 'test_case_finished'
  | 'test_step_started'
  | 'test_step_passed'
  | 'test_step_failed'
  | 'test_step_blocked'
  | 'bug_found'
  | 'test_artifact_added'
  | 'test_finished'

/**
 * 测试过程事件
 *
 * `data` 为可变负载：各事件字段不同，且后端工具后续可能扩展字段，
 * 因此这里用 Record<string, unknown>，由 `utils/test` 的读取函数做类型守卫，
 * 避免把猜测的字段名固化成类型契约。
 */
export interface TestEvent {
  type: TestEventType
  testRunId: string
  /** 同一 testRun 内自增；后端建连会补发历史事件，前端必须按它去重 */
  sequence: number
  /** 毫秒时间戳 */
  timestamp: number
  data: Record<string, unknown>
}

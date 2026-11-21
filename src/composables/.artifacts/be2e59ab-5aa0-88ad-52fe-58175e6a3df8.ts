/**
 * 当前会话的测试结果（持久化数据 + 实时过程）
 *
 * 职责：
 * - 拉取会话最近一次测试（`/test/latest-run`；404 已由 api 层归一化为 null）
 * - 订阅该测试的 SSE 过程事件，按 sequence 去重（后端会补发历史事件）
 * - 收到终态 / 缺陷事件后刷新详情，保证汇总与用例状态和后端一致
 * - 累积测试产物（后端没有产物列表接口，只能从 test_artifact_added 事件获得）
 *
 * 说明：产物列表为空不是异常 —— 历史测试不会重放事件，
 * 界面必须给出明确说明，不能显示成错误或破图。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import * as testApi from '@/api/test'
import { getErrorMessage, isAbortError } from '@/api/request'
import type { TestArtifact, TestEvent, TestRun, TestStatus } from '@/types/test'
import { isDraftConversationId } from '@/utils/conversation'
import { parseTestStatus, readId, readNumber, readString } from '@/utils/test'
import { useToast } from '@/composables/useToast'

/** 时间线最多保留的事件条数（防御性上限，避免长时间测试撑爆内存） */
const MAX_EVENTS = 300

/** 收到变更类事件后刷新详情的防抖间隔（毫秒） */
const REFRESH_DELAY = 400

export const useTestRunResult = () => {
  const toast = useToast()

  const run = ref<TestRun | null>(null)
  const loading = ref(false)
  const error = ref('')
  const events = ref<TestEvent[]>([])
  const eventsError = ref('')
  const artifacts = ref<TestArtifact[]>([])
  /** 实时状态：事件比详情更新，用于状态徽标 */
  const liveStatus = ref<TestStatus | ''>('')

  /** 当前会话是否存在测试记录（顶部入口是否显示） */
  const hasResult = computed(() => Boolean(run.value))

  let controller: AbortController | null = null
  let seenKeys = new Set<string>()
  let currentRunId = ''
  let requestSeq = 0
  let refreshTimer: number | null = null

  const clearRefresh = (): void => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  const stopEvents = (): void => {
    clearRefresh()
    controller?.abort()
    controller = null
    currentRunId = ''
  }

  /** 从事件负载里提取产物（字段与 model.TestArtifact 对应，缺少 id 则丢弃） */
  const pickArtifact = (event: TestEvent): TestArtifact | null => {
    if (event.type !== 'test_artifact_added') return null

    const id = readId(event.data, 'id') || readId(event.data, 'artifactId')
    if (!id) return null

    return {
      id,
      testRunId: event.testRunId,
      scope: readString(event.data, 'scope') || 'test',
      kind: readString(event.data, 'kind'),
      name: readString(event.data, 'name') || `产物 ${id}`,
      size: readNumber(event.data, 'size'),
      createdAt: new Date(event.timestamp).toISOString()
    }
  }

  /** 重新拉取详情（失败时保留已有内容，避免界面闪成错误态） */
  const refresh = async (): Promise<void> => {
    const id = run.value?.id
    if (!id) return

    try {
      const detail = await testApi.getTestRun(id)
      run.value = detail
      liveStatus.value = detail.status
    } catch {
      // 静默：SSE 仍可能在推送，不应因为一次详情刷新失败就清空界面
    }
  }

  const scheduleRefresh = (): void => {
    clearRefresh()
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null
      void refresh()
    }, REFRESH_DELAY)
  }

  /** 处理一条实时事件 */
  const handleEvent = (event: TestEvent): void => {
    const key = `${event.testRunId}:${event.sequence}`
    if (seenKeys.has(key)) return
    seenKeys.add(key)

    events.value.push(event)
    if (events.value.length > MAX_EVENTS) {
      events.value.splice(0, events.value.length - MAX_EVENTS)
    }

    if (event.type === 'test_started') {
      liveStatus.value = 'running'
    }

    if (event.type === 'test_case_finished') {
      const status = parseTestStatus(event.data['status'])
      if (status === 'failed' || status === 'blocked') liveStatus.value = status
    }

    if (event.type === 'test_finished') {
      liveStatus.value = parseTestStatus(event.data['status'])
    }

    const artifact = pickArtifact(event)
    if (artifact && !artifacts.value.some((item) => item.id === artifact.id)) {
      artifacts.value.push(artifact)
    }

    // 汇总 / 用例状态由后端重算，终态与缺陷事件后必须回拉一次详情
    if (event.type === 'test_finished' || event.type === 'bug_found') {
      scheduleRefresh()
    }
  }

  const startEvents = (testRunId: string): void => {
    stopEvents()
    eventsError.value = ''
    if (!testRunId) return

    currentRunId = testRunId
    controller = new AbortController()
    const signal = controller.signal

    void (async () => {
      try {
        await testApi.subscribeTestEvents({ testRunId, signal, onEvent: handleEvent })
      } catch (err) {
        if (signal.aborted || isAbortError(err)) return
        if (currentRunId === testRunId) {
          eventsError.value = getErrorMessage(err)
        }
      }
    })()
  }

  /**
   * 加载某个会话最近一次测试
   *
   * 草稿会话（draft_xxx）尚未落库，后端无法定位，直接清空。
   */
  const loadLatest = async (conversationId: string): Promise<void> => {
    const seq = (requestSeq += 1)

    stopEvents()
    seenKeys = new Set<string>()
    events.value = []
    artifacts.value = []
    eventsError.value = ''
    liveStatus.value = ''
    error.value = ''

    if (!conversationId || isDraftConversationId(conversationId)) {
      run.value = null
      loading.value = false
      return
    }

    loading.value = true

    try {
      const latest = await testApi.getLatestTestRun(conversationId)
      if (seq !== requestSeq) return

      run.value = latest
      if (latest) {
        liveStatus.value = latest.status
        startEvents(latest.id)
      }
    } catch (err) {
      if (seq !== requestSeq) return
      run.value = null
      error.value = getErrorMessage(err)
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  /** 下载单个测试产物 */
  const downloadArtifact = async (artifact: TestArtifact): Promise<void> => {
    try {
      await testApi.downloadTestArtifact(artifact.id, artifact.name)
      toast.success(`已开始下载 ${artifact.name}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // 组件卸载时释放 SSE，避免连接悬挂
  onBeforeUnmount(stopEvents)

  return {
    run,
    loading,
    error,
    events,
    eventsError,
    artifacts,
    liveStatus,
    hasResult,
    loadLatest,
    refresh,
    downloadArtifact
  }
}

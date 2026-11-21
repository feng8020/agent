<script setup lang="ts">
/**
 * 测试结果面板（右侧第三态）
 *
 * 与产物预览（artifact）、浏览器画面（test）共用 ChatLayout 的 #preview 插槽，
 * 由 ChatView 通过 previewVariant 决定渲染哪一个。
 *
 * 本组件只做容器：加载 / 错误 / 空 / 五个分页（概览、用例、缺陷、过程、产物）。
 * 数据加载与 SSE 订阅在 useTestRunResult 中，这里不直接调接口。
 */
import { computed, ref } from 'vue'
import type { TestArtifact, TestEvent, TestRun, TestStatus } from '@/types/test'
import AppEmpty from '@/components/common/AppEmpty.vue'
import AppErrorState from '@/components/common/AppErrorState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import AppTabs from '@/components/common/AppTabs.vue'
import type { TabItem } from '@/components/common/types'
import { TEST_STATUS_LABELS, TEST_STATUS_TONES } from '@/utils/test'
import TestRunSummary from './TestRunSummary.vue'
import TestCaseList from './TestCaseList.vue'
import BugReportList from './BugReportList.vue'
import TestEventTimeline from './TestEventTimeline.vue'
import TestArtifactList from './TestArtifactList.vue'

const props = withDefaults(
  defineProps<{
    /** 当前会话最近一次测试；null 表示暂无测试记录 */
    run: TestRun | null
    loading?: boolean
    error?: string
    /** SSE 实时过程事件（已去重） */
    events?: TestEvent[]
    /** 事件流连接错误 */
    eventsError?: string
    /** 测试产物（来自 test_artifact_added 事件） */
    artifacts?: TestArtifact[]
    /** 实时状态，优先级高于持久化状态 */
    liveStatus?: TestStatus | ''
  }>(),
  {
    loading: false,
    error: '',
    events: () => [],
    eventsError: '',
    artifacts: () => [],
    liveStatus: ''
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'retry'): void
  (e: 'refresh'): void
  (e: 'download', artifact: TestArtifact): void
}>()

const active = ref('summary')

const tabs = computed<TabItem[]>(() => [
  { label: '概览', value: 'summary' },
  { label: `用例 ${props.run?.cases.length ?? 0}`, value: 'cases' },
  { label: `缺陷 ${props.run?.bugs.length ?? 0}`, value: 'bugs' },
  { label: `过程 ${props.events.length}`, value: 'events' },
  { label: `产物 ${props.artifacts.length}`, value: 'artifacts' }
])

const status = computed<TestStatus>(() => props.liveStatus || props.run?.status || 'pending')
const statusLabel = computed(() => TEST_STATUS_LABELS[status.value])
const tone = computed(() => TEST_STATUS_TONES[status.value])

const handleDownload = (artifact: TestArtifact): void => {
  emit('download', artifact)
}
</script>

<template>
  <section class="test-result" aria-label="测试结果">
    <header class="test-result__header">
      <span class="test-result__title">测试结果</span>
      <span class="test-result__status" :class="`is-${tone}`">{{ statusLabel }}</span>

      <button
        v-if="run"
        type="button"
        class="test-result__action"
        title="刷新测试结果"
        aria-label="刷新测试结果"
        @click="emit('refresh')"
      >
        <AppIcon name="regenerate" :size="14" />
      </button>

      <button
        type="button"
        class="test-result__action test-result__action--close"
        title="关闭测试结果"
        aria-label="关闭测试结果"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <AppTabs v-if="run" v-model="active" :tabs="tabs" class="test-result__tabs" />

    <div class="test-result__body">
      <div v-if="loading && !run" class="test-result__center">
        <AppSpinner :size="20" />
        <span class="test-result__hint">正在加载测试结果…</span>
      </div>

      <AppErrorState
        v-else-if="error"
        class="test-result__scroll"
        :message="error"
        description="测试结果加载失败，请重试"
        @retry="emit('retry')"
      />

      <AppEmpty
        v-else-if="!run"
        class="test-result__scroll"
        icon="check"
        title="暂无测试结果"
        description="该会话还没有执行过测试"
      />

      <template v-else>
        <TestRunSummary
          v-if="active === 'summary'"
          :run="run"
          :live-status="liveStatus"
          class="test-result__scroll"
        />

        <TestCaseList
          v-else-if="active === 'cases'"
          :cases="run.cases"
          class="test-result__scroll"
        />

        <BugReportList
          v-else-if="active === 'bugs'"
          :bugs="run.bugs"
          class="test-result__scroll"
        />

        <TestEventTimeline
          v-else-if="active === 'events'"
          :events="events"
          :error="eventsError"
        />

        <TestArtifactList
          v-else
          :artifacts="artifacts"
          class="test-result__scroll"
          @download="handleDownload"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.test-result {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--color-surface);
}

.test-result__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
  height: var(--size-header-height);
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

.test-result__title {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.test-result__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--font-size-micro);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
}

.test-result__status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: currentColor;
}

.test-result__status.is-success {
  color: var(--color-success);
}

.test-result__status.is-error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.test-result__status.is-warning {
  color: var(--color-warning);
}

.test-result__status.is-running {
  color: var(--color-primary);
}

/* 刷新按钮靠右（关闭按钮固定在最右） */
.test-result__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: auto;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.test-result__action:hover {
  background-color: var(--color-hover);
  color: var(--color-text-primary);
}

.test-result__action--close {
  margin-left: 0;
  font-size: 18px;
}

/* Tabs 间距收紧（AppTabs 默认 88px，面板内放不下） */
.test-result__tabs {
  --tabs-gap: var(--space-4);
  flex: none;
  padding: 0 var(--space-4);
}

.test-result__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.test-result__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.test-result__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex: 1;
  min-height: 0;
  color: var(--color-text-tertiary);
}

.test-result__hint {
  font-size: var(--font-size-caption);
  color: var(--color-text-tertiary);
}

@media (max-width: 767px) {
  .test-result {
    border-radius: 0;
  }

  .test-result__header {
    height: 44px;
    padding: 0 var(--space-3);
  }
}
</style>

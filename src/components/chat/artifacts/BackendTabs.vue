<script setup lang="ts">
/**
 * 后端信息 Tab —— API / 接口文档 / 测试结果 / 运行日志
 *
 * 纯后端产物不能像网页那样预览，改为可查的四类信息（需求 §5.5）。
 *
 * 关键状态约定：
 * - 未跑测试 → 「测试结果」Tab 显示「未测试」，绝不显示「通过」或留白
 * - 无接口文档 / 无日志 → 明确空态文案，不报错
 * - 草稿会话（draft_）拿不到后端数据 → api 层直接返回空，不产生失败请求
 */
import { computed, onMounted, ref } from 'vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import AppTabs from '@/components/common/AppTabs.vue'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer.vue'
import type { TabItem } from '@/components/common/types'
import {
  fetchApiDoc,
  fetchApiList,
  fetchLatestTestRun,
  fetchRunLogs,
  type ApiListItem,
  type TestRunSummary
} from '@/api/artifact'
import { getErrorMessage } from '@/api/request'

const props = defineProps<{
  /** 产物所属会话 id（Attachment.conversationId） */
  conversationId: string
}>()

const emit = defineEmits<{
  /** 测试状态变化：untested / passed / failed / blocked */
  (e: 'status', value: string): void
}>()

const TABS: TabItem[] = [
  { label: 'API', value: 'api' },
  { label: '接口文档', value: 'doc' },
  { label: '测试结果', value: 'test' },
  { label: '运行日志', value: 'logs' }
]

/** 失败用例最多展示条数（超出显示「另有 N 条」） */
const FAILED_CASE_LIMIT = 5

const activeTab = ref('api')

const apiLoading = ref(true)
const apiError = ref('')
const apiList = ref<ApiListItem[]>([])

const docLoading = ref(true)
const docError = ref('')
const docContent = ref('')
const docExists = ref(false)

const testLoading = ref(true)
const testError = ref('')
const testRun = ref<TestRunSummary | null>(null)

const logsLoading = ref(true)
const logsError = ref('')
const logsContent = ref('')
const logsExists = ref(false)

const failedCases = computed(() => {
  const run = testRun.value
  if (!run) return []

  return run.cases
    .filter((item) => item.status === 'failed')
    .slice(0, FAILED_CASE_LIMIT)
})

const extraFailedCount = computed(() => {
  const run = testRun.value
  if (!run) return 0

  const total = run.cases.filter((item) => item.status === 'failed').length

  return Math.max(total - failedCases.value.length, 0)
})

const loadApiList = async (): Promise<void> => {
  apiLoading.value = true
  apiError.value = ''
  try {
    const result = await fetchApiList(props.conversationId)
    apiList.value = result.list
  } catch (error) {
    apiError.value = getErrorMessage(error)
  } finally {
    apiLoading.value = false
  }
}

const loadApiDoc = async (): Promise<void> => {
  docLoading.value = true
  docError.value = ''
  try {
    const result = await fetchApiDoc(props.conversationId)
    docContent.value = result.content
    docExists.value = result.exists
  } catch (error) {
    docError.value = getErrorMessage(error)
  } finally {
    docLoading.value = false
  }
}

const loadTestRun = async (): Promise<void> => {
  testLoading.value = true
  testError.value = ''
  try {
    const run = await fetchLatestTestRun(props.conversationId)
    testRun.value = run
    emit('status', run ? run.status : 'untested')
  } catch (error) {
    testRun.value = null
    testError.value = getErrorMessage(error)
    emit('status', 'untested')
  } finally {
    testLoading.value = false
  }
}

const loadLogs = async (): Promise<void> => {
  logsLoading.value = true
  logsError.value = ''
  try {
    const result = await fetchRunLogs(props.conversationId)
    logsContent.value = result.content
    logsExists.value = result.exists
  } catch (error) {
    logsError.value = getErrorMessage(error)
  } finally {
    logsLoading.value = false
  }
}

onMounted(() => {
  void loadApiList()
  void loadApiDoc()
  void loadTestRun()
  void loadLogs()
})
</script>

<template>
  <div class="backend-tabs">
    <div class="backend-tabs__bar">
      <AppTabs v-model="activeTab" :tabs="TABS" />
    </div>

    <div class="backend-tabs__body" role="tabpanel">
      <!-- ===== API ===== -->
      <template v-if="activeTab === 'api'">
        <div v-if="apiLoading" class="backend-tabs__state">
          <AppSpinner :size="16" />
          <span>正在读取接口清单…</span>
        </div>

        <div v-else-if="apiError" class="backend-tabs__state is-error">
          <span>{{ apiError }}</span>
          <button type="button" class="backend-tabs__retry" @click="loadApiList">重试</button>
        </div>

        <ul v-else-if="apiList.length" class="api-list">
          <li
            v-for="item in apiList"
            :key="`${item.method} ${item.path}`"
            class="api-list__row"
          >
            <span class="api-list__method">{{ item.method }}</span>
            <code class="api-list__path" :title="item.path">{{ item.path }}</code>
            <span v-if="item.summary" class="api-list__summary" :title="item.summary">
              {{ item.summary }}
            </span>
          </li>
        </ul>

        <div v-else class="artifact-empty">
          <p class="artifact-empty__title">暂无接口清单</p>
          <p class="artifact-empty__desc">未在项目中发现接口文档或后端路由</p>
        </div>
      </template>

      <!-- ===== 接口文档 ===== -->
      <template v-else-if="activeTab === 'doc'">
        <div v-if="docLoading" class="backend-tabs__state">
          <AppSpinner :size="16" />
          <span>正在读取接口文档…</span>
        </div>

        <div v-else-if="docError" class="backend-tabs__state is-error">
          <span>{{ docError }}</span>
          <button type="button" class="backend-tabs__retry" @click="loadApiDoc">重试</button>
        </div>

        <MarkdownRenderer v-else-if="docExists" :content="docContent" />

        <div v-else class="artifact-empty">
          <p class="artifact-empty__title">暂无接口文档</p>
          <p class="artifact-empty__desc">项目中未找到 API.md</p>
        </div>
      </template>

      <!-- ===== 测试结果 ===== -->
      <template v-else-if="activeTab === 'test'">
        <div v-if="testLoading" class="backend-tabs__state">
          <AppSpinner :size="16" />
          <span>正在读取测试结果…</span>
        </div>

        <div v-else-if="testError" class="backend-tabs__state is-error">
          <span>{{ testError }}</span>
          <button type="button" class="backend-tabs__retry" @click="loadTestRun">重试</button>
        </div>

        <!-- 未测试：用户确认过的文案 -->
        <div v-else-if="!testRun" class="artifact-empty">
          <p class="artifact-empty__title">未测试</p>
          <p class="artifact-empty__desc">运行测试后可查看结果</p>
        </div>

        <template v-else>
          <p class="test-summary">
            共 {{ testRun.total }} · 通过 {{ testRun.passed }} · 失败 {{ testRun.failed }} ·
            阻塞 {{ testRun.blocked }}
          </p>

          <p v-if="testRun.summary" class="test-summary__text">{{ testRun.summary }}</p>

          <ul v-if="failedCases.length" class="test-failures">
            <li v-for="item in failedCases" :key="item.name" class="test-failures__row">
              <span class="test-failures__name">{{ item.name }}</span>
              <span v-if="item.error" class="test-failures__error">{{ item.error }}</span>
            </li>
          </ul>

          <p v-if="extraFailedCount" class="test-summary__extra">
            另有 {{ extraFailedCount }} 条失败用例
          </p>
        </template>
      </template>

      <!-- ===== 运行日志 ===== -->
      <template v-else>
        <div v-if="logsLoading" class="backend-tabs__state">
          <AppSpinner :size="16" />
          <span>正在读取运行日志…</span>
        </div>

        <div v-else-if="logsError" class="backend-tabs__state is-error">
          <span>{{ logsError }}</span>
          <button type="button" class="backend-tabs__retry" @click="loadLogs">重试</button>
        </div>

        <pre v-else-if="logsExists" class="logs">{{ logsContent }}</pre>

        <div v-else class="artifact-empty">
          <p class="artifact-empty__title">暂无运行日志</p>
          <p class="artifact-empty__desc">运行测试启动服务后会生成日志</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.backend-tabs {
  /* AppTabs 默认 gap 88px 是按设置页设计的，消息内必须压缩 */
  --tabs-gap: 20px;
}

.backend-tabs__bar {
  padding: 0 var(--space-3);
}

.backend-tabs__body {
  max-height: var(--size-artifact-tab-body-max-height);
  padding: var(--space-3) var(--space-4);
  overflow: auto;
}

.backend-tabs__state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 72px;
  font-size: var(--font-size-caption);
  color: var(--color-text-tertiary);
}

.backend-tabs__state.is-error {
  color: var(--color-error);
}

.backend-tabs__retry {
  padding: 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---- API 列表 ---- */
.api-list {
  display: flex;
  flex-direction: column;
}

.api-list__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 32px;
  border-bottom: 1px solid var(--color-border);
}

.api-list__row:last-child {
  border-bottom: 0;
}

.api-list__method {
  flex: none;
  min-width: 42px;
  height: 20px;
  font-family: var(--font-family-mono);
  font-size: 10px;
  line-height: 20px;
  color: var(--color-text-secondary);
  text-align: center;
  background-color: var(--color-hover);
  border-radius: 5px;
}

.api-list__path {
  flex: none;
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-family-mono);
  font-size: 12px;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-list__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 测试结果 ---- */
.test-summary {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.test-summary__text {
  margin-top: var(--space-2);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.test-summary__extra {
  margin-top: var(--space-2);
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.test-failures {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.test-failures__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.test-failures__name {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.test-failures__error {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ---- 运行日志 ---- */
.logs {
  margin: 0;
  font-family: var(--font-family-mono);
  font-size: 12px;
  line-height: 20px;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 767px) {
  .backend-tabs {
    --tabs-gap: 16px;
  }

  .api-list__summary {
    display: none;
  }
}
</style>

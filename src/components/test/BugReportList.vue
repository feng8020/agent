<script setup lang="ts">
/**
 * 缺陷列表：编号 / 严重程度 / 归属 + 可展开的证据链。
 *
 * 后端把 steps / console / network / backendLog 都存成 JSON 字符串，
 * 这里统一交给 utils/test 解析；解析失败时原样展示，不隐藏真实内容。
 */
import { computed } from 'vue'
import type { BugReport } from '@/types/test'
import AppEmpty from '@/components/common/AppEmpty.vue'
import {
  BUG_SEVERITY_LABELS,
  bugSeverityTone,
  bugTypeLabel,
  formatEvidence,
  hasBugEvidence,
  parseBugSteps
} from '@/utils/test'

const props = defineProps<{
  bugs: BugReport[]
}>()

const list = computed(() => props.bugs)

const severityLabel = (severity: string): string => BUG_SEVERITY_LABELS[severity] ?? severity

const stepsOf = (bug: BugReport): string[] => parseBugSteps(bug.steps)
</script>

<template>
  <div class="bug-list">
    <AppEmpty
      v-if="list.length === 0"
      icon="check"
      title="暂无缺陷"
      description="本次测试没有记录缺陷"
    />

    <template v-else>
      <details v-for="bug in list" :key="bug.id" class="bug">
        <summary class="bug__summary">
          <span class="bug__dot" :class="`is-${bugSeverityTone(bug.severity)}`" />
          <span class="bug__code">{{ bug.code || `#${bug.id}` }}</span>
          <span class="bug__title">{{ bug.title || '未命名缺陷' }}</span>
          <span class="bug__severity" :class="`is-${bugSeverityTone(bug.severity)}`">
            {{ severityLabel(bug.severity) }}
          </span>
        </summary>

        <div class="bug__body">
          <div class="bug__tags">
            <span class="tag">{{ bugTypeLabel(bug.type) }}</span>
            <span v-if="bug.owner" class="tag">归属：{{ bugTypeLabel(bug.owner) }}</span>
            <span v-if="bug.method || bug.statusCode" class="tag">
              {{ bug.method }} {{ bug.statusCode }}
            </span>
          </div>

          <p v-if="bug.description" class="bug__text">{{ bug.description }}</p>

          <div v-if="bug.expected" class="evidence">
            <span class="evidence__label">预期</span>
            <p class="evidence__value">{{ bug.expected }}</p>
          </div>

          <div v-if="bug.actual" class="evidence">
            <span class="evidence__label">实际</span>
            <p class="evidence__value">{{ bug.actual }}</p>
          </div>

          <div v-if="bug.url" class="evidence">
            <span class="evidence__label">地址</span>
            <p class="evidence__value evidence__value--mono">{{ bug.url }}</p>
          </div>

          <div v-if="stepsOf(bug).length" class="evidence">
            <span class="evidence__label">复现步骤</span>
            <ol class="evidence__steps">
              <li v-for="(step, index) in stepsOf(bug)" :key="index" class="evidence__step">
                {{ step }}
              </li>
            </ol>
          </div>

          <div v-if="formatEvidence(bug.console)" class="evidence">
            <span class="evidence__label">控制台</span>
            <pre class="evidence__code">{{ formatEvidence(bug.console) }}</pre>
          </div>

          <div v-if="formatEvidence(bug.network)" class="evidence">
            <span class="evidence__label">网络</span>
            <pre class="evidence__code">{{ formatEvidence(bug.network) }}</pre>
          </div>

          <div v-if="formatEvidence(bug.backendLog)" class="evidence">
            <span class="evidence__label">后端日志</span>
            <pre class="evidence__code">{{ formatEvidence(bug.backendLog) }}</pre>
          </div>

          <div v-if="bug.screenshotPath" class="evidence">
            <span class="evidence__label">截图</span>
            <p class="evidence__value evidence__value--mono">{{ bug.screenshotPath }}</p>
          </div>

          <p v-if="!hasBugEvidence(bug)" class="bug__hint">该缺陷没有附带证据</p>
        </div>
      </details>
    </template>
  </div>
</template>

<style scoped>
.bug-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.bug {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  overflow: hidden;
}

.bug__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  cursor: pointer;
  list-style: none;
}

.bug__summary::-webkit-details-marker {
  display: none;
}

.bug__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-text-tertiary);
}

.bug__dot.is-error {
  background-color: var(--color-error);
}

.bug__dot.is-warning {
  background-color: var(--color-warning);
}

.bug__code {
  flex: none;
  font-size: var(--font-size-micro);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-tertiary);
}

.bug__title {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bug__severity {
  flex: none;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.bug__severity.is-error {
  color: var(--color-error);
}

.bug__severity.is-warning {
  color: var(--color-warning);
}

.bug__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.bug__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: 1px 6px;
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
  border-radius: var(--radius-sm);
}

.bug__text {
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  word-break: break-word;
}

.bug__hint {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.evidence {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.evidence__label {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.evidence__value {
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  word-break: break-word;
}

.evidence__value--mono {
  font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
}

.evidence__steps {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: var(--space-4);
  list-style: decimal;
}

.evidence__step {
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  word-break: break-word;
}

.evidence__code {
  max-height: 220px;
  padding: var(--space-2);
  overflow: auto;
  font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

<script setup lang="ts">
/**
 * 测试用例列表：用例状态 + 可展开的步骤明细。
 *
 * 步骤里的截图只下发相对路径（后端不提供直链），因此按证据文本展示，
 * 不渲染 <img>，避免出现破图。
 */
import { computed } from 'vue'
import type { TestCase } from '@/types/test'
import AppEmpty from '@/components/common/AppEmpty.vue'
import {
  TEST_STATUS_LABELS,
  TEST_STATUS_TONES,
  caseTypeLabel,
  hasCaseDetail
} from '@/utils/test'

const props = defineProps<{
  cases: TestCase[]
}>()

/** 默认展开失败 / 阻塞的用例，便于直接定位问题 */
const defaultOpen = (item: TestCase): boolean =>
  item.status === 'failed' || item.status === 'blocked'

const list = computed(() => props.cases)
</script>

<template>
  <div class="case-list">
    <AppEmpty
      v-if="list.length === 0"
      icon="file"
      title="暂无测试用例"
      description="本次测试没有记录用例"
    />

    <template v-else>
      <details
        v-for="item in list"
        :key="item.id"
        class="case"
        :open="defaultOpen(item)"
      >
        <summary class="case__summary">
          <span class="case__dot" :class="`is-${TEST_STATUS_TONES[item.status]}`" />
          <span class="case__name">{{ item.name }}</span>
          <span class="case__type">{{ caseTypeLabel(item.type) }}</span>
          <span class="case__status" :class="`is-${TEST_STATUS_TONES[item.status]}`">
            {{ TEST_STATUS_LABELS[item.status] }}
          </span>
        </summary>

        <div v-if="hasCaseDetail(item)" class="case__body">
          <p v-if="item.error" class="case__error">{{ item.error }}</p>

          <ol v-if="item.steps.length" class="steps">
            <li
              v-for="step in item.steps"
              :key="step.id"
              class="step"
              :class="`is-${TEST_STATUS_TONES[step.status]}`"
            >
              <div class="step__head">
                <span class="step__index">{{ step.stepIndex }}</span>
                <span class="step__action">{{ step.action || '未命名步骤' }}</span>
                <span class="step__status">{{ TEST_STATUS_LABELS[step.status] }}</span>
              </div>
              <p v-if="step.expected" class="step__line">预期：{{ step.expected }}</p>
              <p v-if="step.actual" class="step__line">实际：{{ step.actual }}</p>
              <p v-if="step.screenshotPath" class="step__line step__line--muted">
                截图：{{ step.screenshotPath }}
              </p>
            </li>
          </ol>

          <p v-else class="case__hint">该用例没有记录步骤</p>
        </div>

        <p v-else class="case__hint case__hint--inside">无步骤与错误信息</p>
      </details>
    </template>
  </div>
</template>

<style scoped>
.case-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.case {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  overflow: hidden;
}

.case__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  cursor: pointer;
  list-style: none;
}

/* 去掉 Safari / Chrome 默认三角标记 */
.case__summary::-webkit-details-marker {
  display: none;
}

.case__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-text-tertiary);
}

.case__dot.is-success {
  background-color: var(--color-success);
}

.case__dot.is-error {
  background-color: var(--color-error);
}

.case__dot.is-warning {
  background-color: var(--color-warning);
}

.case__dot.is-running {
  background-color: var(--color-primary);
}

.case__name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case__type {
  flex: none;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.case__status {
  flex: none;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.case__status.is-success {
  color: var(--color-success);
}

.case__status.is-error {
  color: var(--color-error);
}

.case__status.is-warning {
  color: var(--color-warning);
}

.case__status.is-running {
  color: var(--color-primary);
}

.case__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-3) var(--space-3);
  border-top: 1px solid var(--color-border);
}

.case__error {
  padding: var(--space-2);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-sm);
  word-break: break-word;
}

.case__hint {
  padding: 0 var(--space-3) var(--space-3);
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.case__hint--inside {
  padding-top: 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.step {
  padding: var(--space-2);
  border-left: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
}

.step.is-success {
  border-left-color: var(--color-success);
}

.step.is-error {
  border-left-color: var(--color-error);
}

.step.is-warning {
  border-left-color: var(--color-warning);
}

.step__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step__index {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.step__action {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-primary);
  word-break: break-word;
}

.step__status {
  flex: none;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.step__line {
  margin-top: var(--space-1);
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  word-break: break-word;
}

.step__line--muted {
  color: var(--color-text-tertiary);
}
</style>

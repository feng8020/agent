<script setup lang="ts">
/**
 * 测试运行概览：状态徽标 + 统计 + 范围 + 环境 + 耗时。
 *
 * 只负责渲染，数据由 TestResultPanel 传入；实时状态由 SSE 事件驱动，
 * 因此优先显示 liveStatus（事件比详情更新）。
 */
import { computed } from 'vue'
import type { TestRun, TestStatus } from '@/types/test'
import {
  TEST_STATUS_LABELS,
  TEST_STATUS_TONES,
  buildRunStats,
  formatDateTime,
  formatDuration
} from '@/utils/test'

const props = withDefaults(
  defineProps<{
    run: TestRun
    /** 实时状态；为空时使用持久化状态 */
    liveStatus?: TestStatus | ''
  }>(),
  { liveStatus: '' }
)

const status = computed<TestStatus>(() => props.liveStatus || props.run.status)
const tone = computed(() => TEST_STATUS_TONES[status.value])
const statusLabel = computed(() => TEST_STATUS_LABELS[status.value])
const stats = computed(() => buildRunStats(props.run))
const duration = computed(() => formatDuration(props.run.startedAt, props.run.finishedAt))
const startedAt = computed(() => formatDateTime(props.run.startedAt || props.run.createdAt))
</script>

<template>
  <div class="run-summary">
    <div class="run-summary__head">
      <span class="run-summary__badge" :class="`is-${tone}`">{{ statusLabel }}</span>
      <span v-if="run.iteration > 0" class="run-summary__meta">第 {{ run.iteration }} 轮</span>
      <span v-if="duration" class="run-summary__meta">耗时 {{ duration }}</span>
      <span v-if="startedAt" class="run-summary__meta">{{ startedAt }}</span>
    </div>

    <p v-if="run.summary" class="run-summary__text">{{ run.summary }}</p>

    <div class="run-summary__stats">
      <div
        v-for="item in stats"
        :key="item.key"
        class="stat"
        :class="`is-${item.tone}`"
      >
        <span class="stat__value">{{ item.value }}</span>
        <span class="stat__label">{{ item.label }}</span>
      </div>
    </div>

    <dl class="run-summary__facts">
      <div v-if="run.scope" class="fact">
        <dt class="fact__label">测试范围</dt>
        <dd class="fact__value">{{ run.scope }}</dd>
      </div>
      <div class="fact">
        <dt class="fact__label">运行编号</dt>
        <dd class="fact__value">#{{ run.id }}</dd>
      </div>
      <div v-if="run.environment" class="fact">
        <dt class="fact__label">环境</dt>
        <dd class="fact__value fact__value--mono">{{ run.environment }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.run-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.run-summary__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.run-summary__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
}

.run-summary__badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: currentColor;
}

.run-summary__badge.is-success {
  color: var(--color-success);
}

.run-summary__badge.is-error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.run-summary__badge.is-warning {
  color: var(--color-warning);
}

.run-summary__badge.is-running {
  color: var(--color-primary);
}

.run-summary__meta {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.run-summary__text {
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  word-break: break-word;
}

.run-summary__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.stat__value {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.stat__label {
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.stat.is-success .stat__value {
  color: var(--color-success);
}

.stat.is-error .stat__value {
  color: var(--color-error);
}

.stat.is-warning .stat__value {
  color: var(--color-warning);
}

.run-summary__facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.fact {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.fact__label {
  flex: none;
  width: 64px;
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-tertiary);
}

.fact__value {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  word-break: break-word;
}

.fact__value--mono {
  font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

@media (max-width: 767px) {
  .run-summary__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

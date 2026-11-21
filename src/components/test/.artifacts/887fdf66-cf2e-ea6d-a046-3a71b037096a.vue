<script setup lang="ts">
/**
 * 测试过程时间线（SSE 实时事件）
 *
 * 数据来自 `/test/runs/:id/events`，已由 useTestRunResult 去重后按顺序传入。
 * 这里只负责把事件渲染成「✓ 打开登录页 / ✗ 登录接口」这类可读文本。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { TestEvent } from '@/types/test'
import AppEmpty from '@/components/common/AppEmpty.vue'
import { describeTestEvent, formatDateTime } from '@/utils/test'

const props = withDefaults(
  defineProps<{
    events: TestEvent[]
    /** 订阅失败原因（断流 / 网络异常） */
    error?: string
  }>(),
  { error: '' }
)

const timelineRef = ref<HTMLElement | null>(null)

const items = computed(() =>
  props.events.map((event) => ({
    key: `${event.testRunId}-${event.sequence}`,
    time: formatDateTime(new Date(event.timestamp).toISOString()),
    view: describeTestEvent(event)
  }))
)

/** 新事件到达后自动滚到底部（用户回看历史时不做平滑动画，避免跳动） */
watch(
  () => props.events.length,
  async () => {
    await nextTick()
    const element = timelineRef.value
    if (element) element.scrollTop = element.scrollHeight
  }
)
</script>

<template>
  <div class="timeline-wrap">
    <p v-if="error" class="timeline__error">{{ error }}</p>

    <div ref="timelineRef" class="timeline">
      <AppEmpty
        v-if="items.length === 0"
        icon="clock"
        title="暂无实时过程"
        description="测试开始后，这里会实时显示每一步执行结果"
      />

      <ol v-else class="timeline__list">
        <li
          v-for="item in items"
          :key="item.key"
          class="event"
          :class="`is-${item.view.tone}`"
        >
          <span class="event__dot" />
          <div class="event__content">
            <p class="event__title">{{ item.view.title }}</p>
            <p v-if="item.view.detail" class="event__detail">{{ item.view.detail }}</p>
            <p v-if="item.time" class="event__time">{{ item.time }}</p>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.timeline__error {
  flex: none;
  margin: var(--space-3) var(--space-4) 0;
  padding: var(--space-2);
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-sm);
}

.timeline {
  flex: 1;
  min-height: 0;
  padding: var(--space-3) var(--space-4) var(--space-4);
  overflow-y: auto;
}

.timeline__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.event {
  position: relative;
  display: flex;
  gap: var(--space-3);
  padding-left: var(--space-1);
}

/* 竖线：串联所有事件 */
.event::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: calc(-1 * var(--space-3));
  left: 4px;
  width: 1px;
  background-color: var(--color-border);
}

.event:last-child::before {
  display: none;
}

.event__dot {
  flex: none;
  position: relative;
  z-index: 1;
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-strong);
}

.event.is-success .event__dot {
  border-color: var(--color-success);
}

.event.is-error .event__dot {
  border-color: var(--color-error);
}

.event.is-warning .event__dot {
  border-color: var(--color-warning);
}

.event.is-running .event__dot {
  border-color: var(--color-primary);
}

.event__content {
  flex: 1;
  min-width: 0;
}

.event__title {
  font-size: var(--font-size-caption);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  word-break: break-word;
}

.event.is-error .event__title {
  color: var(--color-error);
}

.event__detail {
  margin-top: 2px;
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  word-break: break-word;
}

.event__time {
  margin-top: 2px;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}
</style>

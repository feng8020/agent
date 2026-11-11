<script setup lang="ts">
/**
 * 测试状态徽标（仅后端 / 前后端块使用）
 *
 * 值来自后端最近一次测试记录；未跑过测试时为 untested。
 * 视觉规则见 ui/design-spec.md §7.4：圆点 + 文字（不只靠颜色）。
 */
import { computed } from 'vue'

type StatusVariant = 'untested' | 'passed' | 'failed' | 'blocked'

const props = defineProps<{ status: string }>()

const variant = computed<StatusVariant>(() => {
  switch (props.status) {
    case 'passed':
      return 'passed'
    case 'failed':
      return 'failed'
    case 'blocked':
      return 'blocked'
    default:
      // running / pending / 空值都视为「未测试」：没有结论就不能显示通过
      return 'untested'
  }
})

const label = computed(() => {
  switch (variant.value) {
    case 'passed':
      return '通过'
    case 'failed':
      return '失败'
    case 'blocked':
      return '阻塞'
    default:
      return '未测试'
  }
})
</script>

<template>
  <span class="status-badge" :class="`is-${variant}`">
    <span class="status-badge__dot" />
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: var(--size-artifact-badge-height);
  padding: 0 8px;
  font-size: 11px;
  line-height: var(--size-artifact-badge-height);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
  border-radius: var(--radius-full);
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  background-color: currentColor;
  border-radius: var(--radius-full);
}

.status-badge.is-passed {
  color: var(--color-success);
}

.status-badge.is-failed {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.status-badge.is-blocked {
  color: var(--color-warning);
}
</style>

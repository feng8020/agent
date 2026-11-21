<script setup lang="ts">
/**
 * 测试产物列表（截图 / trace / video / report）
 *
 * 后端只提供「按 id 下载」接口，没有产物列表接口（见 backend/router/test.go），
 * 因此列表只能来自测试过程中的 test_artifact_added 事件。
 * 历史测试不会重放事件，此时列表为空属于正常情况，界面必须说明原因。
 */
import { computed } from 'vue'
import type { TestArtifact } from '@/types/test'
import AppButton from '@/components/common/AppButton.vue'
import AppEmpty from '@/components/common/AppEmpty.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { formatFileSize } from '@/utils/format'

/** 产物类型文案 */
const KIND_LABELS: Record<string, string> = {
  screenshot: '截图',
  trace: 'Trace',
  video: '录屏',
  report: '报告'
}

const props = defineProps<{
  artifacts: TestArtifact[]
}>()

const emit = defineEmits<{
  (e: 'download', artifact: TestArtifact): void
}>()

const list = computed(() => props.artifacts)

const kindLabel = (kind: string): string => (kind ? KIND_LABELS[kind] ?? kind : '产物')
</script>

<template>
  <div class="artifact-list">
    <AppEmpty
      v-if="list.length === 0"
      icon="file"
      title="暂无测试产物"
      description="产物只在测试执行过程中产生；查看历史测试不会重放产物事件"
    />

    <template v-else>
      <div v-for="item in list" :key="item.id" class="artifact">
        <AppIcon name="file" :size="16" class="artifact__icon" />
        <div class="artifact__main">
          <p class="artifact__name" :title="item.name">{{ item.name }}</p>
          <p class="artifact__meta">
            <span>{{ kindLabel(item.kind) }}</span>
            <span v-if="item.size > 0">· {{ formatFileSize(item.size) }}</span>
          </p>
        </div>
        <AppButton
          variant="secondary"
          size="sm"
          title="下载测试产物"
          @click="emit('download', item)"
        >
          <template #icon>
            <AppIcon name="download" :size="14" />
          </template>
          下载
        </AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.artifact-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.artifact {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.artifact__icon {
  flex: none;
  color: var(--color-text-tertiary);
}

.artifact__main {
  flex: 1;
  min-width: 0;
}

.artifact__name {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact__meta {
  display: flex;
  gap: var(--space-1);
  margin-top: 2px;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}
</style>

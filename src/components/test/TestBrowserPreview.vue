<script setup lang="ts">
/**
 * 测试浏览器实时画面（右侧预览区）
 *
 * 视觉约定：
 * - 桌面端占据聊天区右侧，占满高度
 * - 移动端由 ChatLayout 定位为右下角浮动小窗（见 ChatLayout.vue）
 *
 * 该组件只负责渲染，订阅与显隐逻辑在 useBrowserPreview 中。
 */
import { computed } from 'vue'
import type { BrowserPreviewStatus } from '@/composables/useBrowserPreview'

const props = defineProps<{
  /** 当前帧（data URL） */
  frame: string
  status: BrowserPreviewStatus
  error: string
  width: number
  height: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const statusText = computed(() => {
  switch (props.status) {
    case 'live':
      return '测试进行中'
    case 'connecting':
      return '连接中…'
    case 'error':
      return '连接失败'
    default:
      return '等待测试'
  }
})

/** 分辨率标签：0 表示后端未提供 */
const resolution = computed(() =>
  props.width > 0 && props.height > 0 ? `${props.width}×${props.height}` : ''
)
</script>

<template>
  <section class="test-preview" aria-label="测试浏览器实时画面">
    <header class="test-preview__header">
      <span class="test-preview__title">测试浏览器</span>
      <span class="test-preview__status" :class="`is-${status}`">{{ statusText }}</span>
      <span v-if="resolution" class="test-preview__resolution">{{ resolution }}</span>
      <button
        class="test-preview__close"
        type="button"
        aria-label="关闭测试预览"
        @click="emit('close')"
      >
        ×
      </button>
    </header>

    <div class="test-preview__body">
      <img
        v-if="frame"
        class="test-preview__frame"
        :src="frame"
        alt="测试浏览器实时画面"
      />

      <div v-else class="test-preview__placeholder">
        <p class="test-preview__placeholder-text">
          {{ error || '等待测试画面…' }}
        </p>
        <p class="test-preview__hint">
          Tester Agent 打开浏览器后，这里会显示实时画面
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.test-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--color-surface);
}

.test-preview__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
  height: var(--size-header-height);
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

.test-preview__title {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.test-preview__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--font-size-micro);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
}

/* 状态点 */
.test-preview__status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: currentColor;
}

.test-preview__status.is-live {
  color: var(--color-success);
  background-color: var(--color-hover);
}

.test-preview__status.is-connecting {
  color: var(--color-warning);
  background-color: var(--color-hover);
}

.test-preview__status.is-error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.test-preview__resolution {
  margin-left: auto;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.test-preview__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.test-preview__close:hover {
  background-color: var(--color-hover);
  color: var(--color-text-primary);
}

.test-preview__body {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  padding: var(--space-3);
  overflow: hidden;
  background-color: var(--color-bg);
}

.test-preview__frame {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.test-preview__placeholder {
  padding: var(--space-4);
  text-align: center;
}

.test-preview__placeholder-text {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.test-preview__hint {
  margin-top: var(--space-2);
  font-size: var(--font-size-micro);
  line-height: var(--line-height-base);
  color: var(--color-text-tertiary);
}

/* 移动端：ChatLayout 会把本组件定位为右下角浮动小窗 */
@media (max-width: 767px) {
  .test-preview {
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .test-preview__header {
    height: 36px;
    padding: 0 var(--space-2);
  }

  .test-preview__body {
    padding: var(--space-2);
  }
}
</style>

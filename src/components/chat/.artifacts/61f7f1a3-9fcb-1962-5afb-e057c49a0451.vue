<script setup lang="ts">
/**
 * 右侧产物预览面板（iframe）
 *
 * 只承载 webpage / project / fullstack 的前端效果预览；
 * 后端产物不进这里（它没有可渲染页面，会得到一块 30% 宽的空白）。
 *
 * 关键实现点（ui/components/preview-panel.md §5）：
 * - iframe 必须在「加载中」时就挂载，否则 @load 永远不会触发 → 三态层用绝对定位覆盖；
 * - load 事件在部分错误场景不触发，因此配 15s 超时兜底，避免永久转圈；
 * - 刷新通过 frameKey 变化 + 时间戳参数强制重载；
 * - 移动端由 ChatLayout 铺成全屏，这里只负责 header 出现「返回」按钮并锁背景滚动。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { useViewport } from '@/composables/useViewport'

const props = defineProps<{
  open: boolean
  /** 产物名称（header 主标题） */
  name: string
  /** 类型徽标文案，例如「网页」「前后端项目」 */
  kindLabel?: string
  /** 已带令牌的预览地址；为空表示不可预览 */
  previewUrl: string
  /** 是否显示「下载 ZIP」（仅 project / fullstack） */
  showDownload?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download'): void
}>()

/** iframe 加载超时（毫秒）：超时后按失败处理，避免永久转圈 */
const LOAD_TIMEOUT = 15000

const { matches: isMobile } = useViewport()

const loading = ref(true)
const error = ref('')
/** 递增即可强制 iframe 重载 */
const reloadSeq = ref(0)

let timer: number | null = null

const clearTimer = (): void => {
  if (timer === null) return
  window.clearTimeout(timer)
  timer = null
}

/** 预览地址 + 时间戳，避免浏览器缓存导致刷新无效 */
const frameSrc = computed(() => {
  if (!props.previewUrl) return ''
  const separator = props.previewUrl.includes('?') ? '&' : '?'
  return `${props.previewUrl}${separator}_t=${reloadSeq.value}`
})

const frameKey = computed(() => `${reloadSeq.value}-${props.previewUrl}`)

const startTimer = (): void => {
  clearTimer()
  timer = window.setTimeout(() => {
    if (loading.value) {
      loading.value = false
      error.value = '预览加载超时，请重试'
    }
  }, LOAD_TIMEOUT)
}

const startLoading = (): void => {
  loading.value = true
  error.value = ''
  startTimer()
}

const handleLoad = (): void => {
  clearTimer()
  loading.value = false
  error.value = ''
}

const handleError = (): void => {
  clearTimer()
  loading.value = false
  error.value = '预览加载失败'
}

const retry = (): void => {
  reloadSeq.value += 1
  startLoading()
}

const close = (): void => emit('close')

const download = (): void => emit('download')

/** 新窗口打开：地址已带 ?token=，可直接导航 */
const openInNewWindow = (): void => {
  if (!props.previewUrl) return
  window.open(props.previewUrl, '_blank', 'noopener')
}

watch(
  () => [props.open, props.previewUrl] as const,
  ([open]) => {
    if (!open) {
      clearTimer()
      return
    }
    reloadSeq.value += 1
    startLoading()
  },
  { immediate: true }
)

/* ---------------- 移动端：全屏覆盖时锁定背景滚动 ---------------- */
let bodyLocked = false

const lockBody = (): void => {
  if (bodyLocked) return
  document.body.style.overflow = 'hidden'
  bodyLocked = true
}

const unlockBody = (): void => {
  if (!bodyLocked) return
  document.body.style.overflow = ''
  bodyLocked = false
}

watch(
  () => props.open && isMobile.value,
  (value) => {
    if (value) lockBody()
    else unlockBody()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearTimer()
  unlockBody()
})
</script>

<template>
  <section class="artifact-panel" aria-label="产物预览">
    <header class="artifact-panel__header">
      <button
        v-if="isMobile"
        type="button"
        class="artifact-panel__back"
        aria-label="返回对话"
        @click="close"
      >
        <AppIcon name="back" :size="16" />
      </button>

      <span v-if="kindLabel" class="artifact-panel__badge">{{ kindLabel }}</span>
      <span class="artifact-panel__name" :title="name">{{ name }}</span>
      <span class="artifact-panel__spacer" />

      <div class="artifact-panel__actions">
        <AppButton variant="icon" aria-label="刷新预览" title="刷新预览" @click="retry">
          <template #icon>
            <AppIcon name="regenerate" :size="15" />
          </template>
        </AppButton>

        <AppButton
          v-if="previewUrl"
          variant="icon"
          aria-label="在新窗口打开"
          title="在新窗口打开"
          @click="openInNewWindow"
        >
          <template #icon>
            <AppIcon name="external" :size="15" />
          </template>
        </AppButton>

        <AppButton
          v-if="showDownload"
          size="sm"
          variant="secondary"
          aria-label="下载 ZIP"
          @click="download"
        >
          <template #icon>
            <AppIcon name="zip" :size="14" />
          </template>
          下载 ZIP
        </AppButton>

        <AppButton variant="icon" aria-label="关闭预览" title="关闭预览" @click="close">
          <template #icon>
            <AppIcon name="close" :size="16" />
          </template>
        </AppButton>
      </div>
    </header>

    <div class="artifact-panel__body">
      <template v-if="previewUrl">
        <!-- 先挂载 iframe，三态层覆盖其上，保证 @load 能触发 -->
        <iframe
          :key="frameKey"
          class="artifact-panel__frame"
          :src="frameSrc"
          title="产物预览"
          @load="handleLoad"
          @error="handleError"
        />

        <div v-if="loading" class="artifact-panel__state">
          <AppSpinner :size="20" />
          <span>正在加载预览…</span>
        </div>

        <div v-else-if="error" class="artifact-panel__state is-error">
          <AppIcon name="warning" :size="22" :stroke-width="1.3" />
          <p class="artifact-panel__state-text">{{ error }}</p>
          <AppButton variant="secondary" size="sm" @click="retry">重试</AppButton>
        </div>
      </template>

      <div v-else class="artifact-panel__state">
        <AppIcon name="warning" :size="22" :stroke-width="1.3" />
        <p class="artifact-panel__state-text">暂无可预览地址</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.artifact-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--color-bg);
}

.artifact-panel__header {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  height: var(--size-header-height);
  padding: 0 var(--space-4);
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.artifact-panel__back {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
}

.artifact-panel__back:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.artifact-panel__badge {
  flex: none;
  height: var(--size-artifact-badge-height);
  padding: 0 8px;
  font-size: 11px;
  line-height: var(--size-artifact-badge-height);
  color: var(--color-text-secondary);
  background-color: var(--color-hover);
  border-radius: var(--radius-full);
}

.artifact-panel__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-panel__spacer {
  flex: 1;
  min-width: var(--space-1);
}

.artifact-panel__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.artifact-panel__body {
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: var(--color-surface);
}

.artifact-panel__frame {
  display: block;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg);
  border: 0;
}

.artifact-panel__state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  text-align: center;
  background-color: var(--color-surface);
}

.artifact-panel__state.is-error {
  color: var(--color-error);
}

.artifact-panel__state-text {
  font-size: var(--font-size-caption);
}

@media (max-width: 767px) {
  .artifact-panel__header {
    padding: 0 var(--space-3);
  }

  .artifact-panel__actions {
    gap: var(--space-1);
  }
}
</style>

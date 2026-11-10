<script setup lang="ts">
/**
 * 项目在线预览弹窗
 *
 * 用 <iframe> 打开该会话前端工程的构建产物地址（已带 ?token=）。
 * 预览地址必须以「/」结尾，因为构建产物使用相对 base，
 * 以目录形式访问时 index.html 内的相对资源才能正确解析（见 backend/API.md）。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const props = defineProps<{
  open: boolean
  /** 带令牌的预览地址；为空表示不可预览 */
  url: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

/** iframe 加载中（load 事件触发后关闭） */
const loading = ref(true)

const close = (): void => emit('close')

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') close()
}

/** 仅当由本弹窗锁定过滚动时才解锁，避免影响其它组件的滚动锁 */
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
  () => props.open,
  (value) => {
    if (value) {
      loading.value = true
      document.addEventListener('keydown', handleKeydown)
      lockBody()
    } else {
      document.removeEventListener('keydown', handleKeydown)
      unlockBody()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  unlockBody()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="project-preview">
      <div v-if="open" class="project-preview" role="dialog" aria-modal="true">
        <div class="project-preview__overlay" @click="close" />

        <div class="project-preview__dialog">
          <header class="project-preview__header">
            <div class="project-preview__title">
              <AppIcon name="external" :size="16" />
              <span class="project-preview__name">项目在线预览</span>
            </div>

            <div class="project-preview__tools">
              <a
                v-if="url"
                class="project-preview__link"
                :href="url"
                target="_blank"
                rel="noopener"
                title="在新窗口打开"
              >
                <AppIcon name="external" :size="14" />
                <span>新窗口打开</span>
              </a>
              <button
                type="button"
                class="project-preview__close"
                title="关闭预览"
                aria-label="关闭预览"
                @click="close"
              >
                <AppIcon name="close" :size="16" />
              </button>
            </div>
          </header>

          <div class="project-preview__body">
            <!-- Empty：缺少可预览地址 -->
            <div v-if="!url" class="project-preview__state">
              <AppIcon name="warning" :size="22" :stroke-width="1.3" />
              <p class="project-preview__state-text">暂无可预览的构建产物</p>
            </div>

            <template v-else>
              <!-- Loading -->
              <div v-if="loading" class="project-preview__state">
                <AppSpinner :size="20" />
                <span>正在加载预览…</span>
              </div>
              <iframe
                class="project-preview__frame"
                :src="url"
                title="项目预览"
                @load="loading = false"
              />
            </template>
          </div>

          <footer class="project-preview__footer">
            <AppButton variant="secondary" size="sm" @click="close">关闭</AppButton>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.project-preview {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.project-preview__overlay {
  position: absolute;
  inset: 0;
  background-color: var(--color-overlay);
}

.project-preview__dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1080px;
  height: 84vh;
  overflow: hidden;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.project-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.project-preview__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-text-secondary);
}

.project-preview__name {
  overflow: hidden;
  font-size: var(--font-size-section);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-preview__tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.project-preview__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 var(--space-3);
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.project-preview__link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
}

.project-preview__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.project-preview__close:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.project-preview__body {
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: var(--color-surface);
}

.project-preview__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background-color: var(--color-bg);
}

.project-preview__state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
  background-color: var(--color-surface);
}

.project-preview__state-text {
  font-size: var(--font-size-caption);
  text-align: center;
}

.project-preview__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.project-preview-enter-active,
.project-preview-leave-active {
  transition: opacity 160ms var(--easing-standard);
}

.project-preview-enter-active .project-preview__dialog,
.project-preview-leave-active .project-preview__dialog {
  transition: transform 160ms var(--easing-standard);
}

.project-preview-enter-from,
.project-preview-leave-to {
  opacity: 0;
}

.project-preview-enter-from .project-preview__dialog,
.project-preview-leave-to .project-preview__dialog {
  transform: scale(0.96);
}

@media (max-width: 767px) {
  .project-preview {
    align-items: stretch;
    padding: 0;
  }

  .project-preview__dialog {
    max-width: none;
    height: 100%;
    border: 0;
    border-radius: 0;
  }

  .project-preview__link span {
    display: none;
  }
}
</style>

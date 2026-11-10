<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

withDefaults(
  defineProps<{
    title: string
    /** 是否存在可预览的构建产物（由会话产出状态决定） */
    canPreview?: boolean
    /** 是否存在可下载的源码（由会话产出状态决定） */
    canDownload?: boolean
  }>(),
  { canPreview: false, canDownload: false }
)

const emit = defineEmits<{
  (e: 'toggle-theme'): void
  (e: 'toggle-sidebar'): void
  (e: 'preview'): void
  (e: 'download'): void
}>()
</script>

<template>
  <!-- 顶部操作区（UI §6.2）：高 56，底部 1px 分隔线 -->
  <header class="chat-header">
    <div class="chat-header__left">
      <button
        type="button"
        class="chat-header__menu"
        title="打开会话列表"
        aria-label="打开会话列表"
        @click="emit('toggle-sidebar')"
      >
        <AppIcon name="menu" :size="18" />
      </button>
      <h1 class="chat-header__title" :title="title">{{ title }}</h1>
    </div>

    <div class="chat-header__actions">
      <!-- 项目交付入口：仅在该会话确实有产出时显示 -->
      <button
        v-if="canPreview"
        type="button"
        class="chat-header__action chat-header__action--text"
        title="在线预览项目"
        aria-label="在线预览项目"
        @click="emit('preview')"
      >
        <AppIcon name="external" :size="15" />
        <span class="chat-header__action-label">在线预览</span>
      </button>

      <button
        v-if="canDownload"
        type="button"
        class="chat-header__action chat-header__action--text"
        title="下载项目源码"
        aria-label="下载项目源码"
        @click="emit('download')"
      >
        <AppIcon name="download" :size="15" />
        <span class="chat-header__action-label">下载源码</span>
      </button>

      <button
        type="button"
        class="chat-header__action"
        title="切换主题"
        aria-label="切换主题"
        @click="emit('toggle-theme')"
      >
        <AppIcon name="theme" :size="17" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex: none;
  height: var(--size-header-height);
  padding: 0 var(--space-6);
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.chat-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.chat-header__title {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header__menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.chat-header__menu:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
}

.chat-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
}

/* 图标按钮 28×28 / 圆角 8 / 1px 边框（UI §6.2） */
.chat-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.chat-header__action:hover {
  color: var(--color-text-primary);
  background-color: var(--color-hover);
  border-color: var(--color-border-strong);
}

/* 带文字的操作按钮（在线预览 / 下载源码） */
.chat-header__action--text {
  width: auto;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
}

.chat-header__action-label {
  white-space: nowrap;
}

@media (max-width: 767px) {
  .chat-header {
    padding: 0 var(--space-4);
  }

  .chat-header__menu {
    display: inline-flex;
  }

  /* 移动端仅保留图标，避免标题被挤压 */
  .chat-header__action-label {
    display: none;
  }

  .chat-header__action--text {
    width: 28px;
    padding: 0;
  }
}
</style>

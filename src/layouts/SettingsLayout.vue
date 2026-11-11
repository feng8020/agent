<script setup lang="ts">
import AppAvatar from '@/components/common/AppAvatar.vue'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps<{ userName: string }>()

const emit = defineEmits<{ (e: 'back'): void }>()
</script>

<template>
  <!-- 个人设置页布局（UI §5.3）：顶部栏 64 + 居中内容 -->
  <div class="settings-layout">
    <header class="settings-layout__topbar">
      <div class="settings-layout__left">
        <button
          type="button"
          class="settings-layout__back"
          title="返回聊天"
          aria-label="返回聊天"
          @click="emit('back')"
        >
          <AppIcon name="back" :size="16" />
          <span class="settings-layout__back-text">返回聊天</span>
        </button>

        <div class="settings-layout__brand">
          <span class="settings-layout__logo">AI</span>
          <span class="settings-layout__brand-text">AI Chat</span>
          <span class="settings-layout__divider">/</span>
          <span class="settings-layout__page">设置</span>
        </div>
      </div>

      <div class="settings-layout__user">
        <span class="settings-layout__user-name">{{ userName }}</span>
        <AppAvatar :name="userName" :size="32" />
      </div>
    </header>

    <main class="settings-layout__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.settings-layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--color-bg);
}

.settings-layout__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex: none;
  height: var(--size-topbar-height);
  padding: 0 var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.settings-layout__left {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  min-width: 0;
}

.settings-layout__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-form);
  color: var(--color-text-secondary);
  transition: color var(--duration-fast) var(--easing-standard);
}

.settings-layout__back:hover {
  color: var(--color-text-primary);
}

.settings-layout__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-layout__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: 9px;
}

.settings-layout__brand-text {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.settings-layout__divider {
  color: var(--color-border-strong);
}

.settings-layout__page {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.settings-layout__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: none;
}

.settings-layout__user-name {
  font-size: var(--font-size-list);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* 内容容器：最大宽 760 居中（UI §5.3） */
.settings-layout__content {
  width: 100%;
  max-width: var(--size-content-max);
  margin: 0 auto;
  padding: 54px var(--space-4) var(--space-10);
}

@media (max-width: 767px) {
  .settings-layout__topbar {
    padding: 0 var(--space-4);
  }

  .settings-layout__back-text,
  .settings-layout__brand-text,
  .settings-layout__divider,
  .settings-layout__page {
    display: none;
  }

  .settings-layout__left {
    gap: var(--space-3);
  }

  .settings-layout__content {
    padding: var(--space-6) var(--space-4) var(--space-8);
  }
}
</style>

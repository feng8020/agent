<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 卡片标题（可选） */
    title?: string
  }>(),
  { title: '' }
)
</script>

<template>
  <!-- 认证页布局（UI §5.1）：Logo + 居中卡片 -->
  <div class="auth-layout">
    <div class="auth-layout__brand">
      <span class="auth-layout__logo">AI</span>
      <span class="auth-layout__brand-text">AI Chat</span>
    </div>

    <section class="auth-layout__card">
      <slot />
    </section>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: var(--space-8) var(--space-4);
  background-color: var(--color-bg);
}

.auth-layout__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: var(--space-8);
}

.auth-layout__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: var(--radius-lg);
}

.auth-layout__brand-text {
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* 卡片：宽 420 / 圆角 16 / 内边距 32 / 1px 边框 */
.auth-layout__card {
  width: 100%;
  max-width: var(--size-card-auth);
  padding: var(--space-8);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-3xl);
}

@media (max-width: 479px) {
  .auth-layout__card {
    max-width: none;
    padding: var(--space-6);
  }
}
</style>

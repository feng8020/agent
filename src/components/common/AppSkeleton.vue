<script setup lang="ts">
withDefaults(
  defineProps<{
    /** list：会话列表骨架（6 条）；messages：消息区骨架（3 组） */
    variant?: 'list' | 'messages'
    rows?: number
  }>(),
  {
    variant: 'list',
    rows: 6
  }
)
</script>

<template>
  <!-- 骨架屏（UI §6.14、§10.1） -->
  <div class="app-skeleton" :class="`is-${variant}`" aria-hidden="true">
    <template v-if="variant === 'list'">
      <div v-for="index in rows" :key="index" class="app-skeleton__row" />
    </template>

    <template v-else>
      <div v-for="index in 3" :key="index" class="app-skeleton__message">
        <div class="app-skeleton__avatar" />
        <div class="app-skeleton__lines">
          <div class="app-skeleton__line" style="width: 88%" />
          <div class="app-skeleton__line" style="width: 72%" />
          <div class="app-skeleton__line" style="width: 52%" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-skeleton {
  width: 100%;
}

.app-skeleton__row {
  height: var(--size-list-item);
  margin-bottom: var(--space-1);
  border-radius: 9px;
}

.app-skeleton__message {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.app-skeleton__avatar {
  flex: none;
  width: var(--size-avatar-sm);
  height: var(--size-avatar-sm);
  border-radius: var(--radius-full);
}

.app-skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.app-skeleton__line {
  height: 12px;
  border-radius: var(--radius-xs);
}

.app-skeleton__row,
.app-skeleton__avatar,
.app-skeleton__line {
  background-image: linear-gradient(
    90deg,
    var(--color-hover) 25%,
    var(--color-active-bg) 37%,
    var(--color-hover) 63%
  );
  background-size: 400% 100%;
  animation: ai-shimmer 1.5s ease infinite;
}
</style>

<script setup lang="ts">
/**
 * 数据亮点 —— UI §4.1 / §5.2
 */
import { BRAND } from '@/mock/recruitment/brand'
</script>

<template>
  <section class="rc-highlights">
    <div class="rc-container rc-highlights__inner">
      <div v-for="item in BRAND.highlights" :key="item.label" class="rc-highlights__item">
        <strong>{{ item.value }}</strong>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rc-highlights {
  background-color: var(--rc-color-surface);
}

.rc-highlights__inner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.rc-highlights__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--rc-space-8) var(--rc-space-4);
  text-align: center;
}

.rc-highlights__item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 1px;
  height: 48px;
  transform: translateY(-50%);
  background-color: var(--rc-color-border);
}

.rc-highlights__item strong {
  font-size: var(--rc-font-size-2xl);
  font-weight: var(--rc-font-weight-extrabold);
  color: var(--rc-color-text);
}

.rc-highlights__item span {
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

@media (max-width: 767px) {
  .rc-highlights__inner {
    grid-template-columns: repeat(2, 1fr);
  }

  .rc-highlights__item {
    padding: var(--rc-space-6) var(--rc-space-3);
  }

  .rc-highlights__item strong {
    font-size: var(--rc-font-size-xl);
  }

  /* 两列布局下仅保留中间分隔线，避免视觉噪点 */
  .rc-highlights__item::after {
    display: none;
  }

  .rc-highlights__item:nth-child(odd) {
    border-right: 1px solid var(--rc-color-border);
  }

  .rc-highlights__item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--rc-color-border);
  }
}
</style>

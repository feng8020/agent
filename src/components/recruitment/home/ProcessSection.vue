<script setup lang="ts">
/**
 * 招聘流程 —— UI §4.1 / §5.2 / §6
 */
import { computed } from 'vue'
import { BRAND } from '@/mock/recruitment/brand'

const steps = computed(() => BRAND.processSteps)
</script>

<template>
  <section id="process" class="rc-section rc-process">
    <div class="rc-container">
      <p class="rc-section__label">// 招聘流程</p>
      <h2 class="rc-section__title">从投递到入职，只需四步</h2>

      <ol class="rc-process__list">
        <li v-for="item in steps" :key="item.step" class="rc-process__item">
          <span
            class="rc-process__step"
            :class="{ 'is-final': item.step === steps.length }"
            aria-hidden="true"
          >
            {{ item.step }}
          </span>
          <h3 class="rc-process__title">{{ item.title }}</h3>
          <p class="rc-process__desc">{{ item.desc }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.rc-process {
  background-color: var(--rc-color-bg);
}

.rc-process__list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--rc-space-6);
  margin-top: var(--rc-space-10);
}

.rc-process__item {
  padding: var(--rc-space-6);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
}

.rc-process__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: var(--rc-color-primary);
  color: #ffffff;
  font-size: var(--rc-font-size-lg);
  font-weight: var(--rc-font-weight-bold);
}

.rc-process__step.is-final {
  background-color: var(--rc-color-success);
}

.rc-process__title {
  margin: var(--rc-space-6) 0 var(--rc-space-2);
  font-size: var(--rc-font-size-lg);
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-process__desc {
  margin: 0;
  font-size: var(--rc-font-size-sm);
  line-height: var(--rc-line-height-relaxed);
  color: var(--rc-color-text-secondary);
}

@media (max-width: 1023px) {
  .rc-process__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .rc-process__list {
    grid-template-columns: 1fr;
    gap: var(--rc-space-4);
    margin-top: var(--rc-space-6);
  }

  .rc-process__item {
    display: flex;
    align-items: flex-start;
    gap: var(--rc-space-4);
    padding: var(--rc-space-5);
  }

  .rc-process__step {
    flex: none;
    width: 44px;
    height: 44px;
    font-size: var(--rc-font-size-base);
  }

  .rc-process__title {
    margin: 0 0 4px;
    font-size: var(--rc-font-size-base);
  }
}
</style>

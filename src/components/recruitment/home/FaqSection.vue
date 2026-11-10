<script setup lang="ts">
/**
 * 常见问题手风琴 —— UI §4.1 / §6.7
 *
 * 默认全部收起；支持多项同时展开（UI §6.7 默认「可多项」）。
 */
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { BRAND } from '@/mock/recruitment/brand'

const openIds = ref<string[]>([])

const toggle = (id: string): void => {
  const index = openIds.value.indexOf(id)
  if (index > -1) openIds.value.splice(index, 1)
  else openIds.value.push(id)
}

const isOpen = (id: string): boolean => openIds.value.includes(id)
</script>

<template>
  <section id="faq" class="rc-section rc-faq">
    <div class="rc-container">
      <p class="rc-section__label">// FAQ</p>
      <h2 class="rc-section__title">常见问题</h2>

      <div class="rc-faq__list">
        <div v-for="item in BRAND.faqs" :key="item.id" class="rc-faq__item">
          <button
            type="button"
            class="rc-faq__question"
            :aria-expanded="isOpen(item.id)"
            @click="toggle(item.id)"
          >
            <span class="rc-faq__question-text">{{ item.question }}</span>
            <AppIcon
              class="rc-faq__icon"
              :name="isOpen(item.id) ? 'minus' : 'plus'"
              :size="18"
            />
          </button>
          <p v-if="isOpen(item.id)" class="rc-faq__answer">{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rc-faq {
  background-color: var(--rc-color-surface);
}

.rc-faq__list {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-3);
  margin-top: var(--rc-space-10);
}

.rc-faq__item {
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-md);
  background-color: var(--rc-color-bg);
  overflow: hidden;
  transition: border-color var(--rc-duration-fast) ease;
}

.rc-faq__item:hover {
  border-color: var(--rc-color-border-strong);
}

.rc-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-space-4);
  width: 100%;
  padding: var(--rc-space-5) var(--rc-space-6);
  border: none;
  background: none;
  font-family: inherit;
  font-size: 17px;
  text-align: left;
  color: var(--rc-color-text);
  cursor: pointer;
}

.rc-faq__question-text {
  font-weight: var(--rc-font-weight-semibold);
}

.rc-faq__icon {
  flex: none;
  color: var(--rc-color-text-secondary);
}

.rc-faq__answer {
  margin: 0;
  padding: 0 var(--rc-space-6) var(--rc-space-5);
  font-size: var(--rc-font-size-sm);
  line-height: var(--rc-line-height-relaxed);
  color: var(--rc-color-text-secondary);
}

@media (max-width: 767px) {
  .rc-faq__list {
    margin-top: var(--rc-space-6);
  }

  .rc-faq__question {
    padding: var(--rc-space-4);
    font-size: var(--rc-font-size-base);
  }

  .rc-faq__answer {
    padding: 0 var(--rc-space-4) var(--rc-space-4);
  }
}
</style>

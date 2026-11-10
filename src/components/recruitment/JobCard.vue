<script setup lang="ts">
/**
 * 岗位卡片 —— UI §6.3
 *
 * - 仅用于展示「招聘中」岗位（列表 / 首页精选）。
 * - Hover：上移 2px + 阴影加深 + 箭头高亮；键盘可聚焦（Focus 2px 主色描边）。
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import type { Job, JobCategory } from '@/types/recruitment'

const props = defineProps<{ job: Job }>()

const CATEGORY_CLASS: Record<JobCategory, string> = {
  技术: 'rc-tag--tech',
  产品: 'rc-tag--product',
  设计: 'rc-tag--design',
  运营: 'rc-tag--operation',
  职能: 'rc-tag--function'
}

const categoryClass = computed(() => CATEGORY_CLASS[props.job.category])
const isHot = computed(() => (props.job.tags ?? []).includes('热招'))
const isUrgent = computed(() => (props.job.tags ?? []).includes('急招'))
const isClosed = computed(() => props.job.status !== '招聘中')
</script>

<template>
  <RouterLink
    class="rc-job-card"
    :class="{ 'is-closed': isClosed }"
    :to="{ name: 'careers-job-detail', params: { id: job.id } }"
  >
    <div class="rc-job-card__head">
      <span class="rc-tag" :class="categoryClass">{{ job.category }}</span>
      <span v-if="isHot" class="rc-tag rc-tag--hot">热招</span>
      <span v-if="isUrgent" class="rc-tag rc-tag--function">急招</span>
      <span v-if="isClosed" class="rc-tag rc-tag--closed">已下线</span>
      <span class="rc-job-card__date">{{ job.publishedAt }}</span>
    </div>

    <h3 class="rc-job-card__title">{{ job.title }}</h3>
    <p class="rc-job-card__meta">{{ job.department }} · {{ job.jobType }} · {{ job.location }}</p>

    <div class="rc-job-card__foot">
      <span class="rc-job-card__salary">{{ job.salaryRange }}</span>
      <span class="rc-job-card__arrow" aria-hidden="true">
        <AppIcon name="arrow-right" :size="16" />
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.rc-job-card {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-3);
  padding: var(--rc-space-6);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.rc-job-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--rc-shadow-md);
  border-color: #bfdbfe;
}

.rc-job-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
}

.rc-job-card.is-closed {
  opacity: 0.72;
}

.rc-job-card__head {
  display: flex;
  align-items: center;
  gap: var(--rc-space-2);
}

.rc-job-card__date {
  margin-left: auto;
  font-size: 13px;
  color: var(--rc-color-text-muted);
}

.rc-job-card__title {
  margin: 0;
  font-size: var(--rc-font-size-lg);
  font-weight: var(--rc-font-weight-bold);
  line-height: 1.4;
  color: var(--rc-color-text);
}

.rc-job-card__meta {
  margin: 0;
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-job-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--rc-space-2);
}

.rc-job-card__salary {
  font-size: var(--rc-font-size-base);
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-primary);
}

.rc-job-card__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f1f5f9;
  color: var(--rc-color-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.rc-job-card:hover .rc-job-card__arrow {
  background-color: var(--rc-color-primary);
  color: #ffffff;
}

@media (max-width: 767px) {
  .rc-job-card {
    padding: var(--rc-space-5);
  }
}
</style>

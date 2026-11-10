<script setup lang="ts">
/**
 * 我的投递 —— UI §3（P1） / §8
 *
 * 基于本地投递记录展示（localStorage，不可用时自动降级为内存记录）。
 * 数据仅存于当前浏览器，用于演示，不代表真实招聘系统。
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import RcEmpty from '@/components/recruitment/RcEmpty.vue'
import { useJobApplications } from '@/composables/useJobApplications'

const { applications } = useJobApplications()

const pad = (value: number): string => String(value).padStart(2, '0')

const formatTime = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const list = computed(() =>
  applications.value.map((item) => ({
    ...item,
    timeText: formatTime(item.createdAt)
  }))
)
</script>

<template>
  <div class="rc-my">
    <div class="rc-container rc-my__inner">
      <nav class="rc-breadcrumb" aria-label="面包屑">
        <RouterLink :to="{ name: 'careers-home' }" class="rc-breadcrumb__link">首页</RouterLink>
        <span>/</span>
        <span>我的投递</span>
      </nav>

      <h1 class="rc-my__title">我的投递</h1>
      <p class="rc-my__desc">投递记录保存在当前浏览器本地，仅用于演示。</p>

      <ul v-if="list.length" class="rc-my__list">
        <li v-for="item in list" :key="item.id" class="rc-my__item">
          <div class="rc-my__main">
            <RouterLink
              :to="{ name: 'careers-job-detail', params: { id: item.jobId } }"
              class="rc-my__job"
            >
              {{ item.jobTitle }}
            </RouterLink>
            <p class="rc-my__meta">
              投递时间：{{ item.timeText }} · 简历：{{ item.resumeFileName }}
            </p>
          </div>
          <span class="rc-tag rc-tag--tech">已投递</span>
        </li>
      </ul>

      <RcEmpty v-else title="暂无投递记录" desc="去看看有哪些机会适合你吧">
        <template #action>
          <RouterLink :to="{ name: 'careers-jobs' }" class="rc-btn rc-btn--primary">
            去看看岗位
          </RouterLink>
        </template>
      </RcEmpty>
    </div>
  </div>
</template>

<style scoped>
.rc-my {
  padding-bottom: var(--rc-space-16);
  background-color: var(--rc-color-bg);
}

.rc-my__inner {
  padding-top: var(--rc-space-10);
}

.rc-my__title {
  margin: var(--rc-space-5) 0 0;
  font-size: 36px;
  font-weight: var(--rc-font-weight-extrabold);
  color: var(--rc-color-text);
}

.rc-my__desc {
  margin: var(--rc-space-2) 0 0;
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-my__list {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-3);
  margin-top: var(--rc-space-8);
}

.rc-my__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-space-4);
  padding: var(--rc-space-5);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
}

.rc-my__job {
  font-size: var(--rc-font-size-lg);
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
  text-decoration: none;
}

.rc-my__job:hover {
  color: var(--rc-color-primary);
}

.rc-my__meta {
  margin: var(--rc-space-2) 0 0;
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

@media (max-width: 767px) {
  .rc-my__inner {
    padding-top: var(--rc-space-6);
  }

  .rc-my__title {
    font-size: 28px;
  }

  .rc-my__item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

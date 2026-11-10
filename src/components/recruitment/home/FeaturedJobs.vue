<script setup lang="ts">
/**
 * 热招职位 —— UI §4.1 / §5.2 / §6.3
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import JobCard from '@/components/recruitment/JobCard.vue'
import { getFeaturedJobs } from '@/mock/recruitment/jobs'

const jobs = computed(() => getFeaturedJobs(6))
</script>

<template>
  <section class="rc-section rc-featured">
    <div class="rc-container">
      <div class="rc-section__head">
        <div>
          <p class="rc-section__label">// 热招职位</p>
          <h2 class="rc-section__title">找到属于你的舞台</h2>
        </div>
        <RouterLink :to="{ name: 'careers-jobs' }" class="rc-section__link">
          查看全部职位 →
        </RouterLink>
      </div>

      <div class="rc-featured__grid">
        <JobCard v-for="job in jobs" :key="job.id" :job="job" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.rc-featured {
  background-color: var(--rc-color-bg);
}

.rc-featured__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--rc-space-5);
}

@media (max-width: 767px) {
  .rc-featured__grid {
    grid-template-columns: 1fr;
    gap: var(--rc-space-4);
  }
}
</style>

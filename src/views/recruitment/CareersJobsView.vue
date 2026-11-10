<script setup lang="ts">
/**
 * 岗位列表页 —— UI §3 / §4.2 / §5.3 / §6.3 ~ §6.5 / §9.3
 *
 * - 仅展示「招聘中」岗位（由 Mock 层保证）。
 * - 支持关键词 / 类别 / 地点 / 类型筛选（前端过滤）+ 分页。
 * - 与 URL query 同步，便于页脚「校园招聘」等直达筛选。
 * - 覆盖 Loading / Empty / 结果列表 三种状态。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import JobCard from '@/components/recruitment/JobCard.vue'
import JobCardSkeleton from '@/components/recruitment/JobCardSkeleton.vue'
import JobsFilterBar from '@/components/recruitment/JobsFilterBar.vue'
import JobsPagination from '@/components/recruitment/JobsPagination.vue'
import RcEmpty from '@/components/recruitment/RcEmpty.vue'
import { JOB_PAGE_SIZE, fetchJobs } from '@/mock/recruitment/jobs'
import type { Job, JobCategory, JobQuery, JobType } from '@/types/recruitment'

const route = useRoute()
const router = useRouter()

const createEmptyQuery = (): JobQuery => ({
  keyword: '',
  category: '',
  location: '',
  jobType: ''
})

const query = reactive<JobQuery>(createEmptyQuery())
const jobs = ref<Job[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)

/** 依据 URL query 同步筛选条件（支持外部直达筛选） */
const applyRouteQuery = (): void => {
  const { jobType, category, keyword } = route.query
  query.jobType = typeof jobType === 'string' ? (jobType as JobType) : ''
  query.category = typeof category === 'string' ? (category as JobCategory) : ''
  query.keyword = typeof keyword === 'string' ? keyword : ''
  query.location = ''
}

const load = async (): Promise<void> => {
  loading.value = true
  try {
    const result = await fetchJobs({ ...query }, page.value, JOB_PAGE_SIZE)
    jobs.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

const isFiltering = computed(
  () =>
    Boolean(query.keyword) ||
    Boolean(query.category) ||
    Boolean(query.location) ||
    Boolean(query.jobType)
)

/** 将筛选条件写回 URL（不产生新的历史记录） */
const syncRouteQuery = (): void => {
  const nextQuery: Record<string, string> = {}
  if (query.jobType) nextQuery.jobType = query.jobType
  if (query.category) nextQuery.category = query.category
  if (query.keyword) nextQuery.keyword = query.keyword
  void router.replace({ name: 'careers-jobs', query: nextQuery })
}

onMounted(async () => {
  applyRouteQuery()
  await load()
})

// 外部导航（如页脚链接）改变 query 时同步筛选；内部改动不会触发（值一致）
watch(
  () => [route.query.jobType, route.query.category, route.query.keyword].join('|'),
  async (incoming) => {
    if (route.name !== 'careers-jobs') return
    const current = [query.jobType, query.category, query.keyword].join('|')
    if (incoming === current) return
    applyRouteQuery()
    page.value = 1
    await load()
  }
)

const onFilterChange = async (next: JobQuery): Promise<void> => {
  Object.assign(query, next)
  page.value = 1
  syncRouteQuery()
  await load()
}

const onReset = async (): Promise<void> => {
  void router.replace({ name: 'careers-jobs' })
  Object.assign(query, createEmptyQuery())
  page.value = 1
  await load()
}

const onPageChange = async (next: number): Promise<void> => {
  page.value = next
  await load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="rc-jobs">
    <div class="rc-container rc-jobs__head">
      <nav class="rc-breadcrumb" aria-label="面包屑">
        <RouterLink :to="{ name: 'careers-home' }" class="rc-breadcrumb__link">首页</RouterLink>
        <span>/</span>
        <span>岗位机会</span>
      </nav>

      <h1 class="rc-jobs__title">岗位机会</h1>
      <p class="rc-jobs__subtitle">共 {{ total }} 个招聘中职位，找到属于你的机会</p>
    </div>

    <div class="rc-container">
      <JobsFilterBar
        :query="query"
        :disabled="loading"
        @change="onFilterChange"
        @reset="onReset"
      />

      <p class="rc-jobs__meta">
        为您找到 <strong>{{ total }}</strong> 个职位
      </p>

      <div v-if="loading" class="rc-jobs__grid">
        <JobCardSkeleton v-for="n in JOB_PAGE_SIZE" :key="n" />
      </div>

      <template v-else-if="jobs.length > 0">
        <div class="rc-jobs__grid">
          <JobCard v-for="job in jobs" :key="job.id" :job="job" />
        </div>

        <JobsPagination
          :current="page"
          :total="total"
          :page-size="JOB_PAGE_SIZE"
          @change="onPageChange"
        />
      </template>

      <RcEmpty v-else title="没有找到匹配的岗位" desc="换个关键词或筛选条件试试吧。">
        <template #action>
          <button type="button" class="rc-btn rc-btn--secondary" @click="onReset">
            {{ isFiltering ? '清除筛选' : '查看全部职位' }}
          </button>
        </template>
      </RcEmpty>
    </div>
  </div>
</template>

<style scoped>
.rc-jobs {
  padding-bottom: var(--rc-space-16);
  background-color: var(--rc-color-bg);
}

.rc-jobs__head {
  padding-top: var(--rc-space-10);
  padding-bottom: var(--rc-space-6);
}

.rc-jobs__title {
  margin: var(--rc-space-5) 0 0;
  font-size: 36px;
  font-weight: var(--rc-font-weight-extrabold);
  color: var(--rc-color-text);
}

.rc-jobs__subtitle {
  margin: var(--rc-space-2) 0 0;
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-jobs__meta {
  margin: var(--rc-space-6) 0 var(--rc-space-5);
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-jobs__meta strong {
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-jobs__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--rc-space-5);
}

@media (max-width: 767px) {
  .rc-jobs__head {
    padding-top: var(--rc-space-6);
  }

  .rc-jobs__title {
    font-size: 28px;
  }

  .rc-jobs__grid {
    grid-template-columns: 1fr;
    gap: var(--rc-space-4);
  }
}
</style>

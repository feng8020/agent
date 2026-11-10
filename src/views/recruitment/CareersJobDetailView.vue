<script setup lang="ts">
/**
 * 岗位详情页 —— UI §3 / §4.3 / §5.4 / §6.6 / §6.8 / §9.5
 *
 * - 完整展示岗位职责 / 任职要求 / 福利待遇。
 * - 右侧「投递卡」sticky；点击「立即投递」打开投递抽屉。
 * - 已下线岗位：顶部提示条 + 投递按钮禁用（§9.5）。
 * - 已投递岗位：按钮置为「已投递」并提示（§7.6 重复投递）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ApplyDrawer from '@/components/recruitment/ApplyDrawer.vue'
import RcEmpty from '@/components/recruitment/RcEmpty.vue'
import { useJobApplications } from '@/composables/useJobApplications'
import { useToast } from '@/composables/useToast'
import { BRAND } from '@/mock/recruitment/brand'
import { getJobById } from '@/mock/recruitment/jobs'

const route = useRoute()
const toast = useToast()
const { hasApplied, refresh } = useJobApplications()

const jobId = computed(() => String(route.params.id ?? ''))
const job = computed(() => getJobById(jobId.value) ?? null)

const loading = ref(true)
const drawerOpen = ref(false)
const applied = ref(false)

const isClosed = computed(() => !!job.value && job.value.status !== '招聘中')

const syncApplied = (): void => {
  applied.value = job.value ? hasApplied(job.value.id) : false
}

/** 保留短暂加载态，避免首屏空白闪烁（UI §10） */
const startLoading = (): void => {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
    syncApplied()
  }, 180)
}

onMounted(startLoading)
watch(jobId, startLoading)

const openDrawer = (): void => {
  if (!job.value || isClosed.value) return
  if (applied.value) {
    toast.info('您已投递过该岗位，请勿重复投递')
    return
  }
  drawerOpen.value = true
}

const closeDrawer = (): void => {
  drawerOpen.value = false
}

const onSubmitted = (): void => {
  drawerOpen.value = false
  refresh()
  syncApplied()
  toast.success('投递成功！我们会在 3–5 个工作日内与你联系。')
}
</script>

<template>
  <div class="rc-detail">
    <div class="rc-container rc-detail__inner">
      <div v-if="loading" class="rc-detail__loading">
        <span class="rc-skeleton rc-detail__skeleton-title" />
        <span class="rc-skeleton rc-detail__skeleton-line" />
        <span class="rc-skeleton rc-detail__skeleton-line is-short" />
        <span class="rc-skeleton rc-detail__skeleton-line" />
      </div>

      <RcEmpty
        v-else-if="!job"
        title="岗位不存在或已删除"
        desc="该岗位可能已被撤下，看看其他机会吧。"
        icon="warning"
      >
        <template #action>
          <RouterLink :to="{ name: 'careers-jobs' }" class="rc-btn rc-btn--primary">
            返回岗位列表
          </RouterLink>
        </template>
      </RcEmpty>

      <template v-else>
        <nav class="rc-breadcrumb" aria-label="面包屑">
          <RouterLink :to="{ name: 'careers-home' }" class="rc-breadcrumb__link">首页</RouterLink>
          <span>/</span>
          <RouterLink :to="{ name: 'careers-jobs' }" class="rc-breadcrumb__link">岗位机会</RouterLink>
          <span>/</span>
          <span>{{ job.title }}</span>
        </nav>

        <div class="rc-detail__grid">
          <div class="rc-detail__main">
            <p v-if="isClosed" class="rc-detail__notice">该岗位已停止招聘，暂不接受投递。</p>

            <h1 class="rc-detail__title">{{ job.title }}</h1>

            <ul class="rc-detail__chips">
              <li>{{ job.category }}</li>
              <li>{{ job.department }}</li>
              <li>{{ job.jobType }}</li>
              <li>{{ job.location }}</li>
              <li v-if="job.headcount">招聘 {{ job.headcount }} 人</li>
            </ul>

            <section class="rc-detail__section">
              <h2 class="rc-detail__section-title">岗位职责</h2>
              <ul class="rc-detail__list">
                <li v-for="(line, index) in job.description" :key="`d-${index}`">{{ line }}</li>
              </ul>
            </section>

            <section class="rc-detail__section">
              <h2 class="rc-detail__section-title">任职要求</h2>
              <ul class="rc-detail__list">
                <li v-for="(line, index) in job.requirements" :key="`r-${index}`">{{ line }}</li>
              </ul>
            </section>

            <section class="rc-detail__section">
              <h2 class="rc-detail__section-title">福利待遇</h2>
              <ul class="rc-detail__benefits">
                <li v-for="item in BRAND.benefits" :key="item.title">{{ item.title }}</li>
              </ul>
            </section>
          </div>

          <aside class="rc-detail__side">
            <div class="rc-detail__card">
              <p class="rc-detail__card-salary">{{ job.salaryRange }}</p>
              <p class="rc-detail__card-meta">{{ job.jobType }} · {{ job.location }}</p>
              <p class="rc-detail__card-meta">所属部门：{{ job.department }}</p>
              <p class="rc-detail__card-meta">发布时间：{{ job.publishedAt }}</p>

              <button
                type="button"
                class="rc-btn rc-btn--primary rc-btn--lg rc-btn--block rc-detail__apply"
                :disabled="isClosed || applied"
                @click="openDrawer"
              >
                {{ isClosed ? '该岗位已停止招聘' : applied ? '已投递' : '立即投递' }}
              </button>
              <p class="rc-detail__card-tip">演示站点：投递为前端模拟</p>
            </div>
          </aside>
        </div>
      </template>
    </div>

    <ApplyDrawer :open="drawerOpen" :job="job" @close="closeDrawer" @submitted="onSubmitted" />
  </div>
</template>

<style scoped>
.rc-detail {
  padding: var(--rc-space-10) 0 var(--rc-space-16);
  background-color: var(--rc-color-surface);
}

/* ---------- 加载骨架 ---------- */
.rc-detail__loading {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-4);
  max-width: 720px;
}

.rc-detail__skeleton-title {
  width: 46%;
  height: 34px;
}

.rc-detail__skeleton-line {
  width: 100%;
  height: 18px;
}

.rc-detail__skeleton-line.is-short {
  width: 62%;
}

/* ---------- 内容 ---------- */
.rc-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--rc-space-12);
  align-items: start;
  margin-top: var(--rc-space-6);
}

.rc-detail__notice {
  margin: 0 0 var(--rc-space-5);
  padding: var(--rc-space-4);
  border-radius: var(--rc-radius-md);
  background-color: var(--rc-color-warning-bg);
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-warning-text);
}

.rc-detail__title {
  margin: 0;
  font-size: 38px;
  font-weight: var(--rc-font-weight-extrabold);
  line-height: 1.2;
  color: var(--rc-color-text);
}

.rc-detail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rc-space-2);
  margin: var(--rc-space-5) 0 0;
}

.rc-detail__chips li {
  padding: 6px var(--rc-space-3);
  border-radius: var(--rc-radius-sm);
  background-color: #eff6ff;
  font-size: 13px;
  color: var(--rc-color-primary-dark);
}

.rc-detail__section {
  margin-top: var(--rc-space-10);
}

.rc-detail__section-title {
  margin: 0 0 var(--rc-space-4);
  font-size: var(--rc-font-size-xl);
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-detail__list {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-3);
}

.rc-detail__list li {
  position: relative;
  padding-left: var(--rc-space-5);
  font-size: var(--rc-font-size-base);
  line-height: var(--rc-line-height-relaxed);
  color: var(--rc-color-text-secondary);
}

.rc-detail__list li::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--rc-color-primary);
}

.rc-detail__benefits {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rc-space-2);
}

.rc-detail__benefits li {
  padding: 6px var(--rc-space-3);
  border-radius: var(--rc-radius-sm);
  background-color: var(--rc-color-bg);
  border: 1px solid var(--rc-color-border);
  font-size: 13px;
  color: var(--rc-color-text-secondary);
}

/* ---------- 投递卡 ---------- */
.rc-detail__side {
  position: sticky;
  top: calc(var(--rc-header-height) + var(--rc-space-6));
}

.rc-detail__card {
  padding: var(--rc-space-6);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
  box-shadow: var(--rc-shadow-sm);
}

.rc-detail__card-salary {
  margin: 0 0 var(--rc-space-4);
  font-size: 26px;
  font-weight: var(--rc-font-weight-extrabold);
  color: var(--rc-color-primary);
}

.rc-detail__card-meta {
  margin: 0 0 var(--rc-space-2);
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-detail__apply {
  margin-top: var(--rc-space-5);
}

.rc-detail__card-tip {
  margin: var(--rc-space-3) 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--rc-color-text-muted);
}

@media (max-width: 1023px) {
  .rc-detail__grid {
    grid-template-columns: 1fr;
    gap: var(--rc-space-8);
  }

  .rc-detail__side {
    position: static;
  }
}

@media (max-width: 767px) {
  .rc-detail {
    padding: var(--rc-space-6) 0 var(--rc-space-12);
  }

  .rc-detail__title {
    font-size: 28px;
  }

  .rc-detail__section {
    margin-top: var(--rc-space-8);
  }
}
</style>

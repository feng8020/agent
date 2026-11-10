<script setup lang="ts">
/**
 * 品牌首屏 Hero —— UI §4.1 / §5.2 / §6.2
 *
 * 左文右卡：左侧品牌标题 + 引导按钮 + 关键数据；右侧「热招岗位预览卡」。
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { BRAND } from '@/mock/recruitment/brand'
import { getFeaturedJobs } from '@/mock/recruitment/jobs'

const router = useRouter()

const sloganLines = computed(() => BRAND.slogan.split('，'))
const heroStats = computed(() => BRAND.highlights.slice(0, 3))
const featuredJob = computed(() => getFeaturedJobs(1)[0] ?? null)

const goJobs = (): void => {
  router.push({ name: 'careers-jobs' })
}

const goCulture = (): void => {
  const el = document.getElementById('culture')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="rc-hero">
    <div class="rc-container rc-hero__inner">
      <div class="rc-hero__content">
        <span class="rc-hero__badge">
          <span class="rc-hero__dot" aria-hidden="true" />
          我们正在招聘
        </span>

        <h1 class="rc-hero__title">
          <span v-for="(line, index) in sloganLines" :key="index" class="rc-hero__title-line">
            {{ line }}
          </span>
        </h1>

        <p class="rc-hero__desc">{{ BRAND.subSlogan }}</p>

        <div class="rc-hero__actions">
          <button type="button" class="rc-btn rc-btn--gradient rc-btn--lg" @click="goJobs">
            查看开放岗位
          </button>
          <button type="button" class="rc-btn rc-btn--outline-light rc-btn--lg" @click="goCulture">
            了解我们
          </button>
        </div>

        <dl class="rc-hero__stats">
          <div v-for="item in heroStats" :key="item.label" class="rc-hero__stat">
            <dt>{{ item.value }}</dt>
            <dd>{{ item.label }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="featuredJob" class="rc-hero__card">
        <div class="rc-hero__card-head">
          <span class="rc-tag rc-tag--hot">热招</span>
          <span class="rc-hero__card-date">发布于 {{ featuredJob.publishedAt }}</span>
        </div>

        <h2 class="rc-hero__card-title">{{ featuredJob.title }}</h2>
        <p class="rc-hero__card-meta">
          {{ featuredJob.department }} · {{ featuredJob.jobType }} · {{ featuredJob.location }}
        </p>

        <ul class="rc-hero__card-list">
          <li v-for="(line, index) in featuredJob.description.slice(0, 3)" :key="index">
            {{ line }}
          </li>
        </ul>

        <p class="rc-hero__card-salary">{{ featuredJob.salaryRange }}</p>

        <RouterLink
          :to="{ name: 'careers-job-detail', params: { id: featuredJob.id } }"
          class="rc-btn rc-btn--primary rc-btn--lg rc-btn--block"
        >
          立即投递
        </RouterLink>
        <p class="rc-hero__card-tip">支持 PDF / DOC / DOCX，文件 ≤ 10MB</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rc-hero {
  position: relative;
  overflow: hidden;
  background-image: linear-gradient(135deg, var(--rc-color-hero-from), var(--rc-color-hero-to));
  color: #ffffff;
}

.rc-hero::before,
.rc-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.rc-hero::before {
  top: -180px;
  right: -100px;
  width: 520px;
  height: 520px;
  background-color: rgba(37, 99, 235, 0.22);
}

.rc-hero::after {
  right: 240px;
  bottom: -160px;
  width: 360px;
  height: 360px;
  background-color: rgba(245, 158, 11, 0.14);
}

.rc-hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  align-items: center;
  gap: var(--rc-space-16);
  padding-top: var(--rc-space-16);
  padding-bottom: var(--rc-space-16);
}

/* ---------- 左侧 ---------- */
.rc-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--rc-space-2);
  height: 38px;
  padding: 0 var(--rc-space-5);
  border: 1px solid rgba(59, 130, 246, 0.7);
  border-radius: var(--rc-radius-pill);
  font-size: var(--rc-font-size-sm);
  color: #93c5fd;
}

.rc-hero__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #22c55e;
}

.rc-hero__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: var(--rc-space-6) 0 0;
  font-size: var(--rc-font-size-hero);
  font-weight: var(--rc-font-weight-extrabold);
  line-height: 1.15;
}

.rc-hero__title-line:nth-child(2) {
  color: #fbbf24;
}

.rc-hero__desc {
  max-width: 540px;
  margin: var(--rc-space-6) 0 0;
  font-size: var(--rc-font-size-lg);
  line-height: var(--rc-line-height-relaxed);
  color: #cbd5e1;
}

.rc-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rc-space-4);
  margin-top: var(--rc-space-8);
}

.rc-hero__stats {
  display: flex;
  gap: var(--rc-space-12);
  margin: var(--rc-space-12) 0 0;
}

.rc-hero__stat dt {
  font-size: 28px;
  font-weight: var(--rc-font-weight-extrabold);
  line-height: 1.2;
}

.rc-hero__stat dd {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

/* ---------- 右侧热招卡片 ---------- */
.rc-hero__card {
  padding: var(--rc-space-6);
  border-radius: var(--rc-radius-xl);
  background-color: var(--rc-color-surface);
  color: var(--rc-color-text);
  box-shadow: var(--rc-shadow-xl);
}

.rc-hero__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-space-3);
}

.rc-hero__card-date {
  font-size: 13px;
  color: var(--rc-color-text-muted);
}

.rc-hero__card-title {
  margin: var(--rc-space-4) 0 0;
  font-size: 26px;
  font-weight: var(--rc-font-weight-bold);
}

.rc-hero__card-meta {
  margin: var(--rc-space-2) 0 0;
  font-size: 15px;
  color: var(--rc-color-text-secondary);
}

.rc-hero__card-list {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-2);
  margin: var(--rc-space-5) 0 0;
  padding-top: var(--rc-space-5);
  border-top: 1px solid var(--rc-color-border);
  font-size: 15px;
  color: #475569;
}

.rc-hero__card-list li {
  position: relative;
  padding-left: var(--rc-space-4);
}

.rc-hero__card-list li::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--rc-color-primary);
}

.rc-hero__card-salary {
  margin: var(--rc-space-5) 0;
  font-size: 22px;
  font-weight: var(--rc-font-weight-extrabold);
  color: var(--rc-color-primary);
}

.rc-hero__card-tip {
  margin: var(--rc-space-3) 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--rc-color-text-muted);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1279px) {
  .rc-hero__inner {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: var(--rc-space-10);
  }

  .rc-hero__title {
    font-size: 46px;
  }

  .rc-hero__stats {
    gap: var(--rc-space-8);
  }
}

@media (max-width: 1023px) {
  .rc-hero__inner {
    grid-template-columns: 1fr;
    gap: var(--rc-space-10);
    padding-top: var(--rc-space-12);
    padding-bottom: var(--rc-space-12);
  }

  .rc-hero__card {
    max-width: 520px;
  }
}

@media (max-width: 767px) {
  .rc-hero__title {
    font-size: 34px;
  }

  .rc-hero__desc {
    font-size: var(--rc-font-size-base);
  }

  .rc-hero__desc,
  .rc-hero__card {
    max-width: 100%;
  }

  .rc-hero__actions .rc-btn {
    flex: 1 1 100%;
  }

  .rc-hero__stats {
    gap: var(--rc-space-6);
    margin-top: var(--rc-space-8);
  }

  .rc-hero__stat dt {
    font-size: 22px;
  }
}
</style>

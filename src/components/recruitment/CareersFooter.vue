<script setup lang="ts">
/**
 * 招聘官网页脚 —— UI §4.1 / §6 / §17
 *
 * 含：品牌区、三列真实可用的导航链接、联系方式、社交入口、底栏、返回顶部。
 * 所有链接均有真实行为，不出现空链接或失效按钮（产品书 §11「通用与工程」）。
 */
import { computed, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { BRAND } from '@/mock/recruitment/brand'
import type { JobType } from '@/types/recruitment'

interface FooterLink {
  label: string
  /** 跳转目标路由 */
  routeName?: 'careers-home' | 'careers-jobs' | 'careers-my-applications'
  /** 首页区块锚点 */
  hash?: string
  /** 岗位列表筛选（按招聘类型） */
  jobType?: JobType
}

const JOB_LINKS: FooterLink[] = [
  { label: '全部职位', routeName: 'careers-jobs' },
  { label: '社会招聘', routeName: 'careers-jobs', jobType: '社招' },
  { label: '校园招聘', routeName: 'careers-jobs', jobType: '校招' },
  { label: '实习机会', routeName: 'careers-jobs', jobType: '实习' }
]

const ABOUT_LINKS: FooterLink[] = [
  { label: '企业文化', hash: '#culture' },
  { label: '福利待遇', hash: '#benefits' },
  { label: '为什么加入我们', hash: '#culture' },
  { label: '联系我们', hash: '#contact' }
]

const HELP_LINKS: FooterLink[] = [
  { label: '招聘流程', hash: '#process' },
  { label: '常见问题', hash: '#faq' },
  { label: '我的投递', routeName: 'careers-my-applications' }
]

const route = useRoute()
const router = useRouter()

const currentYear = computed(() => new Date().getFullYear())

const scrollToSection = (hash: string): void => {
  const el = document.getElementById(hash.replace('#', ''))
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleLink = async (link: FooterLink): Promise<void> => {
  if (link.jobType) {
    await router.push({ name: 'careers-jobs', query: { jobType: link.jobType } })
    return
  }

  if (link.hash) {
    if (route.name === 'careers-home') {
      scrollToSection(link.hash)
    } else {
      await router.push({ name: 'careers-home' })
      await nextTick()
      window.setTimeout(() => {
        if (link.hash) scrollToSection(link.hash)
      }, 80)
    }
    return
  }

  if (link.routeName) {
    await router.push({ name: link.routeName })
  }
}

const backToTop = (): void => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer id="contact" class="rc-footer">
    <div class="rc-container">
      <div class="rc-footer__grid">
        <div class="rc-footer__brand">
          <div class="rc-footer__logo">
            <span class="rc-logo__mark">N</span>
            <span class="rc-footer__logo-text">
              <strong>{{ BRAND.companyName }}</strong>
              <small>{{ BRAND.companyNameEn }} CAREERS</small>
            </span>
          </div>
          <p class="rc-footer__desc">{{ BRAND.intro.split('。')[0] }}。</p>
          <p class="rc-footer__note">本页面为演示站点，信息均为示例数据。</p>
        </div>

        <nav class="rc-footer__col" aria-label="岗位链接">
          <h3 class="rc-footer__title">岗位</h3>
          <button
            v-for="link in JOB_LINKS"
            :key="link.label"
            type="button"
            class="rc-footer__link"
            @click="handleLink(link)"
          >
            {{ link.label }}
          </button>
        </nav>

        <nav class="rc-footer__col" aria-label="关于链接">
          <h3 class="rc-footer__title">关于</h3>
          <button
            v-for="link in ABOUT_LINKS"
            :key="link.label"
            type="button"
            class="rc-footer__link"
            @click="handleLink(link)"
          >
            {{ link.label }}
          </button>
        </nav>

        <nav class="rc-footer__col" aria-label="帮助链接">
          <h3 class="rc-footer__title">帮助</h3>
          <button
            v-for="link in HELP_LINKS"
            :key="link.label"
            type="button"
            class="rc-footer__link"
            @click="handleLink(link)"
          >
            {{ link.label }}
          </button>
        </nav>

        <div class="rc-footer__col">
          <h3 class="rc-footer__title">联系</h3>
          <a class="rc-footer__link" :href="`mailto:${BRAND.contactEmail}`">
            {{ BRAND.contactEmail }}
          </a>
          <a class="rc-footer__link" :href="`tel:${BRAND.contactPhone}`">
            {{ BRAND.contactPhone }}
          </a>
          <span class="rc-footer__link rc-footer__link--plain">{{ BRAND.contactAddress }}</span>
          <span
            v-for="social in BRAND.socialLinks"
            :key="social.label"
            class="rc-footer__link rc-footer__link--plain"
          >
            {{ social.label }}
          </span>
        </div>
      </div>

      <div class="rc-footer__bottom">
        <p class="rc-footer__copyright">
          © {{ currentYear }} {{ BRAND.companyName }} {{ BRAND.companyNameEn }} ·
          本页面为演示用途，数据均为示例
        </p>
        <button type="button" class="rc-footer__top" @click="backToTop">
          <AppIcon name="arrow-right" :size="16" />
          <span>返回顶部</span>
        </button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.rc-footer {
  padding: var(--rc-space-16) 0 var(--rc-space-8);
  background-color: #0f172a;
  color: #cbd5e1;
}

.rc-footer__grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: var(--rc-space-10);
}

.rc-footer__logo {
  display: flex;
  align-items: center;
  gap: var(--rc-space-3);
}

.rc-footer__logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.rc-footer__logo-text strong {
  font-size: 17px;
  color: #ffffff;
}

.rc-footer__logo-text small {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: #64748b;
}

.rc-footer__desc {
  margin: var(--rc-space-5) 0 var(--rc-space-2);
  font-size: var(--rc-font-size-sm);
  line-height: 1.7;
  color: #94a3b8;
}

.rc-footer__note {
  margin: 0;
  font-size: var(--rc-font-size-xs);
  color: #64748b;
}

.rc-footer__col {
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-3);
}

.rc-footer__title {
  margin: 0 0 var(--rc-space-2);
  font-size: 15px;
  font-weight: var(--rc-font-weight-bold);
  color: #ffffff;
}

.rc-footer__link {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--rc-font-size-sm);
  line-height: 1.5;
  text-align: left;
  color: #cbd5e1;
  cursor: pointer;
  transition: color var(--rc-duration-fast) ease;
}

.rc-footer__link:hover {
  color: #ffffff;
}

.rc-footer__link--plain {
  cursor: default;
  color: #94a3b8;
}

.rc-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-space-4);
  margin-top: var(--rc-space-12);
  padding-top: var(--rc-space-6);
  border-top: 1px solid #1e293b;
}

.rc-footer__copyright {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.rc-footer__top {
  display: inline-flex;
  align-items: center;
  gap: var(--rc-space-2);
  padding: var(--rc-space-2) var(--rc-space-4);
  border: 1px solid #1e293b;
  border-radius: var(--rc-radius-pill);
  background-color: transparent;
  font-family: inherit;
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
  transition: border-color var(--rc-duration-fast) ease, color var(--rc-duration-fast) ease;
}

.rc-footer__top:hover {
  border-color: #3b82f6;
  color: #ffffff;
}

.rc-footer__top :deep(svg) {
  transform: rotate(-90deg);
}

@media (max-width: 1023px) {
  .rc-footer__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--rc-space-8);
  }

  .rc-footer__brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 767px) {
  .rc-footer {
    padding: var(--rc-space-12) 0 var(--rc-space-6);
  }

  .rc-footer__grid {
    grid-template-columns: 1fr;
    gap: var(--rc-space-6);
  }

  .rc-footer__bottom {
    flex-direction: column;
    align-items: flex-start;
    margin-top: var(--rc-space-8);
  }
}
</style>

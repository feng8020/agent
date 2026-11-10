<script setup lang="ts">
/**
 * 招聘官网顶部导航 —— UI §4 / §6.1 / §9.4
 *
 * - 吸顶；首页首屏为深色（与 Hero 融合），滚动后变白底 + 阴影（§9.4）。
 * - 首页内导航项为区块锚点（平滑滚动）；其他页面点击后回到首页并定位。
 * - 移动端折叠为汉堡菜单 → 侧边抽屉（§6.1 / §12）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { BRAND } from '@/mock/recruitment/brand'

interface NavItem {
  label: string
  routeName?: 'careers-home' | 'careers-jobs'
  hash?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: '首页', routeName: 'careers-home' },
  { label: '岗位机会', routeName: 'careers-jobs' },
  { label: '企业文化', hash: '#culture' },
  { label: '福利待遇', hash: '#benefits' },
  { label: '招聘流程', hash: '#process' },
  { label: '联系我们', hash: '#contact' }
]

const route = useRoute()
const router = useRouter()

const scrolled = ref(false)
const mobileOpen = ref(false)

const onScroll = (): void => {
  scrolled.value = window.scrollY > 12
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

/** 首页且未滚动时，导航栏使用深色以与 Hero 融合 */
const isHeroMode = computed(() => route.name === 'careers-home' && !scrolled.value)

const isActive = (item: NavItem): boolean => {
  if (!item.routeName) return false
  return route.name === item.routeName
}

const scrollToSection = (hash: string): void => {
  const el = document.getElementById(hash.replace('#', ''))
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleNav = async (item: NavItem): Promise<void> => {
  mobileOpen.value = false

  if (item.hash) {
    if (route.name === 'careers-home') {
      scrollToSection(item.hash)
    } else {
      await router.push({ name: 'careers-home' })
      await nextTick()
      window.setTimeout(() => {
        if (item.hash) scrollToSection(item.hash)
      }, 80)
    }
    return
  }

  if (item.routeName) {
    await router.push({ name: item.routeName })
  }
}
</script>

<template>
  <header class="rc-header" :class="{ 'is-hero-mode': isHeroMode, 'is-scrolled': scrolled }">
    <div class="rc-container rc-header__inner">
      <RouterLink :to="{ name: 'careers-home' }" class="rc-logo" aria-label="返回招聘官网首页">
        <span class="rc-logo__mark">N</span>
        <span class="rc-logo__text">
          <strong>{{ BRAND.companyName }}</strong>
          <small>{{ BRAND.companyNameEn }} CAREERS</small>
        </span>
      </RouterLink>

      <nav class="rc-nav" aria-label="主导航">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.label"
          type="button"
          class="rc-nav__link"
          :class="{ 'is-active': isActive(item) }"
          @click="handleNav(item)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="rc-header__actions">
        <RouterLink
          :to="{ name: 'careers-jobs' }"
          class="rc-btn rc-btn--gradient rc-btn--sm rc-header__cta"
        >
          查看开放岗位
        </RouterLink>
        <button
          type="button"
          class="rc-header__menu"
          aria-label="打开导航菜单"
          @click="mobileOpen = true"
        >
          <AppIcon name="menu" :size="20" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <template v-if="mobileOpen">
        <div class="rc-overlay" @click="mobileOpen = false" />
        <aside class="rc-mobile-nav" role="dialog" aria-modal="true" aria-label="导航菜单">
          <div class="rc-mobile-nav__head">
            <span class="rc-logo__mark">N</span>
            <button
              type="button"
              class="rc-mobile-nav__close"
              aria-label="关闭导航菜单"
              @click="mobileOpen = false"
            >
              <AppIcon name="close" :size="18" />
            </button>
          </div>
          <button
            v-for="item in NAV_ITEMS"
            :key="item.label"
            type="button"
            class="rc-mobile-nav__link"
            :class="{ 'is-active': isActive(item) }"
            @click="handleNav(item)"
          >
            {{ item.label }}
          </button>
          <RouterLink
            :to="{ name: 'careers-jobs' }"
            class="rc-btn rc-btn--gradient rc-btn--block rc-mobile-nav__cta"
            @click="mobileOpen = false"
          >
            查看开放岗位
          </RouterLink>
        </aside>
      </template>
    </Teleport>
  </header>
</template>

<style scoped>
.rc-header {
  position: sticky;
  top: 0;
  z-index: 300;
  height: var(--rc-header-height);
  background-color: var(--rc-color-surface);
  border-bottom: 1px solid var(--rc-color-border);
  transition: background-color var(--rc-duration-base) ease, border-color var(--rc-duration-base) ease,
    box-shadow var(--rc-duration-base) ease;
}

.rc-header.is-scrolled {
  box-shadow: var(--rc-shadow-sm);
}

/* 首页首屏：深色，与 Hero 融合 */
.rc-header.is-hero-mode {
  background-color: var(--rc-color-hero-from);
  border-color: transparent;
}

.rc-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-space-6);
  height: 100%;
}

/* ---------- Logo ---------- */
.rc-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--rc-space-3);
  text-decoration: none;
}

.rc-logo__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: var(--rc-color-primary);
  color: #ffffff;
  font-size: 19px;
  font-weight: var(--rc-font-weight-bold);
  line-height: 1;
}

.rc-logo__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.rc-logo__text strong {
  font-size: 17px;
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-logo__text small {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--rc-color-text-muted);
}

/* ---------- 导航 ---------- */
.rc-nav {
  display: flex;
  align-items: center;
  gap: var(--rc-space-6);
}

.rc-nav__link {
  padding: 4px 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 15px;
  color: #475569;
  cursor: pointer;
  transition: color var(--rc-duration-fast) ease;
}

.rc-nav__link:hover,
.rc-nav__link.is-active {
  color: var(--rc-color-primary);
}

.rc-header__actions {
  display: flex;
  align-items: center;
  gap: var(--rc-space-3);
}

.rc-header__menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-sm);
  background-color: transparent;
  color: var(--rc-color-text);
  cursor: pointer;
}

/* ---------- 深色模式下的文字反色 ---------- */
.rc-header.is-hero-mode .rc-logo__text strong,
.rc-header.is-hero-mode .rc-nav__link {
  color: #ffffff;
}

.rc-header.is-hero-mode .rc-logo__text small {
  color: #93a4be;
}

.rc-header.is-hero-mode .rc-nav__link:hover,
.rc-header.is-hero-mode .rc-nav__link.is-active {
  color: #60a5fa;
}

.rc-header.is-hero-mode .rc-header__menu {
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* ---------- 移动端抽屉 ---------- */
.rc-mobile-nav {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 901;
  display: flex;
  flex-direction: column;
  gap: var(--rc-space-2);
  width: 280px;
  max-width: 84vw;
  padding: var(--rc-space-5);
  background-color: var(--rc-color-surface);
  box-shadow: var(--rc-shadow-xl);
  animation: rc-slide-in-right var(--rc-duration-base) ease;
}

.rc-mobile-nav__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--rc-space-4);
}

.rc-mobile-nav__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-sm);
  background-color: transparent;
  color: var(--rc-color-text-secondary);
  cursor: pointer;
}

.rc-mobile-nav__link {
  padding: var(--rc-space-3) var(--rc-space-2);
  border: none;
  border-radius: var(--rc-radius-sm);
  background: none;
  font-family: inherit;
  font-size: var(--rc-font-size-base);
  text-align: left;
  color: var(--rc-color-text);
  cursor: pointer;
}

.rc-mobile-nav__link:hover,
.rc-mobile-nav__link.is-active {
  background-color: #f1f5f9;
  color: var(--rc-color-primary);
}

.rc-mobile-nav__cta {
  margin-top: var(--rc-space-4);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1023px) {
  .rc-nav {
    display: none;
  }

  .rc-header__menu {
    display: inline-flex;
  }

  .rc-header__cta {
    display: none;
  }
}
</style>

<script setup lang="ts">
/**
 * 雇主品牌（企业文化 + 福利待遇）—— UI §4.1 / §5.2 / §6
 *
 * 办公环境不使用实拍照片，仅使用 CSS 渐变 + 几何装饰 + SVG 图标（UI §13.3）。
 */
import AppIcon from '@/components/common/AppIcon.vue'
import { BRAND } from '@/mock/recruitment/brand'
</script>

<template>
  <section class="rc-section rc-culture">
    <div class="rc-container">
      <p class="rc-section__label">// 雇主品牌</p>
      <h2 class="rc-section__title">为什么加入我们</h2>
      <p class="rc-section__desc">我们相信，优秀的人值得被更好地对待。</p>

      <div class="rc-culture__grid">
        <div
          id="culture"
          class="rc-culture__visual"
          role="img"
          aria-label="办公环境示意（演示用装饰图形，非实拍照片）"
        >
          <span class="rc-culture__visual-icon" aria-hidden="true">
            <AppIcon name="building" :size="28" :stroke-width="1.4" />
          </span>
          <span class="rc-culture__visual-badge">{{ BRAND.companyName }} · 北京总部</span>
          <span class="rc-culture__visual-tip">演示用装饰图形</span>
        </div>

        <div class="rc-culture__text">
          <h3 class="rc-culture__subtitle">我们的文化</h3>
          <p class="rc-culture__paragraph">{{ BRAND.culture }}</p>
          <p class="rc-culture__paragraph">{{ BRAND.intro }}</p>
        </div>
      </div>

      <div id="benefits" class="rc-culture__benefits">
        <h3 class="rc-culture__subtitle">福利待遇</h3>
        <ul class="rc-culture__benefit-grid">
          <li v-for="item in BRAND.benefits" :key="item.title" class="rc-benefit">
            <span class="rc-benefit__icon" aria-hidden="true">
              <AppIcon :name="item.icon" :size="20" />
            </span>
            <span class="rc-benefit__body">
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }}</small>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rc-culture {
  background-color: var(--rc-color-surface);
}

.rc-culture__grid {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: var(--rc-space-12);
  align-items: start;
  margin-top: var(--rc-space-10);
}

/* ---------- 装饰视觉（非实拍图） ---------- */
.rc-culture__visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--rc-space-3);
  min-height: 320px;
  padding: var(--rc-space-8);
  border-radius: var(--rc-radius-xl);
  overflow: hidden;
  background-image: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #ffffff;
  text-align: center;
}

.rc-culture__visual::before,
.rc-culture__visual::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.12);
}

.rc-culture__visual::before {
  top: -70px;
  right: -50px;
  width: 200px;
  height: 200px;
}

.rc-culture__visual::after {
  bottom: -90px;
  left: -50px;
  width: 180px;
  height: 180px;
}

.rc-culture__visual-icon {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.25);
}

.rc-culture__visual-badge {
  position: relative;
  z-index: 1;
  font-size: var(--rc-font-size-base);
  font-weight: var(--rc-font-weight-semibold);
}

.rc-culture__visual-tip {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

/* ---------- 文化文字 ---------- */
.rc-culture__subtitle {
  margin: 0 0 var(--rc-space-5);
  font-size: var(--rc-font-size-xl);
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-culture__paragraph {
  margin: 0 0 var(--rc-space-4);
  font-size: var(--rc-font-size-base);
  line-height: var(--rc-line-height-relaxed);
  color: var(--rc-color-text-secondary);
}

/* ---------- 福利 ---------- */
.rc-culture__benefits {
  margin-top: var(--rc-space-16);
}

.rc-culture__benefit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--rc-space-8) var(--rc-space-6);
}

.rc-benefit {
  display: flex;
  gap: var(--rc-space-4);
}

.rc-benefit__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: var(--rc-radius-md);
  background-color: #eff6ff;
  color: var(--rc-color-primary);
}

.rc-benefit__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rc-benefit__body strong {
  font-size: 17px;
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-benefit__body small {
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

@media (max-width: 1279px) {
  .rc-culture__grid {
    grid-template-columns: 420px minmax(0, 1fr);
    gap: var(--rc-space-8);
  }

  .rc-culture__benefit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .rc-culture__grid {
    grid-template-columns: 1fr;
  }

  .rc-culture__benefits {
    margin-top: var(--rc-space-12);
  }
}

@media (max-width: 767px) {
  .rc-culture__benefit-grid {
    grid-template-columns: 1fr;
    gap: var(--rc-space-6);
  }
}
</style>

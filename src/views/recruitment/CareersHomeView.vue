<script setup lang="ts">
/**
 * 招聘官网首页 —— UI §3 / §4.1
 *
 * 区块：Hero → 数据亮点 → 热招职位 → 雇主品牌（文化/福利）→ 招聘流程 → FAQ
 * 说明：企业文化 / 福利 / 流程 / FAQ 为首页锚点区块（#culture / #benefits / #process / #faq）。
 */
import HeroSection from '@/components/recruitment/home/HeroSection.vue'
import HighlightsBar from '@/components/recruitment/home/HighlightsBar.vue'
import FeaturedJobs from '@/components/recruitment/home/FeaturedJobs.vue'
import CultureSection from '@/components/recruitment/home/CultureSection.vue'
import ProcessSection from '@/components/recruitment/home/ProcessSection.vue'
import FaqSection from '@/components/recruitment/home/FaqSection.vue'
</script>

<template>
  <div class="rc-home">
    <HeroSection />
    <HighlightsBar />
    <FeaturedJobs />
    <CultureSection />
    <ProcessSection />
    <FaqSection />
  </div>
</template>

<style scoped>
.rc-home {
  display: block;
}
</style>

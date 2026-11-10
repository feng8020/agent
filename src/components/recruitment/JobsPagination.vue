<script setup lang="ts">
/**
 * 岗位列表分页 —— UI §6.5
 *
 * 首页禁用「上一页」，末页禁用「下一页」；无数据（总页数 ≤ 1）时不渲染（§6.5 Empty）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{
  current: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{ (e: 'change', page: number): void }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const pages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))

const go = (page: number): void => {
  if (page < 1 || page > totalPages.value || page === props.current) return
  emit('change', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="rc-pagination" aria-label="岗位列表分页">
    <button
      type="button"
      class="rc-pagination__btn"
      :disabled="current <= 1"
      aria-label="上一页"
      @click="go(current - 1)"
    >
      <AppIcon name="back" :size="14" />
    </button>

    <button
      v-for="page in pages"
      :key="page"
      type="button"
      class="rc-pagination__btn"
      :class="{ 'is-active': page === current }"
      :aria-current="page === current ? 'page' : undefined"
      @click="go(page)"
    >
      {{ page }}
    </button>

    <button
      type="button"
      class="rc-pagination__btn"
      :disabled="current >= totalPages"
      aria-label="下一页"
      @click="go(current + 1)"
    >
      <AppIcon name="arrow-right" :size="14" />
    </button>
  </nav>
</template>

<style scoped>
.rc-pagination__btn :deep(svg) {
  margin: 0 auto;
}
</style>

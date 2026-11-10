<script setup lang="ts">
/**
 * 岗位筛选栏 —— UI §6.4 / §9.3
 *
 * - 关键词：回车或点击「搜索职位」触发；输入框内提供清除（×）。
 * - 下拉（类别 / 地点 / 类型）：选择即生效，选项含「全部」。
 * - 提供「重置」，清空全部条件。
 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { JOB_CATEGORIES, JOB_LOCATIONS, JOB_TYPES } from '@/mock/recruitment/jobs'
import type { JobCategory, JobQuery, JobType } from '@/types/recruitment'

const props = defineProps<{
  query: JobQuery
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'change', query: JobQuery): void
  (e: 'reset'): void
}>()

const keyword = ref(props.query.keyword)

watch(
  () => props.query.keyword,
  (value) => {
    keyword.value = value
  }
)

const patch = (next: Partial<JobQuery>): void => {
  emit('change', { ...props.query, ...next })
}

const submitKeyword = (): void => {
  patch({ keyword: keyword.value.trim() })
}

const clearKeyword = (): void => {
  keyword.value = ''
  patch({ keyword: '' })
}

const onCategoryChange = (event: Event): void => {
  patch({ category: (event.target as HTMLSelectElement).value as JobCategory | '' })
}

const onLocationChange = (event: Event): void => {
  patch({ location: (event.target as HTMLSelectElement).value })
}

const onJobTypeChange = (event: Event): void => {
  patch({ jobType: (event.target as HTMLSelectElement).value as JobType | '' })
}

const reset = (): void => {
  keyword.value = ''
  emit('reset')
}
</script>

<template>
  <form class="rc-filter" @submit.prevent="submitKeyword">
    <div class="rc-filter__keyword">
      <AppIcon class="rc-filter__icon" name="search" :size="16" />
      <input
        v-model="keyword"
        class="rc-input rc-filter__input"
        type="text"
        placeholder="搜索职位、关键词"
        aria-label="搜索职位"
        :disabled="disabled"
      />
      <button
        v-if="keyword"
        type="button"
        class="rc-filter__clear"
        aria-label="清除关键词"
        @click="clearKeyword"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </div>

    <select
      class="rc-select rc-filter__select"
      :value="query.category"
      aria-label="岗位类别"
      :disabled="disabled"
      @change="onCategoryChange"
    >
      <option value="">全部类别</option>
      <option v-for="item in JOB_CATEGORIES" :key="item" :value="item">{{ item }}</option>
    </select>

    <select
      class="rc-select rc-filter__select"
      :value="query.location"
      aria-label="工作地点"
      :disabled="disabled"
      @change="onLocationChange"
    >
      <option value="">全部地点</option>
      <option v-for="item in JOB_LOCATIONS" :key="item" :value="item">{{ item }}</option>
    </select>

    <select
      class="rc-select rc-filter__select"
      :value="query.jobType"
      aria-label="招聘类型"
      :disabled="disabled"
      @change="onJobTypeChange"
    >
      <option value="">全部类型</option>
      <option v-for="item in JOB_TYPES" :key="item" :value="item">{{ item }}</option>
    </select>

    <button type="submit" class="rc-btn rc-btn--primary rc-filter__submit" :disabled="disabled">
      搜索职位
    </button>
    <button
      type="button"
      class="rc-btn rc-btn--ghost rc-filter__reset"
      :disabled="disabled"
      @click="reset"
    >
      重置
    </button>
  </form>
</template>

<style scoped>
.rc-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rc-space-4);
  padding: var(--rc-space-5);
  border: 1px solid var(--rc-color-border);
  border-radius: var(--rc-radius-lg);
  background-color: var(--rc-color-surface);
}

.rc-filter__keyword {
  position: relative;
  flex: 1 1 300px;
  min-width: 200px;
}

.rc-filter__icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--rc-color-text-muted);
  pointer-events: none;
}

.rc-filter__input {
  padding-left: 42px;
  padding-right: 40px;
}

.rc-filter__clear {
  position: absolute;
  top: 50%;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transform: translateY(-50%);
  border: none;
  border-radius: 50%;
  background-color: #f1f5f9;
  color: var(--rc-color-text-secondary);
  cursor: pointer;
}

.rc-filter__clear:hover {
  background-color: #e2e8f0;
  color: var(--rc-color-text);
}

.rc-filter__select {
  flex: 0 1 170px;
  min-width: 140px;
}

.rc-filter__submit {
  flex: 0 0 auto;
}

.rc-filter__reset {
  flex: 0 0 auto;
}

@media (max-width: 767px) {
  .rc-filter {
    padding: var(--rc-space-4);
    gap: var(--rc-space-3);
  }

  .rc-filter__keyword,
  .rc-filter__select,
  .rc-filter__submit,
  .rc-filter__reset {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>

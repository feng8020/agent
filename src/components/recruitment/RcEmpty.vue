<script setup lang="ts">
/**
 * 空状态 —— UI §6.10
 *
 * 用于列表无结果等场景；通过默认插槽提供操作按钮（如「清除筛选」）。
 * 禁止出现纯空白区域。
 */
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'

withDefaults(
  defineProps<{
    title: string
    desc?: string
    icon?: IconName
  }>(),
  { desc: '', icon: 'search' }
)
</script>

<template>
  <div class="rc-empty">
    <div class="rc-empty__visual">
      <AppIcon :name="icon" :size="40" :stroke-width="1.2" />
    </div>
    <p class="rc-empty__title">{{ title }}</p>
    <p v-if="desc" class="rc-empty__desc">{{ desc }}</p>
    <slot name="action" />
  </div>
</template>

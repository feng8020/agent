<script setup lang="ts">
import AppSegmented from '@/components/common/AppSegmented.vue'
import type { SegmentedOption } from '@/components/common/types'
import type { ThemeMode } from '@/types'

defineProps<{ modelValue: ThemeMode }>()

const emit = defineEmits<{ (e: 'update:modelValue', value: ThemeMode): void }>()

const options: SegmentedOption[] = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const onChange = (value: string): void => {
  emit('update:modelValue', value as ThemeMode)
}
</script>

<template>
  <!-- 主题切换（UI §6.13）：点击立即生效，无保存按钮 -->
  <AppSegmented
    :model-value="modelValue"
    :options="options"
    :block="true"
    @update:model-value="onChange"
  />
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    /** 自动高度上限，超出后内部滚动（UI §6.6：最大 200px） */
    maxHeight?: number
    rows?: number
  }>(),
  {
    placeholder: '',
    disabled: false,
    maxHeight: 200,
    rows: 1
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'enter'): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

/** 自适应高度 */
const resize = (): void => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const next = Math.min(el.scrollHeight, props.maxHeight)
  el.style.height = `${next}px`
  el.style.overflowY = el.scrollHeight > props.maxHeight ? 'auto' : 'hidden'
}

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  resize()
}

const handleKeydown = (event: KeyboardEvent): void => {
  // Enter 发送，Shift + Enter 换行（UI §6.6）
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    emit('enter')
  }
}

const focus = (): void => {
  textareaRef.value?.focus()
}

const blur = (): void => {
  textareaRef.value?.blur()
}

defineExpose({ focus, blur, resize })

watch(
  () => props.modelValue,
  () => {
    nextTick(resize)
  }
)

onMounted(resize)
</script>

<template>
  <textarea
    ref="textareaRef"
    class="app-textarea"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    @input="handleInput"
    @keydown="handleKeydown"
    @focus="emit('focus')"
    @blur="emit('blur')"
  />
</template>

<style scoped>
.app-textarea {
  display: block;
  width: 100%;
  min-height: 24px;
  padding: 0;
  font-family: inherit;
  font-size: var(--font-size-body);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  resize: none;
}

.app-textarea:focus {
  outline: none;
}

.app-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.app-textarea:disabled {
  cursor: not-allowed;
  color: var(--color-disabled-text);
}
</style>

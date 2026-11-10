<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    type?: 'text' | 'email' | 'password'
    placeholder?: string
    required?: boolean
    error?: string
    disabled?: boolean
    readonly?: boolean
    autofocus?: boolean
    autocomplete?: string
    maxlength?: number
  }>(),
  {
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    error: '',
    disabled: false,
    readonly: false,
    autofocus: false,
    autocomplete: 'off',
    maxlength: undefined
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
  (e: 'focus'): void
  (e: 'enter'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const revealed = ref(false)
const isPassword = computed(() => props.type === 'password')
const nativeType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type))

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') emit('enter')
}

// 自动聚焦：弹窗内输入框挂载后立即获得焦点（UI §7.1）
onMounted(() => {
  if (props.autofocus) inputRef.value?.focus()
})
</script>

<template>
  <label class="app-field" :class="{ 'has-error': !!error, 'is-disabled': disabled }">
    <span v-if="label" class="app-field__label">
      {{ label }}<span v-if="required" class="app-field__required">*</span>
    </span>

    <span class="app-field__control">
      <input
        ref="inputRef"
        class="app-field__input"
        :type="nativeType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :aria-invalid="!!error"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="emit('blur')"
        @focus="emit('focus')"
      />

      <button
        v-if="isPassword"
        type="button"
        class="app-field__toggle"
        :aria-label="revealed ? '隐藏密码' : '显示密码'"
        tabindex="-1"
        @click.prevent="revealed = !revealed"
      >
        <AppIcon :name="revealed ? 'eye-off' : 'eye'" :size="16" />
      </button>
    </span>

    <span v-if="error" class="app-field__error" role="alert">{{ error }}</span>
  </label>
</template>

<style scoped>
.app-field {
  display: flex;
  flex-direction: column;
  cursor: text;
}

.app-field.is-disabled {
  cursor: not-allowed;
}

.app-field__label {
  margin-bottom: 10px;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.app-field__required {
  margin-left: 2px;
  color: var(--color-error);
}

.app-field__control {
  position: relative;
  display: flex;
  align-items: center;
}

.app-field__input {
  width: 100%;
  height: var(--size-input-height);
  padding: 0 18px;
  font-size: var(--font-size-form);
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--duration-fast) var(--easing-standard),
    box-shadow var(--duration-fast) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard);
}

.app-field__input::placeholder {
  color: var(--color-text-tertiary);
}

.app-field__input:hover:not(:disabled):not(:focus) {
  border-color: var(--color-border-strong);
}

.app-field__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.app-field__input:disabled {
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  cursor: not-allowed;
}

.has-error .app-field__input {
  border-color: var(--color-error);
}

.app-field__toggle {
  position: absolute;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.app-field__toggle:hover {
  color: var(--color-text-secondary);
}

.app-field__error {
  margin-top: 6px;
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  color: var(--color-error);
}
</style>

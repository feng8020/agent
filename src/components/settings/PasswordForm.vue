<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    /** 服务端返回的字段级错误（如「旧密码错误」，UI §9.6） */
    serverError?: { field?: string; message: string } | null
  }>(),
  { loading: false, serverError: null }
)

const emit = defineEmits<{
  (e: 'submit', payload: { oldPassword: string; newPassword: string; confirmPassword: string }): void
}>()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const oldError = ref('')
const newError = ref('')
const confirmError = ref('')

// TODO(待确认)：产品书 §12 第 1 条 —— 密码强度规则，当前仅校验必填
const validate = (): boolean => {
  oldError.value = ''
  newError.value = ''
  confirmError.value = ''

  if (!oldPassword.value) oldError.value = '请输入当前密码'
  if (!newPassword.value) newError.value = '请输入新密码'
  if (!confirmPassword.value) confirmError.value = '请再次输入新密码'
  else if (newPassword.value && confirmPassword.value !== newPassword.value) {
    confirmError.value = '两次密码不一致'
  }

  return !oldError.value && !newError.value && !confirmError.value
}

const submit = (): void => {
  if (!validate()) return
  emit('submit', {
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value
  })
}

/** 保存成功后由父组件调用 */
const reset = (): void => {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  oldError.value = ''
  newError.value = ''
  confirmError.value = ''
}

defineExpose({ reset })

// 服务端字段错误映射（旧密码错误）
void props
</script>

<template>
  <div class="password-form">
    <AppInput
      v-model="oldPassword"
      label="旧密码"
      type="password"
      placeholder="请输入当前密码"
      :error="oldError || (serverError?.field === 'oldPassword' ? serverError.message : '')"
      :disabled="loading"
    />

    <AppInput
      v-model="newPassword"
      label="新密码"
      type="password"
      placeholder="请输入新密码"
      :error="newError"
      :disabled="loading"
    />

    <AppInput
      v-model="confirmPassword"
      label="确认新密码"
      type="password"
      placeholder="请再次输入新密码"
      :error="confirmError"
      :disabled="loading"
      @enter="submit"
    />

    <div class="password-form__footer">
      <AppButton
        size="md"
        :loading="loading"
        :loading-text="'保存中…'"
        :disabled="loading"
        @click="submit"
      >
        保存修改
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.password-form {
  display: flex;
  flex-direction: column;
}

.password-form :deep(.app-field + .app-field) {
  margin-top: var(--space-6);
}

.password-form__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-6);
}
</style>

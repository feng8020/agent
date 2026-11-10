<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import type { User } from '@/types'

const props = withDefaults(
  defineProps<{
    user: User | null
    loading?: boolean
  }>(),
  { loading: false }
)

const emit = defineEmits<{
  (e: 'submit', payload: { nickname: string }): void
}>()

const nickname = ref(props.user?.nickname ?? '')
const error = ref('')

watch(
  () => props.user?.nickname,
  (value) => {
    nickname.value = value ?? ''
  }
)

/** 无变更时保存按钮禁用（UI §7.3） */
const dirty = computed(() => nickname.value.trim() !== (props.user?.nickname ?? ''))

// TODO(待确认)：产品书 §12 第 5 条 / UI §20 第 14 条 —— 昵称长度上限（当前按 ≤ 20 字符）
const MAX_NICKNAME = 20

const submit = (): void => {
  const value = nickname.value.trim()
  if (value.length > MAX_NICKNAME) {
    error.value = `昵称长度不能超过 ${MAX_NICKNAME} 个字符`
    return
  }
  error.value = ''
  emit('submit', { nickname: value })
}
</script>

<template>
  <div class="profile-form">
    <AppInput
      label="用户名"
      :model-value="user?.username ?? ''"
      readonly
      disabled
      placeholder="—"
    />
    <p class="profile-form__hint">用户名不可修改</p>

    <AppInput
      label="邮箱"
      :model-value="user?.email ?? ''"
      readonly
      disabled
      placeholder="—"
    />
    <p class="profile-form__hint">邮箱不可修改</p>

    <AppInput
      v-model="nickname"
      label="昵称"
      placeholder="请输入昵称"
      :maxlength="MAX_NICKNAME"
      :error="error"
      :disabled="loading"
      @enter="dirty && submit()"
    />

    <div class="profile-form__footer">
      <AppButton
        size="md"
        :loading="loading"
        :loading-text="'保存中…'"
        :disabled="!dirty"
        @click="submit"
      >
        保存修改
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.profile-form {
  display: flex;
  flex-direction: column;
}

.profile-form__hint {
  margin-top: 6px;
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
}

.profile-form :deep(.app-field + .app-field) {
  margin-top: var(--space-6);
}

.profile-form__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-6);
}
</style>

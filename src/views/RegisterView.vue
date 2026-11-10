<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { getErrorMessage, isApiError } from '@/api/request'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// TODO(待确认)：产品书 §12 第 1 条 —— 密码强度规则未定义，UI 默认方案为仅校验必填
const USERNAME_MIN = 2
const USERNAME_MAX = 20

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmError = ref('')
const formError = ref('')

const submitting = ref(false)

const clearErrors = (): void => {
  usernameError.value = ''
  emailError.value = ''
  passwordError.value = ''
  confirmError.value = ''
  formError.value = ''
}

/** 前端校验（产品书 §7.1、§10） */
const validate = (): boolean => {
  clearErrors()

  const name = username.value.trim()
  if (!name) {
    usernameError.value = '请输入用户名'
  } else if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    usernameError.value = `用户名长度需为 ${USERNAME_MIN}-${USERNAME_MAX} 个字符`
  }

  const mail = email.value.trim()
  if (!mail) {
    emailError.value = '请输入邮箱'
  } else if (!EMAIL_PATTERN.test(mail)) {
    emailError.value = '邮箱格式不正确'
  }

  if (!password.value) passwordError.value = '请输入密码'

  if (!confirmPassword.value) {
    confirmError.value = '请再次输入密码'
  } else if (password.value && confirmPassword.value !== password.value) {
    confirmError.value = '两次密码不一致'
  }

  return !usernameError.value && !emailError.value && !passwordError.value && !confirmError.value
}

const submit = async (): Promise<void> => {
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true

  try {
    await auth.register({
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      confirmPassword: confirmPassword.value
    })

    toast.success('注册成功，请登录')
    await router.replace('/login')
  } catch (error) {
    // 字段级错误就近展示（UI §9.2）
    const field = isApiError(error) ? error.field : undefined
    const message = getErrorMessage(error)

    if (field === 'username') usernameError.value = message
    else if (field === 'email') emailError.value = message
    else if (field === 'password') passwordError.value = message
    else formError.value = message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="auth-title">创建账号</h1>
    <p class="auth-subtitle">注册后可用邮箱或用户名登录同一账号</p>

    <form class="auth-form" novalidate @submit.prevent="submit">
      <AppInput
        v-model="username"
        label="用户名"
        placeholder="2-20 个字符"
        required
        :maxlength="USERNAME_MAX"
        :error="usernameError"
        :disabled="submitting"
        :autofocus="true"
        autocomplete="username"
      />

      <AppInput
        v-model="email"
        label="邮箱"
        type="email"
        placeholder="you@example.com"
        required
        :error="emailError"
        :disabled="submitting"
        autocomplete="email"
      />

      <AppInput
        v-model="password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        required
        :error="passwordError"
        :disabled="submitting"
        autocomplete="new-password"
      />

      <AppInput
        v-model="confirmPassword"
        label="确认密码"
        type="password"
        placeholder="请再次输入密码"
        required
        :error="confirmError"
        :disabled="submitting"
        autocomplete="new-password"
      />

      <p v-if="formError" class="auth-error" role="alert">{{ formError }}</p>

      <AppButton type="submit" size="lg" block :loading="submitting" loading-text="注册中…">
        注册
      </AppButton>
    </form>

    <p class="auth-footer">
      已有账号？
      <RouterLink class="auth-link" to="/login">返回登录</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.auth-title {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.auth-subtitle {
  margin-top: 6px;
  font-size: var(--font-size-form);
  color: var(--color-text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.auth-error {
  padding: 10px 14px;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-md);
}

.auth-footer {
  margin-top: var(--space-6);
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
  text-align: center;
}

.auth-link {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.auth-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>

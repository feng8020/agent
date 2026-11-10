<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { getErrorMessage } from '@/api/request'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const submitting = ref(false)
const formError = ref('')

/**
 * 登录态失效提示（由 401 统一处理跳转时带上 expired=1）
 *
 * 表单错误优先展示：用户提交失败时应看到具体原因，
 * 而不是同时看到"登录已失效"的旧提示。
 */
const expiredNotice = computed(() => route.query.expired === '1' && !formError.value)

/** 前端校验（UI §7.1）：用户名与密码均必填 */
const validate = (): string => {
  if (!username.value.trim()) return '请输入用户名'
  if (!password.value) return '请输入密码'
  return ''
}

const submit = async (): Promise<void> => {
  if (submitting.value) return

  const message = validate()
  if (message) {
    formError.value = message
    return
  }

  formError.value = ''
  submitting.value = true

  try {
    // 登录成功后由 store 保存服务端返回的 token（后续请求自动携带 Authorization）
    await auth.login({
      username: username.value.trim(),
      password: password.value
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat'
    await router.replace(redirect)
  } catch (error) {
    // 失败保留用户输入，展示表单级错误（UI §9.1）
    formError.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h1 class="auth-title">欢迎回来</h1>
    <p class="auth-subtitle">登录后即可与 AI 开始对话</p>

    <p v-if="expiredNotice" class="auth-notice" role="status">登录已失效，请重新登录</p>

    <form class="auth-form" novalidate @submit.prevent="submit">
      <AppInput
        v-model="username"
        label="用户名"
        placeholder="请输入用户名"
        :disabled="submitting"
        :autofocus="true"
        autocomplete="username"
      />

      <AppInput
        v-model="password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        :disabled="submitting"
        autocomplete="current-password"
      />

      <p v-if="formError" class="auth-error" role="alert">{{ formError }}</p>

      <AppButton type="submit" size="lg" block :loading="submitting" loading-text="登录中…">
        登录
      </AppButton>
    </form>

    <!-- <p class="auth-footer">
      还没有账号？
      <RouterLink class="auth-link" to="/register">立即注册</RouterLink>
    </p> -->
  </AuthLayout>
</template>

<style scoped>
.auth-title {
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.auth-subtitle {
  margin-top: 6px;
  font-size: var(--font-size-form);
  color: var(--color-text-secondary);
}

.auth-notice {
  margin-top: var(--space-4);
  padding: 10px 14px;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-md);
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

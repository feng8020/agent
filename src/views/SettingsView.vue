<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTabs from '@/components/common/AppTabs.vue'
import PasswordForm from '@/components/settings/PasswordForm.vue'
import ProfileForm from '@/components/settings/ProfileForm.vue'
import ThemeSwitch from '@/components/settings/ThemeSwitch.vue'
import SettingsLayout from '@/layouts/SettingsLayout.vue'
import type { TabItem } from '@/components/common/types'
import { getErrorMessage, isApiError } from '@/api/request'
import { changePassword, updateProfile, updateTheme } from '@/api/user'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()
const theme = useThemeStore()
const toast = useToast()

const tabs: TabItem[] = [
  { label: '个人资料', value: 'profile' },
  { label: '修改密码', value: 'password' },
  { label: '外观', value: 'appearance' }
]

const activeTab = ref('profile')

const profileLoading = ref(false)
const passwordLoading = ref(false)
const passwordServerError = ref<{ field?: string; message: string } | null>(null)
const passwordFormRef = ref<InstanceType<typeof PasswordForm> | null>(null)

const logoutOpen = ref(false)
const logoutLoading = ref(false)

/* ---------------- 个人资料（UI §7.3 Tab1） ---------------- */

const handleProfileSubmit = async (payload: { nickname: string }): Promise<void> => {
  profileLoading.value = true
  try {
    const user = await updateProfile({ nickname: payload.nickname })
    auth.patchUser({ nickname: user.nickname })
    toast.success('保存成功')
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    profileLoading.value = false
  }
}

/* ---------------- 修改密码（UI §7.3 Tab2） ---------------- */

const handlePasswordSubmit = async (payload: {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<void> => {
  passwordLoading.value = true
  passwordServerError.value = null

  try {
    await changePassword(payload)
    passwordFormRef.value?.reset()
    toast.success('密码修改成功')
  } catch (error) {
    // 旧密码错误等字段级错误就近展示（UI §9.6）
    if (isApiError(error) && error.field) {
      passwordServerError.value = { field: error.field, message: error.message }
    }
    toast.error(getErrorMessage(error))
  } finally {
    passwordLoading.value = false
  }
}

/* ---------------- 主题（UI §6.13） ---------------- */

const handleThemeChange = async (mode: ThemeMode): Promise<void> => {
  if (mode === theme.mode) return

  theme.setMode(mode)
  toast.success('主题已切换')

  if (auth.isAuthenticated) {
    try {
      await updateTheme(mode)
    } catch {
      // 本地已生效，同步失败不阻塞用户
    }
  }
}

const themeValue = computed<ThemeMode>({
  get: () => theme.mode,
  set: (value) => {
    void handleThemeChange(value)
  }
})

/* ---------------- 退出登录 ---------------- */

const confirmLogout = async (): Promise<void> => {
  logoutLoading.value = true
  try {
    await auth.signOut()
    chat.reset()
    logoutOpen.value = false
    toast.success('已退出登录')
    await router.replace({ name: 'login' })
  } catch {
    toast.error('退出登录失败，请重试')
  } finally {
    logoutLoading.value = false
  }
}

const goChat = (): void => {
  void router.push({ name: 'chat' })
}
</script>

<template>
  <SettingsLayout :user-name="auth.displayName" @back="goChat">
    <AppTabs v-model="activeTab" :tabs="tabs" />

    <div class="settings-body">
      <!-- Tab 1：个人资料 -->
      <section v-if="activeTab === 'profile'" class="settings-card">
        <header class="settings-card__header">
          <h2 class="settings-card__title">个人资料</h2>
          <p class="settings-card__desc">更新你的账号信息</p>
        </header>
        <div class="settings-card__body">
          <ProfileForm
            :user="auth.user"
            :loading="profileLoading"
            @submit="handleProfileSubmit"
          />
        </div>
      </section>

      <!-- Tab 2：修改密码 -->
      <section v-else-if="activeTab === 'password'" class="settings-card">
        <header class="settings-card__header">
          <h2 class="settings-card__title">修改密码</h2>
          <p class="settings-card__desc">修改后请使用新密码登录</p>
        </header>
        <div class="settings-card__body">
          <PasswordForm
            ref="passwordFormRef"
            :loading="passwordLoading"
            :server-error="passwordServerError"
            @submit="handlePasswordSubmit"
          />
        </div>
      </section>

      <!-- Tab 3：外观 -->
      <section v-else class="settings-card">
        <header class="settings-card__header">
          <h2 class="settings-card__title">外观</h2>
          <p class="settings-card__desc">切换后全站立即生效</p>
        </header>
        <div class="settings-card__body">
          <ThemeSwitch v-model="themeValue" />
        </div>
      </section>

      <!-- 退出登录（常驻，不随 Tab 隐藏） -->
      <section class="settings-card settings-card--row">
        <div class="settings-card__header">
          <h2 class="settings-card__title">退出登录</h2>
          <p class="settings-card__desc">退出后需重新登录才能继续使用</p>
        </div>
        <AppButton variant="danger" @click="logoutOpen = true">退出登录</AppButton>
      </section>
    </div>

    <!-- 退出登录确认（UI §6.10） -->
    <AppModal
      :open="logoutOpen"
      title="确认退出登录？"
      description="退出后需重新登录才能继续使用"
      confirm-text="退出登录"
      variant="danger"
      :loading="logoutLoading"
      @cancel="logoutOpen = false"
      @confirm="confirmLogout"
    />
  </SettingsLayout>
</template>

<style scoped>
.settings-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-top: var(--space-8);
}

/* 设置卡片（UI §5.3）：圆角 14 / 内边距 28 / 1px 边框 */
.settings-card {
  padding: 28px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
}

.settings-card--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.settings-card__title {
  font-size: var(--font-size-section);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.settings-card__desc {
  margin-top: 6px;
  font-size: var(--font-size-caption);
  color: var(--color-text-secondary);
}

.settings-card__body {
  margin-top: var(--space-6);
}

@media (max-width: 767px) {
  .settings-card {
    padding: var(--space-4);
  }

  .settings-card--row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
